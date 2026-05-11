"""
Real-time event routes — Pusher auth and action endpoints.

Replaces Socket.IO event handlers with REST endpoints that trigger Pusher events.
Each action: client POSTs → Flask saves to DB → Flask triggers Pusher → done.
"""
import logging
from flask import Blueprint, request, jsonify

from app.pusher_client import trigger, trigger_batch, authenticate_channel, authenticate_presence
from app.decorators import require_auth
from app.services.auth_service import auth_service
from app.services.chat_service import chat_service
from app.services.call_service import call_service
from app.services.presence_service import presence_service
from app.database import db

logger = logging.getLogger(__name__)

realtime_bp = Blueprint('realtime', __name__)


# ──────────────────────────────────────────────
# Pusher channel authentication
# ──────────────────────────────────────────────

@realtime_bp.route('/pusher/auth', methods=['POST'])
@require_auth
def pusher_auth(current_user):
    """Authenticate a Pusher private or presence channel subscription."""
    socket_id = request.form.get('socket_id')
    channel_name = request.form.get('channel_name')

    if not socket_id or not channel_name:
        return jsonify({'error': 'socket_id and channel_name required'}), 400

    # Presence channels require user data
    if channel_name.startswith('presence-'):
        auth_response = authenticate_presence(
            channel_name,
            socket_id,
            user_id=current_user.id,
            user_info={
                'name': current_user.name,
                'email': getattr(current_user, 'email', ''),
            },
        )
    else:
        # Private channels
        auth_response = authenticate_channel(channel_name, socket_id)

    if auth_response is None:
        return jsonify({'error': 'Pusher not configured'}), 503

    return jsonify(auth_response)


# ──────────────────────────────────────────────
# Chat actions (replace socket.io chat:* events)
# ──────────────────────────────────────────────

@realtime_bp.route('/realtime/chat/message', methods=['POST'])
@require_auth
def send_chat_message(current_user):
    """Send a chat message and broadcast via Pusher."""
    data = request.get_json(silent=True) or {}
    chat_id = data.get('chatId')
    content = data.get('content')
    chat_type = data.get('chatType', 'direct')

    if not chat_id or not content:
        return jsonify({'error': 'chatId and content are required'}), 400

    # Save to database
    if chat_type == 'direct':
        message, error = chat_service.send_message(chat_id, current_user.id, content)
    else:
        from app.services.group_service import group_service
        message, error = group_service.send_group_message(chat_id, current_user.id, content)

    if error:
        return jsonify({'error': error}), 400

    msg_dict = message.to_dict()

    # Broadcast to Pusher channel (private channel per chat)
    channel = f'private-{chat_type}-{chat_id}'
    trigger(channel, 'chat:message', msg_dict)

    return jsonify({'success': True, 'message': msg_dict})


@realtime_bp.route('/realtime/chat/typing', methods=['POST'])
@require_auth
def send_typing(current_user):
    """Broadcast typing indicator via Pusher."""
    data = request.get_json(silent=True) or {}
    chat_id = data.get('chatId')
    chat_type = data.get('chatType', 'direct')
    is_typing = data.get('isTyping', True)

    if not chat_id:
        return jsonify({'error': 'chatId required'}), 400

    channel = f'private-{chat_type}-{chat_id}'
    trigger(channel, 'chat:typing', {
        'userId': current_user.id,
        'userName': current_user.name,
        'isTyping': is_typing,
    })

    return jsonify({'success': True})


@realtime_bp.route('/realtime/chat/read', methods=['POST'])
@require_auth
def mark_read(current_user):
    """Mark messages as read and broadcast via Pusher."""
    data = request.get_json(silent=True) or {}
    chat_id = data.get('chatId')
    message_ids = data.get('messageIds')
    chat_type = data.get('chatType', 'direct')

    if not chat_id:
        return jsonify({'error': 'chatId required'}), 400

    if chat_type == 'direct':
        chat_service.mark_as_read(chat_id, current_user.id, message_ids)

    channel = f'private-{chat_type}-{chat_id}'
    trigger(channel, 'chat:read', {
        'userId': current_user.id,
        'messageIds': message_ids,
    })

    return jsonify({'success': True})


# ──────────────────────────────────────────────
# Presence actions (replace socket.io presence:* events)
# ──────────────────────────────────────────────

@realtime_bp.route('/realtime/presence/online', methods=['POST'])
@require_auth
def go_online(current_user):
    """Mark user as online and notify friends via Pusher."""
    presence_service.set_online(current_user.id, socket_id=None)

    from app.models.friend import Friend
    friendships = Friend.query.filter_by(user_id=current_user.id).all()

    events = []
    for f in friendships:
        events.append({
            'channel': f'private-user-{f.friend_id}',
            'name': 'presence:online',
            'data': {'userId': current_user.id, 'userName': current_user.name},
        })

    # Pusher batch supports up to 10 events per call
    for i in range(0, len(events), 10):
        trigger_batch(events[i:i + 10])

    return jsonify({'success': True})


@realtime_bp.route('/realtime/presence/offline', methods=['POST'])
@require_auth
def go_offline(current_user):
    """Mark user as offline and notify friends via Pusher."""
    from datetime import datetime
    presence_service.set_offline(current_user.id)

    from app.models.friend import Friend
    friendships = Friend.query.filter_by(user_id=current_user.id).all()

    events = []
    for f in friendships:
        events.append({
            'channel': f'private-user-{f.friend_id}',
            'name': 'presence:offline',
            'data': {
                'userId': current_user.id,
                'lastSeen': datetime.utcnow().isoformat(),
            },
        })

    for i in range(0, len(events), 10):
        trigger_batch(events[i:i + 10])

    return jsonify({'success': True})


@realtime_bp.route('/realtime/presence/status', methods=['POST'])
@require_auth
def update_status(current_user):
    """Update presence status and notify friends."""
    data = request.get_json(silent=True) or {}
    status = data.get('status', 'available')

    presence_service.set_status(current_user.id, status)

    from app.models.friend import Friend
    friendships = Friend.query.filter_by(user_id=current_user.id).all()

    events = []
    for f in friendships:
        events.append({
            'channel': f'private-user-{f.friend_id}',
            'name': 'presence:status',
            'data': {'userId': current_user.id, 'status': status},
        })

    for i in range(0, len(events), 10):
        trigger_batch(events[i:i + 10])

    return jsonify({'success': True})


# ──────────────────────────────────────────────
# Call signaling (replace socket.io call:* events)
# ──────────────────────────────────────────────

@realtime_bp.route('/realtime/call/initiate', methods=['POST'])
@require_auth
def initiate_call(current_user):
    """Initiate a call and ring participants via Pusher."""
    data = request.get_json(silent=True) or {}
    call_type = data.get('callType')
    context_type = data.get('contextType')
    context_id = data.get('contextId')

    call, error = call_service.initiate_call(
        current_user.id, call_type, context_type, context_id
    )

    if error:
        return jsonify({'error': error}), 400

    call_dict = call.to_dict(include_participants=True)

    # Ring each participant on their private user channel
    for participant in call.participants.all():
        if participant.user_id != current_user.id:
            trigger(
                f'private-user-{participant.user_id}',
                'call:ring',
                call_dict,
            )

    return jsonify({'success': True, 'call': call_dict})


@realtime_bp.route('/realtime/call/accept', methods=['POST'])
@require_auth
def accept_call(current_user):
    """Accept a call and notify other participants."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')

    participant, error = call_service.join_call(call_id, current_user.id)

    if error:
        return jsonify({'error': error}), 400

    from app.models.call import Call
    call = Call.query.get(call_id)

    accepted_data = {
        'callId': call_id,
        'userId': current_user.id,
        'userName': current_user.name,
    }

    # Notify the call channel
    trigger(f'private-call-{call_id}', 'call:accepted', accepted_data)

    # Also notify the initiator directly
    if call and call.initiator_id != current_user.id:
        trigger(f'private-user-{call.initiator_id}', 'call:accepted', accepted_data)

    # For group calls, notify all joined participants about the new joiner
    if call and call.context_type == 'group':
        for p in call.participants.all():
            if p.status == 'joined' and p.user_id != current_user.id:
                trigger(f'private-user-{p.user_id}', 'call:participant-joined', accepted_data)

    return jsonify({
        'success': True,
        'participant': participant.to_dict(),
        'call': call.to_dict(include_participants=True) if call else None,
    })


@realtime_bp.route('/realtime/call/decline', methods=['POST'])
@require_auth
def decline_call(current_user):
    """Decline a call."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')

    success, error, call_ended = call_service.decline_call(call_id, current_user.id)

    if error:
        return jsonify({'error': error}), 400

    from app.models.call import Call
    call = Call.query.get(call_id)

    declined_data = {
        'callId': call_id,
        'userId': current_user.id,
        'userName': current_user.name,
    }

    if call_ended:
        trigger(f'private-call-{call_id}', 'call:declined', declined_data)
        if call and call.initiator_id != current_user.id:
            trigger(f'private-user-{call.initiator_id}', 'call:declined', declined_data)
    else:
        if call and call.initiator_id != current_user.id:
            trigger(f'private-user-{call.initiator_id}', 'call:participant-declined', declined_data)
        for p in call.participants.all():
            if p.status == 'joined' and p.user_id != current_user.id:
                trigger(f'private-user-{p.user_id}', 'call:participant-declined', declined_data)

    return jsonify({'success': True, 'callEnded': call_ended})


@realtime_bp.route('/realtime/call/end', methods=['POST'])
@require_auth
def end_call(current_user):
    """End a call."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')

    from app.models.call import Call
    call = Call.query.get(call_id)

    if not call:
        return jsonify({'error': 'Call not found'}), 404

    is_group_call = call.context_type == 'group'

    if is_group_call:
        remaining = sum(
            1 for p in call.participants.all()
            if p.status == 'joined' and p.user_id != current_user.id
        )

        if remaining > 0:
            success, error = call_service.leave_call(call_id, current_user.id)
            if error:
                return jsonify({'error': error}), 400

            trigger(f'private-call-{call_id}', 'call:participant-left', {
                'callId': call_id,
                'userId': current_user.id,
                'userName': current_user.name,
            })
            return jsonify({'success': True, 'action': 'left'})

    success, error = call_service.end_call(call_id, current_user.id)
    if error:
        return jsonify({'error': error}), 400

    trigger(f'private-call-{call_id}', 'call:ended', {
        'callId': call_id,
        'endedBy': current_user.id,
    })

    return jsonify({'success': True, 'action': 'ended'})


@realtime_bp.route('/realtime/call/cancel-ringing', methods=['POST'])
@require_auth
def cancel_ringing(current_user):
    """Cancel ringing for unanswered calls."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')

    success, error = call_service.cancel_ringing(call_id, current_user.id)

    if error:
        return jsonify({'error': error}), 400

    from app.models.call import Call
    call = Call.query.get(call_id)

    if call and call.status == 'missed':
        ended_data = {
            'callId': call_id,
            'endedBy': current_user.id,
            'reason': 'timeout',
        }
        trigger(f'private-call-{call_id}', 'call:ended', ended_data)
        for p in call.participants.all():
            if p.user_id != current_user.id:
                trigger(f'private-user-{p.user_id}', 'call:ended', ended_data)

    return jsonify({'success': True})


@realtime_bp.route('/realtime/call/offer', methods=['POST'])
@require_auth
def send_offer(current_user):
    """Forward WebRTC offer via Pusher."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')
    target_user_id = data.get('targetUserId')
    offer = data.get('offer')

    trigger(f'private-user-{target_user_id}', 'call:offer', {
        'callId': call_id,
        'fromUserId': current_user.id,
        'offer': offer,
    })

    return jsonify({'success': True})


@realtime_bp.route('/realtime/call/answer', methods=['POST'])
@require_auth
def send_answer(current_user):
    """Forward WebRTC answer via Pusher."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')
    target_user_id = data.get('targetUserId')
    answer = data.get('answer')

    trigger(f'private-user-{target_user_id}', 'call:answer', {
        'callId': call_id,
        'fromUserId': current_user.id,
        'answer': answer,
    })

    return jsonify({'success': True})


@realtime_bp.route('/realtime/call/ice-candidate', methods=['POST'])
@require_auth
def send_ice_candidate(current_user):
    """Forward ICE candidate via Pusher."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')
    target_user_id = data.get('targetUserId')
    candidate = data.get('candidate')

    trigger(f'private-user-{target_user_id}', 'call:ice-candidate', {
        'callId': call_id,
        'fromUserId': current_user.id,
        'candidate': candidate,
    })

    return jsonify({'success': True})


@realtime_bp.route('/realtime/call/media-state', methods=['POST'])
@require_auth
def update_media_state(current_user):
    """Update and broadcast media state changes."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('callId')

    participant, error = call_service.update_media_state(
        call_id,
        current_user.id,
        is_muted=data.get('isMuted'),
        is_video_off=data.get('isVideoOff'),
        is_screen_sharing=data.get('isScreenSharing'),
    )

    if error:
        return jsonify({'error': error}), 400

    trigger(f'private-call-{call_id}', 'call:media-state', {
        'callId': call_id,
        'userId': current_user.id,
        'isMuted': participant.is_muted,
        'isVideoOff': participant.is_video_off,
        'isScreenSharing': participant.is_screen_sharing,
    })

    return jsonify({'success': True})
