"""
Pusher Channels server client for Knowrizon real-time events.

Replaces Socket.IO with stateless Pusher triggers for Vercel deployment.
All events are triggered via HTTP — no persistent connections needed server-side.
"""
import os
import logging
import pusher

logger = logging.getLogger(__name__)

_pusher_client = None


def get_pusher():
    """Get or create the singleton Pusher client."""
    global _pusher_client
    if _pusher_client is None:
        app_id = os.environ.get('PUSHER_APP_ID')
        key = os.environ.get('PUSHER_KEY')
        secret = os.environ.get('PUSHER_SECRET')
        cluster = os.environ.get('PUSHER_CLUSTER', 'ap1')

        if not all([app_id, key, secret]):
            logger.warning(
                "Pusher credentials not configured — real-time events disabled"
            )
            return None

        _pusher_client = pusher.Pusher(
            app_id=app_id,
            key=key,
            secret=secret,
            cluster=cluster,
            ssl=True,
        )
    return _pusher_client


def trigger(channel, event, data):
    """
    Trigger a Pusher event on a channel.

    Args:
        channel: Pusher channel name (e.g. 'private-user-42')
        event:   Event name (e.g. 'chat:message')
        data:    Dict payload (max 10 KB per Pusher message)
    """
    client = get_pusher()
    if client is None:
        logger.debug("Pusher not configured, skipping trigger: %s/%s", channel, event)
        return

    try:
        client.trigger(channel, event, data)
    except Exception as exc:
        logger.error("Pusher trigger failed: %s — %s/%s", exc, channel, event)


def trigger_batch(events):
    """
    Trigger multiple Pusher events in a single API call (max 10 events).

    Args:
        events: list of dicts with keys 'channel', 'name', 'data'
    """
    client = get_pusher()
    if client is None:
        return

    try:
        client.trigger_batch(events)
    except Exception as exc:
        logger.error("Pusher batch trigger failed: %s", exc)


def authenticate_channel(channel_name, socket_id):
    """
    Authenticate a private or presence channel subscription.

    Args:
        channel_name: The channel being subscribed to
        socket_id:    Pusher socket ID from the client

    Returns:
        dict with 'auth' key for Pusher client
    """
    client = get_pusher()
    if client is None:
        return None

    return client.authenticate(channel=channel_name, socket_id=socket_id)


def authenticate_presence(channel_name, socket_id, user_id, user_info=None):
    """
    Authenticate a presence channel subscription with user data.

    Args:
        channel_name: The presence channel (e.g. 'presence-chat-42')
        socket_id:    Pusher socket ID
        user_id:      Unique user identifier
        user_info:    Optional dict of user metadata shown to other members

    Returns:
        dict with 'auth' and 'channel_data' keys
    """
    client = get_pusher()
    if client is None:
        return None

    return client.authenticate(
        channel=channel_name,
        socket_id=socket_id,
        custom_data={
            'user_id': str(user_id),
            'user_info': user_info or {},
        },
    )
