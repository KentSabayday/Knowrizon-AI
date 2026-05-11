/**
 * API Configuration for Knowrizon
 * 
 * In development: Vite proxy handles /api requests to localhost:5000
 * In production: Same origin serves both frontend and API (Vercel)
 */

// Use relative URLs - works with both Vite proxy (dev) and same-origin (prod)
export const API_BASE = '/api';
