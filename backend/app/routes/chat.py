"""Chat routes for TutorAgent interaction with conversation history, workspace topics, and linked materials."""
import uuid
from flask import Blueprint, request, jsonify, Response, stream_with_context, g
from app.services.agent_orchestrator import agent_orchestrator
from app.services.auth_service import auth_service
from app.database import db
from app.models.conversation import Conversation, Message
from app.routes.auth import require_auth

chat_bp = Blueprint('chat', __name__)


def get_current_user():
    """Get the current user from the authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    return auth_service.get_user_by_session(token)


@chat_bp.route('/conversations', methods=['GET'])
@require_auth
def get_conversations():
    """Get all active conversations for the current user."""
    user = g.current_user
    conversations = Conversation.query.filter_by(
        user_id=user.id,
        is_active=True
    ).order_by(Conversation.updated_at.desc()).all()
    
    return jsonify({
        'conversations': [conv.to_dict() for conv in conversations]
    }), 200


@chat_bp.route('/conversations', methods=['POST'])
@require_auth
def create_conversation():
    """Create a new conversation with optional topic and study mode."""
    user = g.current_user
    data = request.get_json() or {}
    
    topic = data.get('topic')
    study_mode = data.get('studyMode', 'socratic')
    title = data.get('title')
    content_ids = data.get('contentIds', [])
    
    if not title:
        title = f"{topic} Study Workspace" if topic else "New Learning Session"
        
    conversation = Conversation(
        user_id=user.id,
        title=title,
        topic=topic,
        study_mode=study_mode
    )
    if content_ids:
        conversation.content_ids = content_ids
        
    db.session.add(conversation)
    db.session.commit()
    
    return jsonify(conversation.to_dict()), 201


@chat_bp.route('/conversations/<int:conversation_id>', methods=['GET'])
@require_auth
def get_conversation(conversation_id):
    """Get a specific conversation with all messages and linked materials."""
    user = g.current_user
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user.id
    ).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    return jsonify(conversation.to_dict(include_messages=True)), 200


@chat_bp.route('/conversations/<int:conversation_id>', methods=['PUT'])
@require_auth
def update_conversation(conversation_id):
    """Update conversation metadata (rename title, change topic, or update study mode)."""
    user = g.current_user
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user.id
    ).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
        
    data = request.get_json() or {}
    if 'title' in data and data['title'].strip():
        conversation.title = data['title'].strip()
    if 'topic' in data:
        conversation.topic = data['topic'].strip() if data['topic'] else None
    if 'studyMode' in data:
        conversation.study_mode = data['studyMode']
    if 'contentIds' in data and isinstance(data['contentIds'], list):
        conversation.content_ids = data['contentIds']
        
    db.session.commit()
    return jsonify(conversation.to_dict()), 200


@chat_bp.route('/conversations/<int:conversation_id>/link-content', methods=['POST'])
@require_auth
def link_content_to_conversation(conversation_id):
    """Link uploaded documents to a conversation so they persist across reloads."""
    user = g.current_user
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user.id
    ).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
        
    data = request.get_json() or {}
    content_ids = data.get('contentIds', [])
    content_id = data.get('contentId')
    
    if content_id and content_id not in conversation.content_ids:
        conversation.add_content_id(content_id)
        
    for cid in content_ids:
        if cid:
            conversation.add_content_id(cid)
            
    db.session.commit()
    return jsonify(conversation.to_dict()), 200


@chat_bp.route('/conversations/<int:conversation_id>', methods=['DELETE'])
@require_auth
def delete_conversation(conversation_id):
    """Soft delete a conversation."""
    user = g.current_user
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user.id
    ).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    conversation.is_active = False
    db.session.commit()
    return jsonify({'message': 'Conversation deleted'}), 200


@chat_bp.route('/message', methods=['POST'])
def send_message():
    """Process a chat message through Socratic TutorAgent with document grounding."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    message = data.get('message')
    conversation_id = data.get('conversationId')
    content_context = data.get('contentContext', [])
    stream = data.get('stream', False)
    
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({'error': 'Message cannot be empty'}), 400
    
    message = message.strip()
    message_id = str(uuid.uuid4())
    
    user = get_current_user()
    conv_id = None
    conversation_history = []
    
    if user:
        conversation = None
        if conversation_id:
            conversation = Conversation.query.filter_by(
                id=conversation_id,
                user_id=user.id
            ).first()
        
        if not conversation:
            auto_title = message[:40] + ('...' if len(message) > 40 else '')
            conversation = Conversation(
                user_id=user.id,
                title=auto_title
            )
            db.session.add(conversation)
            db.session.commit()
        
        conv_id = conversation.id
        conversation_history = conversation.get_context_messages(limit=20)
        
        # Auto-inject grounded document context if not sent in request payload
        if not content_context and conversation.content_ids:
            try:
                from app.services.content_service import content_service
                content_context = content_service.get_batch_context(conversation.content_ids, user.id)
            except Exception:
                pass
        
        user_msg = Message(
            conversation_id=conv_id,
            role='user',
            content=message,
            message_id=message_id
        )
        db.session.add(user_msg)
        db.session.commit()
    
    if stream:
        return _stream_response(message, content_context, message_id, conv_id, conversation_history)
    else:
        return _non_stream_response(message, content_context, message_id, conv_id, conversation_history)


def _non_stream_response(message: str, content_context: list, message_id: str,
                        conv_id: int, conversation_history: list):
    try:
        response = agent_orchestrator.process_chat(
            message, 
            content_context, 
            stream=False,
            conversation_history=conversation_history
        )
        
        if not response or response == "TutorAgent is not available.":
            return jsonify({'error': 'AI service temporarily unavailable'}), 503
        
        if conv_id:
            assistant_msg = Message(
                conversation_id=conv_id,
                role='assistant',
                content=response,
                message_id=str(uuid.uuid4())
            )
            db.session.add(assistant_msg)
            
            conversation = Conversation.query.get(conv_id)
            if conversation:
                conversation.updated_at = db.func.now()
            db.session.commit()
        
        return jsonify({
            'response': response,
            'messageId': message_id,
            'conversationId': conv_id
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to process message: {str(e)}'}), 500


def _stream_response(message: str, content_context: list, message_id: str,
                    conv_id: int, conversation_history: list):
    def generate():
        full_response = ""
        try:
            stream_gen = agent_orchestrator.process_chat(
                message, 
                content_context, 
                stream=True,
                conversation_history=conversation_history
            )
            
            for chunk in stream_gen:
                if chunk:
                    full_response += chunk
                    import json
                    yield f"data: {json.dumps({'chunk': chunk, 'messageId': message_id})}\n\n"
            
            if conv_id and full_response:
                assistant_msg = Message(
                    conversation_id=conv_id,
                    role='assistant',
                    content=full_response,
                    message_id=str(uuid.uuid4())
                )
                db.session.add(assistant_msg)
                
                conversation = Conversation.query.get(conv_id)
                if conversation:
                    conversation.updated_at = db.func.now()
                db.session.commit()
                
            import json
            yield f"data: {json.dumps({'done': True, 'conversationId': conv_id})}\n\n"
        except Exception as e:
            import json
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )
