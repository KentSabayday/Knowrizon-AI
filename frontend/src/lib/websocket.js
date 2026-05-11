/**
 * Pusher Channels client for Knowrizon real-time events.
 *
 * Replaces Socket.IO with Pusher for fully stateless Vercel deployment.
 * - Subscriptions use Pusher channels (private-user-{id}, private-{type}-{chatId})
 * - Outbound actions use HTTP POST to /api/realtime/* endpoints
 */
import Pusher from 'pusher-js';
import { API_BASE } from './api';

// Read Pusher public config from Vite env or fallback to window.__ENV__
const PUSHER_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUSHER_KEY) || '';
const PUSHER_CLUSTER =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUSHER_CLUSTER) || 'ap1';

let pusherInstance = null;
let currentToken = null;
let subscribedChannels = new Map();

/**
 * Initialize or return the Pusher singleton.
 */
function getPusher(token) {
  if (pusherInstance && currentToken === token) {
    return pusherInstance;
  }

  // Disconnect old instance if token changed
  if (pusherInstance) {
    pusherInstance.disconnect();
    subscribedChannels.clear();
  }

  currentToken = token;

  pusherInstance = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    authEndpoint: `${API_BASE}/pusher/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return pusherInstance;
}

/**
 * Subscribe to a channel if not already subscribed.
 */
function subscribe(channelName) {
  if (!pusherInstance) return null;

  if (subscribedChannels.has(channelName)) {
    return subscribedChannels.get(channelName);
  }

  const channel = pusherInstance.subscribe(channelName);
  subscribedChannels.set(channelName, channel);
  return channel;
}

/**
 * Unsubscribe from a channel.
 */
function unsubscribe(channelName) {
  if (!pusherInstance) return;

  if (subscribedChannels.has(channelName)) {
    pusherInstance.unsubscribe(channelName);
    subscribedChannels.delete(channelName);
  }
}

/**
 * Helper: POST JSON to an API endpoint with auth.
 */
async function postRealtime(path, body) {
  const response = await fetch(`${API_BASE}/realtime${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

// ─────────────────────────────────────────────
// Public API — drop-in replacement for websocketService
// ─────────────────────────────────────────────

class PusherService {
  constructor() {
    this.connected = false;
    this.connecting = false;
  }

  /**
   * Connect to Pusher and subscribe to the user's private channel.
   */
  async connect(token) {
    if (this.connected && currentToken === token) return;

    this.connecting = true;

    try {
      const pusher = getPusher(token);

      // Wait for connection
      await new Promise((resolve, reject) => {
        if (pusher.connection.state === 'connected') {
          resolve();
          return;
        }

        const onConnected = () => {
          pusher.connection.unbind('connected', onConnected);
          pusher.connection.unbind('error', onError);
          resolve();
        };

        const onError = (err) => {
          pusher.connection.unbind('connected', onConnected);
          pusher.connection.unbind('error', onError);
          reject(err);
        };

        pusher.connection.bind('connected', onConnected);
        pusher.connection.bind('error', onError);

        // Timeout after 10 seconds
        setTimeout(() => {
          pusher.connection.unbind('connected', onConnected);
          pusher.connection.unbind('error', onError);
          // Resolve anyway — Pusher will reconnect automatically
          resolve();
        }, 10000);
      });

      this.connected = true;
      this.connecting = false;

      // Notify server we're online
      postRealtime('/presence/online', {}).catch(() => {});
    } catch (err) {
      this.connecting = false;
      console.error('Pusher connection error:', err);
      // Don't throw — Pusher will auto-reconnect
      this.connected = true;
    }
  }

  /**
   * Disconnect from Pusher.
   */
  disconnect() {
    if (pusherInstance) {
      // Notify server we're offline
      if (currentToken) {
        postRealtime('/presence/offline', {}).catch(() => {});
      }

      pusherInstance.disconnect();
      pusherInstance = null;
      subscribedChannels.clear();
      currentToken = null;
    }
    this.connected = false;
    this.connecting = false;
  }

  /**
   * Subscribe to a channel and bind an event.
   * Returns an unsubscribe function.
   */
  on(eventName, callback, channelName) {
    if (!channelName) {
      // If no channel specified, this is a global listener stored locally
      // These get bound when the user subscribes to their personal channel
      if (!this._globalListeners) this._globalListeners = new Map();
      if (!this._globalListeners.has(eventName)) {
        this._globalListeners.set(eventName, new Set());
      }
      this._globalListeners.get(eventName).add(callback);

      return () => {
        if (this._globalListeners?.has(eventName)) {
          this._globalListeners.get(eventName).delete(callback);
        }
      };
    }

    const channel = subscribe(channelName);
    if (channel) {
      channel.bind(eventName, callback);
    }

    return () => {
      if (channel) {
        channel.unbind(eventName, callback);
      }
    };
  }

  /**
   * Subscribe to the user's personal channel for direct events
   * (call:ring, presence, etc.)
   */
  subscribeUser(userId) {
    const channelName = `private-user-${userId}`;
    const channel = subscribe(channelName);

    // Bind any global listeners that were registered before subscription
    if (this._globalListeners && channel) {
      for (const [event, callbacks] of this._globalListeners) {
        for (const cb of callbacks) {
          channel.bind(event, cb);
        }
      }
    }

    return channel;
  }

  /**
   * Subscribe to a chat channel.
   */
  subscribeChat(chatId, chatType = 'direct') {
    return subscribe(`private-${chatType}-${chatId}`);
  }

  /**
   * Unsubscribe from a chat channel.
   */
  unsubscribeChat(chatId, chatType = 'direct') {
    unsubscribe(`private-${chatType}-${chatId}`);
  }

  /**
   * Subscribe to a call channel.
   */
  subscribeCall(callId) {
    return subscribe(`private-call-${callId}`);
  }

  /**
   * Unsubscribe from a call channel.
   */
  unsubscribeCall(callId) {
    unsubscribe(`private-call-${callId}`);
  }

  // ─────────────────────────────────────
  // Chat methods (POST to server → Pusher trigger)
  // ─────────────────────────────────────

  async joinChat(chatId, chatType = 'direct') {
    this.subscribeChat(chatId, chatType);
    return { success: true };
  }

  async leaveChat(chatId, chatType = 'direct') {
    this.unsubscribeChat(chatId, chatType);
    return { success: true };
  }

  async sendMessage(chatId, content, chatType = 'direct') {
    return postRealtime('/chat/message', { chatId, content, chatType });
  }

  async sendTyping(chatId, isTyping, chatType = 'direct') {
    return postRealtime('/chat/typing', { chatId, isTyping, chatType });
  }

  async markAsRead(chatId, messageIds, chatType = 'direct') {
    return postRealtime('/chat/read', { chatId, messageIds, chatType });
  }

  // ─────────────────────────────────────
  // Call methods (POST to server → Pusher trigger)
  // ─────────────────────────────────────

  async initiateCall(callType, contextType, contextId) {
    const result = await postRealtime('/call/initiate', {
      callType,
      contextType,
      contextId,
    });

    // Subscribe to the call channel for signaling events
    if (result?.call?.id) {
      this.subscribeCall(result.call.id);
    }

    return result;
  }

  async acceptCall(callId) {
    this.subscribeCall(callId);
    return postRealtime('/call/accept', { callId });
  }

  async declineCall(callId) {
    const result = await postRealtime('/call/decline', { callId });
    this.unsubscribeCall(callId);
    return result;
  }

  async endCall(callId) {
    const result = await postRealtime('/call/end', { callId });
    this.unsubscribeCall(callId);
    return result;
  }

  async cancelRinging(callId) {
    return postRealtime('/call/cancel-ringing', { callId });
  }

  async sendOffer(callId, targetUserId, offer) {
    return postRealtime('/call/offer', { callId, targetUserId, offer });
  }

  async sendAnswer(callId, targetUserId, answer) {
    return postRealtime('/call/answer', { callId, targetUserId, answer });
  }

  async sendIceCandidate(callId, targetUserId, candidate) {
    return postRealtime('/call/ice-candidate', { callId, targetUserId, candidate });
  }

  async updateMediaState(callId, state) {
    return postRealtime('/call/media-state', { callId, ...state });
  }

  // ─────────────────────────────────────
  // Presence methods
  // ─────────────────────────────────────

  async updateStatus(status) {
    return postRealtime('/presence/status', { status });
  }
}

// Singleton instance
export const pusherService = new PusherService();
export default pusherService;
