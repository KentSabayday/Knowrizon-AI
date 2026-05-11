import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import pusherService from '../lib/websocket';
import webrtcService from '../lib/webrtc';
import audioService from '../lib/audio';
import { API_BASE } from '../lib/api';

const CallContext = createContext(null);

const CALL_TIMEOUT = 30000; // 30 seconds

export function CallProvider({ children }) {
  const { token, user, isAuthenticated } = useAuth();
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const callTimeoutRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const activeCallRef = useRef(null);
  const incomingCallRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamsRef = useRef({});

  // Keep refs in sync
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const playRingtone = useCallback(() => {
    audioService.playRingtone();
  }, []);

  const stopRingtone = useCallback(() => {
    audioService.stopRingtone();
  }, []);

  const startDurationTimer = useCallback(() => {
    // Clear any existing timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const initiateCall = async (callType, contextType, contextId, retryAfterCleanup = true) => {
    let stream = null;
    
    try {
      // Clear any stale state from previous calls
      if (activeCallRef.current) {
        console.log('Clearing stale active call state before initiating new call');
        webrtcService.closeAllConnections();
        setActiveCall(null);
        setRemoteStreams({});
      }

      // Get local media stream - this also sets webrtcService.localStream
      const isVideoCall = callType === 'video';
      stream = await webrtcService.getLocalStream(isVideoCall, true);
      setLocalStream(stream);
      setIsVideoOff(!isVideoCall);
      
      console.log('Local stream obtained for initiator:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

      // Initiate call via REST API → Pusher
      const result = await pusherService.initiateCall(callType, contextType, contextId);
      
      console.log('Call initiated:', result);
      
      if (result?.call) {
        setActiveCall({ ...result.call, isInitiator: true });
        
        // Play outgoing ring tone
        audioService.playRingtone();
        
        // Set timeout for unanswered call
        const timeout = contextType === 'group' ? 60000 : CALL_TIMEOUT;
        
        callTimeoutRef.current = setTimeout(async () => {
          const call = activeCallRef.current;
          if (!call) return;
          
          stopRingtone();
          
          const hasConnections = Object.keys(remoteStreamsRef.current).length > 0;
          
          if (hasConnections) {
            console.log('Timeout reached but call is active with connections, canceling ringing only');
            try {
              await pusherService.cancelRinging(call.id);
            } catch (err) {
              console.error('Failed to cancel ringing:', err);
            }
          } else {
            console.log('Timeout reached with no connections, ending call');
            endCall();
          }
        }, timeout);
        
        return { success: true, call: result.call };
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      return { success: false, error: 'Failed to initiate call' };
    } catch (err) {
      console.error('Failed to initiate call:', err);
      
      const errorMessage = err.message || '';
      if (errorMessage.includes('already an active call') && retryAfterCleanup) {
        console.log('Got "already active call" error, attempting cleanup...');
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        
        try {
          const cleanupResponse = await fetch(
            `${API_BASE}/calls/cleanup/${contextType}/${contextId}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (cleanupResponse.ok) {
            const cleanupResult = await cleanupResponse.json();
            console.log('Cleanup result:', cleanupResult);
            
            if (cleanupResult.cleanedCount > 0) {
              console.log('Retrying call initiation after cleanup...');
              return initiateCall(callType, contextType, contextId, false);
            }
          }
        } catch (cleanupErr) {
          console.error('Failed to cleanup stale calls:', cleanupErr);
        }
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      } else if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      return { success: false, error: err.message };
    }
  };

  const acceptCall = async () => {
    const call = incomingCallRef.current;
    if (!call) return { success: false };
    
    try {
      stopRingtone();
      clearTimeout(callTimeoutRef.current);

      // Get local media stream
      const isVideoCall = call.callType === 'video';
      const stream = await webrtcService.getLocalStream(isVideoCall, true);
      setLocalStream(stream);
      setIsVideoOff(!isVideoCall);
      
      console.log('Local stream obtained for receiver:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

      // Accept call via REST API → Pusher
      const result = await pusherService.acceptCall(call.id);
      
      console.log('Call accepted:', result);
      
      if (result?.success) {
        const updatedCall = result.call || call;
        const acceptedCall = { ...updatedCall, status: 'active', isInitiator: false };
        setActiveCall(acceptedCall);
        setIncomingCall(null);
        
        audioService.playConnected();
        startDurationTimer();
        
        webrtcService.setLocalStream(stream);
        
        console.log('All participants from server:', updatedCall.participants);
        
        let potentialParticipants = updatedCall.participants?.filter(p => 
          p.userId !== user?.id && 
          p.status !== 'declined' && 
          p.status !== 'left'
        ) || [];
        
        const initiatorInList = potentialParticipants.some(p => p.userId === updatedCall.initiatorId);
        if (!initiatorInList && updatedCall.initiatorId !== user?.id) {
          const initiator = updatedCall.participants?.find(p => p.userId === updatedCall.initiatorId);
          if (initiator) {
            potentialParticipants.push(initiator);
          } else {
            potentialParticipants.push({ userId: updatedCall.initiatorId, userName: updatedCall.initiatorName });
          }
        }
        
        console.log('Final participants to connect to:', potentialParticipants.map(p => p.userId));
        
        for (const participant of potentialParticipants) {
          const shouldCreateOffer = user?.id > participant.userId;
          
          if (shouldCreateOffer) {
            console.log('We have higher ID, creating offer for participant:', participant.userId);
            try {
              const offer = await webrtcService.createOffer(
                participant.userId,
                (userId, candidate) => {
                  console.log('Sending ICE candidate to:', userId);
                  pusherService.sendIceCandidate(call.id, userId, candidate);
                }
              );
              
              console.log('Sending offer to participant:', participant.userId);
              await pusherService.sendOffer(call.id, participant.userId, offer);
            } catch (err) {
              console.error('Failed to create offer for participant:', participant.userId, err);
            }
          } else {
            console.log('Participant has higher ID, they will send us an offer:', participant.userId);
          }
        }
        
        return { success: true };
      }
      
      return { success: false };
    } catch (err) {
      console.error('Failed to accept call:', err);
      return { success: false, error: err.message };
    }
  };

  const declineCall = async () => {
    const call = incomingCallRef.current;
    if (!call) return;
    
    stopRingtone();
    clearTimeout(callTimeoutRef.current);
    
    try {
      const result = await pusherService.declineCall(call.id);
      console.log('Decline call result:', result);
    } catch (err) {
      console.error('Failed to decline call:', err);
    }
    
    setIncomingCall(null);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const endCall = async () => {
    const call = activeCallRef.current;
    if (!call) return;
    
    stopRingtone();
    clearTimeout(callTimeoutRef.current);
    clearInterval(durationIntervalRef.current);
    
    try {
      const result = await pusherService.endCall(call.id);
      console.log('End call result:', result);
    } catch (err) {
      console.error('Failed to end call:', err);
    }
    
    audioService.playEnded();
    webrtcService.closeAllConnections();
    
    setActiveCall(null);
    setLocalStream(null);
    setRemoteStreams({});
    setIsMuted(false);
    setIsVideoOff(true);
    setIsScreenSharing(false);
    setCallDuration(0);
    setIsMinimized(false);
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webrtcService.toggleAudio(newMuted);
    
    const call = activeCallRef.current;
    if (call) {
      try {
        await pusherService.updateMediaState(call.id, { isMuted: newMuted });
      } catch (err) {
        console.error('Failed to update media state:', err);
      }
    }
  };

  const toggleVideo = async () => {
    const call = activeCallRef.current;
    
    try {
      if (isVideoOff) {
        const currentStream = localStreamRef.current;
        const existingVideoTracks = currentStream?.getVideoTracks() || [];
        const hasEnabledVideoTrack = existingVideoTracks.some(t => t.readyState === 'live');
        
        if (!hasEnabledVideoTrack) {
          const stream = await webrtcService.getLocalStream(true, true);
          
          setIsVideoOff(false);
          setLocalStream(stream);
          
          const needsRenegotiation = await webrtcService.updateLocalStream(stream);
          
          if (needsRenegotiation && call) {
            const peerIds = Array.from(webrtcService.peerConnections.keys());
            for (const peerId of peerIds) {
              try {
                const offer = await webrtcService.renegotiate(peerId);
                if (offer) {
                  await pusherService.sendOffer(call.id, peerId, offer);
                }
              } catch (err) {
                console.error('Failed to renegotiate with:', peerId, err);
              }
            }
          }
        } else {
          webrtcService.toggleVideo(false);
          setIsVideoOff(false);
        }
      } else {
        webrtcService.toggleVideo(true);
        setIsVideoOff(true);
      }
      
      if (call) {
        const newVideoOffState = !isVideoOff;
        await pusherService.updateMediaState(call.id, { isVideoOff: newVideoOffState });
      }
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  };

  const toggleScreenShare = async () => {
    const call = activeCallRef.current;
    
    try {
      if (isScreenSharing) {
        webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      }
      
      if (call) {
        await pusherService.updateMediaState(call.id, { 
          isScreenSharing: !isScreenSharing 
        });
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  // Handle Pusher call events (via user's private channel)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const handleRing = (call) => {
      console.log('Incoming call:', call);
      
      if (activeCallRef.current) {
        console.log('Already in a call, ignoring incoming call');
        return;
      }
      
      if (incomingCallRef.current?.id === call.id) {
        console.log('Already have this incoming call, ignoring duplicate');
        return;
      }
      
      setIncomingCall(call);
      playRingtone();
      
      callTimeoutRef.current = setTimeout(() => {
        const currentIncoming = incomingCallRef.current;
        if (currentIncoming?.id === call.id) {
          declineCall();
        }
      }, CALL_TIMEOUT);
    };

    const handleAccepted = async (data) => {
      console.log('Call accepted event received:', data);
      const call = activeCallRef.current;
      
      if (call?.id === data.callId) {
        setActiveCall(prev => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants?.map(p => 
            p.userId === data.userId ? { ...p, status: 'joined' } : p
          ) || [];
          
          const newStatus = prev.status === 'ringing' ? 'active' : prev.status;
          
          return { ...prev, participants: updatedParticipants, status: newStatus };
        });
        
        if (call.isInitiator && call.status === 'ringing') {
          stopRingtone();
          clearTimeout(callTimeoutRef.current);
          audioService.playConnected();
          startDurationTimer();
        }
        
        if (data.userId !== user?.id) {
          const existingPc = webrtcService.getPeerConnection(data.userId);
          if (!existingPc) {
            const shouldCreateOffer = user?.id > data.userId;
            
            if (shouldCreateOffer) {
              const currentStream = localStreamRef.current;
              if (currentStream) {
                webrtcService.setLocalStream(currentStream);
                
                try {
                  const offer = await webrtcService.createOffer(
                    data.userId,
                    (userId, candidate) => {
                      pusherService.sendIceCandidate(call.id, userId, candidate);
                    }
                  );
                  
                  await pusherService.sendOffer(call.id, data.userId, offer);
                } catch (err) {
                  console.error('Failed to create offer for accepted participant:', data.userId, err);
                }
              }
            }
          }
        }
      }
    };

    const handleParticipantJoined = async (data) => {
      console.log('Participant joined event received:', data);
      const call = activeCallRef.current;
      
      if (call?.id === data.callId && data.userId !== user?.id) {
        setActiveCall(prev => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants?.map(p => 
            p.userId === data.userId ? { ...p, status: 'joined' } : p
          ) || [];
          return { ...prev, participants: updatedParticipants };
        });
        
        const existingPc = webrtcService.getPeerConnection(data.userId);
        if (!existingPc) {
          const shouldCreateOffer = user?.id > data.userId;
          
          if (shouldCreateOffer) {
            const currentStream = localStreamRef.current;
            if (currentStream) {
              webrtcService.setLocalStream(currentStream);
              
              try {
                const offer = await webrtcService.createOffer(
                  data.userId,
                  (userId, candidate) => {
                    pusherService.sendIceCandidate(call.id, userId, candidate);
                  }
                );
                
                await pusherService.sendOffer(call.id, data.userId, offer);
              } catch (err) {
                console.error('Failed to create offer for new participant:', data.userId, err);
              }
            }
          }
        }
      }
    };

    const handleParticipantLeft = (data) => {
      console.log('Participant left event received:', data);
      const call = activeCallRef.current;
      
      if (call?.id === data.callId && data.userId !== user?.id) {
        webrtcService.closePeerConnection(data.userId);
        
        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[data.userId];
          return updated;
        });
        
        setActiveCall(prev => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants?.map(p => 
            p.userId === data.userId ? { ...p, status: 'left' } : p
          ) || [];
          return { ...prev, participants: updatedParticipants };
        });
      }
    };

    const handleDeclined = (data) => {
      console.log('Call declined:', data);
      const call = activeCallRef.current;
      const incoming = incomingCallRef.current;
      
      if (call?.id === data.callId) {
        stopRingtone();
        audioService.playEnded();
        
        clearTimeout(callTimeoutRef.current);
        clearInterval(durationIntervalRef.current);
        webrtcService.closeAllConnections();
        
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setActiveCall(null);
        setLocalStream(null);
        setRemoteStreams({});
        setCallDuration(0);
        setIsMinimized(false);
        setIsMuted(false);
        setIsVideoOff(true);
        setIsScreenSharing(false);
      }
      
      if (incoming?.id === data.callId) {
        stopRingtone();
        clearTimeout(callTimeoutRef.current);
        setIncomingCall(null);
      }
    };

    const handleParticipantDeclined = (data) => {
      console.log('Participant declined:', data);
      const call = activeCallRef.current;
      
      if (call?.id === data.callId) {
        setActiveCall(prev => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants?.map(p => 
            p.userId === data.userId ? { ...p, status: 'declined' } : p
          ) || [];
          return { ...prev, participants: updatedParticipants };
        });
      }
    };

    const handleEnded = (data) => {
      console.log('Call ended:', data);
      const call = activeCallRef.current;
      const incoming = incomingCallRef.current;
      
      if (call?.id === data.callId) {
        stopRingtone();
        clearInterval(durationIntervalRef.current);
        clearTimeout(callTimeoutRef.current);
        audioService.playEnded();
        webrtcService.closeAllConnections();
        
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setActiveCall(null);
        setLocalStream(null);
        setRemoteStreams({});
        setCallDuration(0);
        setIsMinimized(false);
        setIsMuted(false);
        setIsVideoOff(true);
        setIsScreenSharing(false);
      }
      
      if (incoming?.id === data.callId) {
        stopRingtone();
        clearTimeout(callTimeoutRef.current);
        setIncomingCall(null);
      }
    };

    const handleOffer = async (data) => {
      console.log('Received offer from:', data.fromUserId);
      const call = activeCallRef.current;
      
      if (call?.id === data.callId) {
        const existingPc = webrtcService.getPeerConnection(data.fromUserId);
        const isRenegotiation = existingPc && 
          (existingPc.connectionState === 'connected' || existingPc.signalingState === 'stable');
        
        if (isRenegotiation) {
          try {
            const answer = await webrtcService.handleRenegotiationOffer(data.fromUserId, data.offer);
            if (answer) {
              await pusherService.sendAnswer(data.callId, data.fromUserId, answer);
            }
          } catch (err) {
            console.error('Failed to handle renegotiation offer:', err);
          }
          return;
        }
        
        if (call.status === 'ringing' || call.isInitiator) {
          stopRingtone();
          clearTimeout(callTimeoutRef.current);
          audioService.playConnected();
          
          if (!durationIntervalRef.current) {
            startDurationTimer();
          }
          
          setActiveCall(prev => ({ ...prev, status: 'active' }));
        }
        
        try {
          const currentStream = localStreamRef.current;
          if (currentStream) {
            webrtcService.setLocalStream(currentStream);
          }
          
          const answer = await webrtcService.handleOffer(
            data.fromUserId,
            data.offer,
            (userId, candidate) => {
              pusherService.sendIceCandidate(data.callId, userId, candidate);
            }
          );
          
          await pusherService.sendAnswer(data.callId, data.fromUserId, answer);
        } catch (err) {
          console.error('Failed to handle offer:', err);
        }
      }
    };

    const handleAnswer = async (data) => {
      console.log('Received answer from:', data.fromUserId);
      const call = activeCallRef.current;
      
      if (call?.id === data.callId) {
        try {
          const pc = webrtcService.getPeerConnection(data.fromUserId);
          
          if (!pc) {
            console.error('No peer connection found for:', data.fromUserId);
            return;
          }
          
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } else {
            console.warn('Unexpected signaling state for answer:', pc.signalingState);
          }
        } catch (err) {
          console.error('Failed to handle answer:', err);
        }
      }
    };

    const handleIceCandidate = async (data) => {
      const call = activeCallRef.current;
      
      if (call?.id === data.callId) {
        try {
          await webrtcService.handleIceCandidate(data.fromUserId, data.candidate);
        } catch (err) {
          console.error('Failed to handle ICE candidate:', err);
        }
      }
    };

    const handleMediaState = (data) => {
      const call = activeCallRef.current;
      
      if (call?.id === data.callId) {
        setActiveCall(prev => ({
          ...prev,
          participants: prev?.participants?.map(p => 
            p.userId === data.userId 
              ? { ...p, isMuted: data.isMuted, isVideoOff: data.isVideoOff, isScreenSharing: data.isScreenSharing }
              : p
          )
        }));
        
        setRemoteStreams(prev => ({ ...prev }));
      }
    };

    // Set up remote stream handler
    webrtcService.onRemoteStream = (userId, stream) => {
      console.log('Remote stream received from:', userId);
      setRemoteStreams(prev => ({ ...prev, [userId]: stream }));
    };

    webrtcService.onConnectionStateChange = (userId, state) => {
      console.log('Connection state changed for', userId, ':', state);
    };

    // Bind all call events to the user's private channel via pusherService.on()
    const unsubRing = pusherService.on('call:ring', handleRing);
    const unsubAccepted = pusherService.on('call:accepted', handleAccepted);
    const unsubDeclined = pusherService.on('call:declined', handleDeclined);
    const unsubParticipantDeclined = pusherService.on('call:participant-declined', handleParticipantDeclined);
    const unsubEnded = pusherService.on('call:ended', handleEnded);
    const unsubOffer = pusherService.on('call:offer', handleOffer);
    const unsubAnswer = pusherService.on('call:answer', handleAnswer);
    const unsubIce = pusherService.on('call:ice-candidate', handleIceCandidate);
    const unsubMedia = pusherService.on('call:media-state', handleMediaState);
    const unsubParticipantJoined = pusherService.on('call:participant-joined', handleParticipantJoined);
    const unsubParticipantLeft = pusherService.on('call:participant-left', handleParticipantLeft);

    return () => {
      unsubRing();
      unsubAccepted();
      unsubDeclined();
      unsubParticipantDeclined();
      unsubEnded();
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubMedia();
      unsubParticipantJoined();
      unsubParticipantLeft();
      clearTimeout(callTimeoutRef.current);
      clearInterval(durationIntervalRef.current);
      stopRingtone();
    };
  }, [isAuthenticated, user?.id, playRingtone, stopRingtone, startDurationTimer]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value = {
    activeCall,
    incomingCall,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    callDuration,
    isMinimized,
    isInCall: !!activeCall,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    setIsMinimized
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

export default CallContext;
