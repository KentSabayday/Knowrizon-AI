/**
 * WebSocket service for real-time communication.
 */
import { io } from 'socket.io-client';
import { getSocketIOUrl } from './api';

// Use dynamic URL based on environment
const getSocketUrl = () => {
  // In production, use same origin
  // In development, Vite proxy handles /socket.io
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.connecting = false;
    this.connectionPromise = null;
  }

  connect(token) {
    // If already connected, return immediately
    if (this.socket?.connected) {
      this.connected = true;
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.connecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
      }

      this.socket = io(getSocketUrl(), {
        query: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      const connectTimeout = setTimeout(() => {
        this.connecting = false;
        reject(new Error('Connection timeout'));
      }, 15000);

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        this.connected = true;
        this.connecting = false;
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('WebSocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        this.connected = false;
        this.connecting = false;
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('reconnect', () => {
        this.connected = true;
        console.log('WebSocket reconnected');
      });

      // Re-register all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.on(event, callback);
        });
      });
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.connecting = false;
      this.connectionPromise = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('Socket not connected when trying to emit:', event);
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('Emitting event:', event, data);
      
      // Set a timeout for the response
      const timeout = setTimeout(() => {
        console.error('Socket emit timeout for event:', event);
        reject(new Error('Socket response timeout'));
      }, 10000);

      this.socket.emit(event, data, (response) => {
        clearTimeout(timeout);
        console.log('Socket response for', event, ':', response);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Chat methods
  async joinChat(chatId, chatType = 'direct') {
    return this.emit('chat:join', { chatId, chatType });
  }

  async leaveChat(chatId, chatType = 'direct') {
    if (!this.socket?.connected) return { success: true };
    return this.emit('chat:leave', { chatId, chatType });
  }

  async sendMessage(chatId, content, chatType = 'direct') {
    return this.emit('chat:message', { chatId, content, chatType });
  }

  async sendTyping(chatId, isTyping, chatType = 'direct') {
    if (!this.socket?.connected) return;
    return this.emit('chat:typing', { chatId, isTyping, chatType });
  }

  async markAsRead(chatId, messageIds, chatType = 'direct') {
    if (!this.socket?.connected) return;
    return this.emit('chat:read', { chatId, messageIds, chatType });
  }

  // Call methods
  initiateCall(callType, contextType, contextId) {
    return this.emit('call:initiate', { callType, contextType, contextId });
  }

  acceptCall(callId) {
    return this.emit('call:accept', { callId });
  }

  declineCall(callId) {
    return this.emit('call:decline', { callId });
  }

  endCall(callId) {
    return this.emit('call:end', { callId });
  }

  sendOffer(callId, targetUserId, offer) {
    return this.emit('call:offer', { callId, targetUserId, offer });
  }

  sendAnswer(callId, targetUserId, answer) {
    return this.emit('call:answer', { callId, targetUserId, answer });
  }

  sendIceCandidate(callId, targetUserId, candidate) {
    return this.emit('call:ice-candidate', { callId, targetUserId, candidate });
  }

  cancelRinging(callId) {
    return this.emit('call:cancel-ringing', { callId });
  }

  updateMediaState(callId, state) {
    return this.emit('call:media-state', { callId, ...state });
  }

  // Presence methods
  updateStatus(status) {
    return this.emit('presence:status', { status });
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
