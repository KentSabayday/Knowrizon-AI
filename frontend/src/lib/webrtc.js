/**
 * WebRTC service for voice and video calls.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.screenStream = null;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
    this.pendingIceCandidates = new Map(); // Store ICE candidates that arrive before connection is ready
    this.remoteStreams = new Map(); // Store combined remote streams per user
  }

  /**
   * Set the local stream explicitly (useful when stream is obtained elsewhere)
   */
  setLocalStream(stream) {
    console.log('Setting local stream in webrtc service:', stream?.getTracks().map(t => `${t.kind}:${t.enabled}`));
    this.localStream = stream;
  }

  async getLocalStream(video = true, audio = true) {
    try {
      // Stop existing stream if any
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        audio: audio ? { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: video ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
      };
      
      console.log('Getting local stream with constraints:', constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Local stream obtained:', this.localStream.getTracks().map(t => t.kind));
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      // Try audio only if video fails
      if (video && audio) {
        console.log('Trying audio only...');
        return this.getLocalStream(false, true);
      }
      throw error;
    }
  }

  async getScreenStream() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      return this.screenStream;
    } catch (error) {
      console.error('Failed to get screen stream:', error);
      throw error;
    }
  }

  createPeerConnection(userId, onIceCandidate) {
    console.log('Creating peer connection for user:', userId);
    
    // Close existing connection if any
    const existingPc = this.peerConnections.get(userId);
    if (existingPc) {
      console.log('Closing existing connection for user:', userId);
      existingPc.close();
      this.peerConnections.delete(userId);
    }
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated for:', userId);
        if (onIceCandidate) {
          onIceCandidate(userId, event.candidate);
        }
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state for', userId, ':', pc.iceConnectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.iceConnectionState);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state for', userId, ':', pc.connectionState);
    };

    // Handle incoming tracks (remote stream)
    pc.ontrack = (event) => {
      console.log('Remote track received from:', userId, 'kind:', event.track.kind, 'enabled:', event.track.enabled, 'readyState:', event.track.readyState);
      console.log('Event stream tracks:', event.streams[0]?.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      
      // Get or create a combined stream for this user
      let combinedStream = this.remoteStreams.get(userId);
      
      if (!combinedStream) {
        // Create a new MediaStream for this user
        combinedStream = new MediaStream();
        this.remoteStreams.set(userId, combinedStream);
        console.log('Created new combined stream for:', userId);
      }
      
      // Check if this track is already in the combined stream
      const existingTrack = combinedStream.getTracks().find(t => t.kind === event.track.kind);
      
      if (existingTrack && existingTrack.id !== event.track.id) {
        // Replace the existing track
        console.log(`Replacing ${event.track.kind} track in combined stream for:`, userId);
        combinedStream.removeTrack(existingTrack);
        combinedStream.addTrack(event.track);
      } else if (!existingTrack) {
        // Add the new track
        console.log(`Adding ${event.track.kind} track to combined stream for:`, userId);
        combinedStream.addTrack(event.track);
      }
      
      console.log('Combined stream tracks:', combinedStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      
      // Listen for track state changes
      event.track.onmute = () => {
        console.log('Remote track muted:', userId, event.track.kind);
        if (this.onRemoteStream) {
          this.onRemoteStream(userId, combinedStream);
        }
      };
      event.track.onunmute = () => {
        console.log('Remote track unmuted:', userId, event.track.kind);
        if (this.onRemoteStream) {
          this.onRemoteStream(userId, combinedStream);
        }
      };
      event.track.onended = () => {
        console.log('Remote track ended:', userId, event.track.kind);
        if (this.onRemoteStream) {
          this.onRemoteStream(userId, combinedStream);
        }
      };
      
      // Notify about the combined stream
      if (this.onRemoteStream) {
        this.onRemoteStream(userId, combinedStream);
      }
    };

    // Add local tracks to the connection
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      console.log('Adding', tracks.length, 'local tracks to peer connection for:', userId);
      tracks.forEach(track => {
        console.log('Adding track:', track.kind, 'enabled:', track.enabled, 'id:', track.id);
        pc.addTrack(track, this.localStream);
      });
    } else {
      console.warn('No local stream available when creating peer connection for:', userId);
    }

    this.peerConnections.set(userId, pc);
    
    // Process any pending ICE candidates
    const pending = this.pendingIceCandidates.get(userId);
    if (pending && pending.length > 0) {
      console.log('Processing', pending.length, 'pending ICE candidates for:', userId);
      pending.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.error('Failed to add pending ICE candidate:', err);
        });
      });
      this.pendingIceCandidates.delete(userId);
    }
    
    return pc;
  }

  getPeerConnection(userId) {
    return this.peerConnections.get(userId);
  }

  async createOffer(userId, onIceCandidate) {
    console.log('Creating offer for user:', userId);
    
    const pc = this.createPeerConnection(userId, onIceCandidate);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('Offer created, setting local description');
      await pc.setLocalDescription(offer);
      
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async handleOffer(userId, offer, onIceCandidate) {
    console.log('Handling offer from user:', userId);
    
    const pc = this.createPeerConnection(userId, onIceCandidate);

    try {
      console.log('Setting remote description (offer)');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('Creating answer');
      const answer = await pc.createAnswer();
      
      console.log('Setting local description (answer)');
      await pc.setLocalDescription(answer);
      
      return answer;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  async handleAnswer(userId, answer) {
    console.log('Handling answer from user:', userId);
    
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      console.error('No peer connection found for user:', userId);
      return;
    }

    try {
      // Check if we're in the right state to set remote description
      if (pc.signalingState === 'have-local-offer') {
        console.log('Setting remote description (answer)');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote description set successfully');
      } else {
        console.warn('Unexpected signaling state:', pc.signalingState);
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(userId, candidate) {
    if (!candidate) return;
    
    const pc = this.peerConnections.get(userId);
    
    if (!pc) {
      // Store candidate for later if connection doesn't exist yet
      console.log('Storing ICE candidate for later, no connection yet for:', userId);
      if (!this.pendingIceCandidates.has(userId)) {
        this.pendingIceCandidates.set(userId, []);
      }
      this.pendingIceCandidates.get(userId).push(candidate);
      return;
    }

    try {
      // Check if remote description is set
      if (pc.remoteDescription) {
        console.log('Adding ICE candidate for:', userId);
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Store for later
        console.log('Remote description not set yet, storing ICE candidate for:', userId);
        if (!this.pendingIceCandidates.has(userId)) {
          this.pendingIceCandidates.set(userId, []);
        }
        this.pendingIceCandidates.get(userId).push(candidate);
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  toggleAudio(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
        console.log('Audio track enabled:', track.enabled);
      });
    }
  }

  toggleVideo(off) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !off;
        console.log('Video track enabled:', track.enabled);
      });
    }
  }

  /**
   * Add a video track to the local stream and all peer connections.
   * This is used when turning on video during an audio-only call.
   */
  async addVideoTrack() {
    try {
      // Get video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      const videoTrack = videoStream.getVideoTracks()[0];
      console.log('Got new video track:', videoTrack.id);
      
      // Add to local stream
      if (this.localStream) {
        // Remove any existing video tracks first
        this.localStream.getVideoTracks().forEach(track => {
          this.localStream.removeTrack(track);
          track.stop();
        });
        this.localStream.addTrack(videoTrack);
        console.log('Added video track to local stream');
      }
      
      // Add to all peer connections
      this.peerConnections.forEach((pc, userId) => {
        // Check if there's already a video sender
        const existingVideoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        
        if (existingVideoSender) {
          // Replace the existing track
          console.log('Replacing video track for:', userId);
          existingVideoSender.replaceTrack(videoTrack);
        } else {
          // Add new track
          console.log('Adding new video track to peer connection for:', userId);
          pc.addTrack(videoTrack, this.localStream);
        }
      });
      
      return videoTrack;
    } catch (error) {
      console.error('Failed to add video track:', error);
      throw error;
    }
  }

  /**
   * Remove video track from local stream and peer connections.
   */
  removeVideoTrack() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        console.log('Stopping and removing video track:', track.id);
        track.stop();
        this.localStream.removeTrack(track);
      });
    }
    
    // Remove from peer connections - set track to null
    this.peerConnections.forEach((pc, userId) => {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        console.log('Removing video track from peer connection for:', userId);
        videoSender.replaceTrack(null);
      }
    });
  }

  /**
   * Update local stream and sync with all peer connections.
   * Call this after getting a new stream with different tracks.
   * Returns true if renegotiation is needed.
   */
  async updateLocalStream(newStream) {
    console.log('Updating local stream with new tracks:', newStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
    
    const oldStream = this.localStream;
    this.localStream = newStream;
    
    let needsRenegotiation = false;
    
    // Update all peer connections with new tracks
    this.peerConnections.forEach((pc, userId) => {
      const senders = pc.getSenders();
      console.log('Current senders for', userId, ':', senders.map(s => `${s.track?.kind || 'null'}:${s.track?.id || 'none'}`));
      
      // Handle audio track
      const audioTrack = newStream.getAudioTracks()[0];
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      if (audioTrack) {
        if (audioSender) {
          console.log('Replacing audio track for:', userId);
          audioSender.replaceTrack(audioTrack);
        } else {
          // Check if there's a sender with null track that was for audio
          const nullAudioSender = senders.find(s => !s.track && s.getParameters?.()?.codecs?.some(c => c.mimeType?.includes('audio')));
          if (nullAudioSender) {
            console.log('Replacing null audio sender track for:', userId);
            nullAudioSender.replaceTrack(audioTrack);
          } else {
            console.log('Adding audio track for:', userId);
            pc.addTrack(audioTrack, newStream);
            needsRenegotiation = true;
          }
        }
      }
      
      // Handle video track
      const videoTrack = newStream.getVideoTracks()[0];
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoTrack) {
        if (videoSender) {
          console.log('Replacing video track for:', userId);
          videoSender.replaceTrack(videoTrack);
        } else {
          // Check if there's a sender with null track that was for video
          const nullVideoSender = senders.find(s => !s.track && s.getParameters?.()?.codecs?.some(c => c.mimeType?.includes('video')));
          if (nullVideoSender) {
            console.log('Replacing null video sender track for:', userId);
            nullVideoSender.replaceTrack(videoTrack);
          } else {
            console.log('Adding video track for:', userId);
            pc.addTrack(videoTrack, newStream);
            needsRenegotiation = true;
          }
        }
      } else if (videoSender) {
        // No video track in new stream, remove from sender
        console.log('Removing video track for:', userId);
        videoSender.replaceTrack(null);
      }
    });
    
    // Stop old stream tracks that are not in new stream
    if (oldStream && oldStream !== newStream) {
      oldStream.getTracks().forEach(track => {
        if (!newStream.getTracks().includes(track)) {
          track.stop();
        }
      });
    }
    
    return needsRenegotiation;
  }

  /**
   * Renegotiate with a specific peer after adding tracks.
   * This creates a new offer and requires the remote peer to send an answer.
   */
  async renegotiate(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      console.error('No peer connection for renegotiation:', userId);
      return null;
    }
    
    console.log('Renegotiating with:', userId, 'current signaling state:', pc.signalingState);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Renegotiation offer created for:', userId);
      return offer;
    } catch (error) {
      console.error('Failed to renegotiate:', error);
      throw error;
    }
  }

  /**
   * Handle a renegotiation offer from remote peer.
   * This is called when the remote peer adds/removes tracks during an active call.
   */
  async handleRenegotiationOffer(userId, offer) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      console.error('No peer connection for renegotiation:', userId);
      return null;
    }
    
    console.log('Handling renegotiation offer from:', userId, 'signaling state:', pc.signalingState);
    
    try {
      // If we're in stable state, we can directly set the remote description
      // If we're in have-local-offer state (glare condition), we need to rollback
      if (pc.signalingState === 'have-local-offer') {
        console.log('Glare condition detected, rolling back local offer');
        await pc.setLocalDescription({ type: 'rollback' });
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Renegotiation answer created for:', userId, 'new signaling state:', pc.signalingState);
      return answer;
    } catch (error) {
      console.error('Failed to handle renegotiation offer:', error);
      throw error;
    }
  }

  /**
   * Handle a renegotiation answer from remote peer.
   */
  async handleRenegotiationAnswer(userId, answer) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      console.error('No peer connection for renegotiation:', userId);
      return;
    }
    
    console.log('Handling renegotiation answer from:', userId);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Renegotiation complete with:', userId);
    } catch (error) {
      console.error('Failed to handle renegotiation answer:', error);
      throw error;
    }
  }

  async startScreenShare() {
    try {
      const screenStream = await this.getScreenStream();
      const videoTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      this.peerConnections.forEach((pc, userId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          console.log('Replacing video track with screen share for:', userId);
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share stop
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      return screenStream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;

      // Restore camera video track
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.peerConnections.forEach((pc, userId) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              console.log('Restoring camera video track for:', userId);
              sender.replaceTrack(videoTrack);
            }
          });
        }
      }
    }
  }

  closePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      console.log('Closing peer connection for:', userId);
      pc.close();
      this.peerConnections.delete(userId);
    }
    this.pendingIceCandidates.delete(userId);
    this.remoteStreams.delete(userId);
  }

  closeAllConnections() {
    console.log('Closing all peer connections');
    
    this.peerConnections.forEach((pc, userId) => {
      console.log('Closing connection for:', userId);
      pc.close();
    });
    this.peerConnections.clear();
    this.pendingIceCandidates.clear();
    this.remoteStreams.clear();

    if (this.localStream) {
      console.log('Stopping local stream');
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      console.log('Stopping screen stream');
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }
}

// Singleton instance
export const webrtcService = new WebRTCService();
export default webrtcService;
