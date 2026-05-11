/**
 * API Configuration for Knowrizon
 * 
 * In development: Vite proxy handles /api requests to localhost:5000
 * In production: Same origin serves both frontend and API
 */

// Use relative URLs - works with both Vite proxy (dev) and same-origin (prod)
export const API_BASE = '/api';

// WebSocket URL - use relative path for same-origin
export const getWebSocketUrl = () => {
  if (typeof window === 'undefined') return '';

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;

  // In development with Vite, the proxy handles this
  // In production, same origin
  return `${protocol}//${host}`;
};

// HTTP base URL for socket.io
export const getSocketIOUrl = () => {
  if (typeof window === 'undefined') return '';

  // In development, Vite proxy handles /socket.io
  // In production, same origin
  return window.location.origin;
};
