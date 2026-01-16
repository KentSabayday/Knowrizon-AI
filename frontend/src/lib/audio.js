/**
 * Audio utilities for call sounds.
 */

class AudioService {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.isInitialized = false;
  }

  /**
   * Initialize audio context - should be called after user interaction
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      console.log('AudioService initialized, state:', this.audioContext.state);
    } catch (err) {
      console.error('Failed to initialize AudioService:', err);
    }
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  async ensureResumed() {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        console.log('AudioContext resumed');
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }
    return ctx;
  }

  /**
   * Play a ringtone sound using Web Audio API
   */
  async playRingtone() {
    if (this.isPlaying) return;
    
    try {
      const ctx = await this.ensureResumed();
      this.isPlaying = true;
      this.playRingtonePattern(ctx);
    } catch (err) {
      console.error('Failed to play ringtone:', err);
    }
  }

  playRingtonePattern(ctx) {
    if (!this.isPlaying) return;
    
    // Check if context is still valid
    if (ctx.state === 'closed') return;

    try {
      // Create oscillator for the ring tone
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Ring tone frequencies (similar to phone ring)
      oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
      oscillator.frequency.setValueAtTime(480, ctx.currentTime + 0.2); // B4
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
      
      // Schedule next ring after pause
      setTimeout(() => {
        if (this.isPlaying) {
          this.playRingtonePattern(ctx);
        }
      }, 1000); // Ring every 1 second
    } catch (err) {
      console.error('Error in ringtone pattern:', err);
    }
  }

  /**
   * Stop the ringtone
   */
  stopRingtone() {
    console.log('Stopping ringtone');
    this.isPlaying = false;
  }

  /**
   * Play a short notification sound
   */
  async playNotification() {
    try {
      const ctx = await this.ensureResumed();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (err) {
      console.error('Failed to play notification:', err);
    }
  }

  /**
   * Play call connected sound
   */
  async playConnected() {
    try {
      const ctx = await this.ensureResumed();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Rising tone
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (err) {
      console.error('Failed to play connected sound:', err);
    }
  }

  /**
   * Play call ended sound
   */
  async playEnded() {
    try {
      const ctx = await this.ensureResumed();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Falling tone
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.error('Failed to play ended sound:', err);
    }
  }
}

export const audioService = new AudioService();
export default audioService;
