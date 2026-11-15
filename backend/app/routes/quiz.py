"""Quiz routes for quiz generation, submission, retake, review, and archiving."""
from flask import Blueprint, request, jsonify, g
from app.services.quiz_service import quiz_service
from app.services.progress_service import progress_service
from app.models.quiz_data import QuizData
from app.models.conversation import Conversation
from app.decorators import require_registered as require_auth
from app.errors import db_error_handler

quiz_bp = Blueprint('quiz', __name__)


@quiz_bp.route('/generate', methods=['POST'])
@require_auth
@db_error_handler
def generate_quiz():
    """
    Generate a quiz from a topic, single content, or multiple content items.
    
    Request body:
        - topic: str (optional)
        - contentId: str (optional)
        - contentIds: list[str] (optional) - Multi-file selection
        - questionCount: int (optional, default 5)
        - quizType: str (optional, default 'multiple_choice')
        - conversationId: int (optional)
        - sourceMode: str (optional)
    """
    user_id = g.current_user.id
    data = request.get_json() or {}
    
    topic = data.get('topic')
    content_id = data.get('contentId')
    content_ids = data.get('contentIds', [])
    question_count = data.get('questionCount', 5)
    quiz_type = data.get('quizType', 'multiple_choice')
    quiz_types = data.get('quizTypes')
    if isinstance(quiz_types, list) and quiz_types:
        if len(quiz_types) == 1:
            quiz_type = quiz_types[0]
            quiz_types = None
        else:
            quiz_type = 'mixed'
    conversation_id = data.get('conversationId')
    source_mode = data.get('sourceMode', 'topic_based')
    
    if not isinstance(question_count, int):
        try:
            question_count = int(question_count)
        except Exception:
            question_count = 5
            
    quiz, error_msg = quiz_service.generate_quiz(
        user_id=user_id,
        topic=topic,
        content_id=content_id,
        content_ids=content_ids,
        question_count=question_count,
        source_mode=source_mode,
        quiz_type=quiz_type,
        quiz_types=quiz_types,
        conversation_id=conversation_id
    )
    
    if error_msg:
        if "not found" in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        return jsonify({'error': error_msg}), 400
        
    quiz_data = QuizData.query.get(quiz.id)
    if quiz_data:
        return jsonify(quiz_data.to_client_dict()), 200
        
    return jsonify({
        'quizId': quiz.id,
        'questions': [q.to_dict() for q in quiz.questions]
    }), 200


@quiz_bp.route('/generate-from-conversation', methods=['POST'])
@require_auth
@db_error_handler
def generate_from_conversation():
    """Generate a quiz grounded directly in a conversation's linked documents and topic."""
    user_id = g.current_user.id
    data = request.get_json() or {}
    
    conversation_id = data.get('conversationId')
    if not conversation_id:
        return jsonify({'error': 'conversationId is required'}), 400
        
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
        
    question_count = data.get('questionCount', 5)
    quiz_type = data.get('quizType', 'multiple_choice')
    quiz_types = data.get('quizTypes')
    if isinstance(quiz_types, list) and quiz_types:
        if len(quiz_types) == 1:
            quiz_type = quiz_types[0]
            quiz_types = None
        else:
            quiz_type = 'mixed'
    
    quiz, error_msg = quiz_service.generate_quiz(
        user_id=user_id,
        topic=conversation.topic or conversation.title,
        content_ids=conversation.content_ids,
        question_count=question_count,
        quiz_type=quiz_type,
        quiz_types=quiz_types,
        conversation_id=conversation_id
    )
    
    if error_msg:
        return jsonify({'error': error_msg}), 400
        
    quiz_data = QuizData.query.get(quiz.id)
    return jsonify(quiz_data.to_client_dict() if quiz_data else {'quizId': quiz.id}), 200


@quiz_bp.route('/submit', methods=['POST'])
@require_auth
@db_error_handler
def submit_quiz():
    """Submit quiz answers, get Socratic breakdown, and record learning analytics."""
    user_id = g.current_user.id
    data = request.get_json() or {}
    
    quiz_id = data.get('quizId')
    answers = data.get('answers')
    time_taken = data.get('timeTaken')
    
    if not quiz_id:
        return jsonify({'error': 'quizId is required'}), 400
    if answers is None or not isinstance(answers, list):
        return jsonify({'error': 'answers must be a list'}), 400
        
    quiz_data = QuizData.query.get(quiz_id)
    if not quiz_data:
        return jsonify({'error': 'Quiz not found'}), 404
    if quiz_data.user_id != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    grade_result = quiz_data.grade(answers)

    # Idempotent submission: only record result once if not already submitted
    if not quiz_data.is_submitted:
        quiz_data.is_submitted = True
        progress_service.record_quiz_result(
            user_id=user_id,
            quiz_id=quiz_id,
            topic=quiz_data.topic,
            score=grade_result['correctCount'],
            total_questions=grade_result['totalQuestions'],
            answers={'submitted': answers},
            time_taken=time_taken,
            conversation_id=quiz_data.conversation_id
        )
    
    return jsonify(grade_result), 200


@quiz_bp.route('/<quiz_id>/archive', methods=['POST'])
@require_auth
@db_error_handler
def archive_quiz_route(quiz_id):
    """Archive a quiz to clean up the workspace."""
    user_id = g.current_user.id
    success, err = quiz_service.archive_quiz(quiz_id, user_id)
    if not success:
        return jsonify({'error': err or 'Failed to archive quiz'}), 400
    return jsonify({'message': 'Quiz archived successfully'}), 200


@quiz_bp.route('/<quiz_id>/unarchive', methods=['POST'])
@require_auth
@db_error_handler
def unarchive_quiz_route(quiz_id):
    """Restore an archived quiz."""
    user_id = g.current_user.id
    success, err = quiz_service.unarchive_quiz(quiz_id, user_id)
    if not success:
        return jsonify({'error': err or 'Failed to unarchive quiz'}), 400
    return jsonify({'message': 'Quiz restored successfully'}), 200


@quiz_bp.route('/<quiz_id>/review', methods=['GET'])
@require_auth
@db_error_handler
def review_quiz(quiz_id):
    """Get full quiz review data with Socratic explanations, sources, and validity scores."""
    user_id = g.current_user.id
    quiz_data = QuizData.query.get(quiz_id)
    if not quiz_data:
        return jsonify({'error': 'Quiz not found'}), 404
    if quiz_data.user_id != user_id:
        return jsonify({'error': 'Not authorized'}), 403
        
    return jsonify(quiz_data.get_review_data()), 200


@quiz_bp.route('/<quiz_id>/retake', methods=['POST'])
@require_auth
@db_error_handler
def retake_quiz(quiz_id):
    """Generate a retake attempt focusing on missed questions or full quiz."""
    user_id = g.current_user.id
    data = request.get_json() or {}
    incorrect_only = data.get('incorrectOnly', False)
    
    new_quiz_id, error = quiz_service.retake_quiz(quiz_id, user_id, incorrect_only)
    if error:
        return jsonify({'error': error}), 400
        
    new_data = QuizData.query.get(new_quiz_id)
    return jsonify(new_data.to_client_dict()), 201


@quiz_bp.route('/conversation/<int:conversation_id>', methods=['GET'])
@require_auth
@db_error_handler
def get_conversation_quizzes(conversation_id):
    """List all quizzes created within a specific workspace conversation."""
    user_id = g.current_user.id
    quizzes = quiz_service.get_conversation_quizzes(conversation_id, user_id)
    return jsonify({'quizzes': quizzes}), 200


@quiz_bp.route('/list', methods=['GET'])
@require_auth
@db_error_handler
def list_quizzes():
    """List all quizzes for the user."""
    user_id = g.current_user.id
    include_archived = request.args.get('includeArchived', 'false').lower() == 'true'
    quizzes = quiz_service.get_user_quizzes(user_id, include_archived=include_archived)
    return jsonify({'quizzes': quizzes}), 200
