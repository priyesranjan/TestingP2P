import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const useWebRTC = (partnerId, sendSignal, wsRef) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteAudioPlaying, setIsRemoteAudioPlaying] = useState(false);
  const [callError, setCallError] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const createPeerConnection = useCallback(() => {
    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Remote track received');
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          setIsRemoteAudioPlaying(true);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          setCallError('Connection failed. Please try again.');
          endCall();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    } catch (err) {
      console.error('Failed to create peer connection:', err);
      setCallError('Failed to initialize call');
      return null;
    }
  }, [sendSignal]);

  const startCall = useCallback(async (isInitiator = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      if (!pc) return;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({
          type: 'offer',
          sdp: offer
        });
      }

      setIsCallActive(true);
      setCallError(null);
    } catch (err) {
      console.error('Failed to start call:', err);
      if (err.name === 'NotAllowedError') {
        setCallError('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setCallError('No microphone found. Please connect a microphone.');
      } else {
        setCallError('Failed to start call. Please try again.');
      }
    }
  }, [createPeerConnection, sendSignal]);

  const endCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setIsCallActive(false);
    setIsRemoteAudioPlaying(false);
    setIsMuted(false);
    pendingCandidatesRef.current = [];
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const handleSignal = useCallback(async (signal) => {
    try {
      const pc = peerConnectionRef.current;

      if (signal.type === 'offer') {
        if (!pc) {
          await startCall(false);
        }
        
        const currentPc = peerConnectionRef.current;
        if (currentPc) {
          await currentPc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);
          sendSignal({
            type: 'answer',
            sdp: answer
          });

          pendingCandidatesRef.current.forEach(candidate => {
            currentPc.addIceCandidate(new RTCIceCandidate(candidate));
          });
          pendingCandidatesRef.current = [];
        }
      } else if (signal.type === 'answer') {
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          pendingCandidatesRef.current.forEach(candidate => {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
          });
          pendingCandidatesRef.current = [];
        }
      } else if (signal.type === 'ice-candidate') {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error('Failed to handle signal:', err);
      setCallError('Connection error occurred');
    }
  }, [startCall, sendSignal]);

  useEffect(() => {
    if (!partnerId) {
      endCall();
    }
  }, [partnerId, endCall]);

  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'webrtc_signal') {
          handleSignal(data.signal);
        }
      } catch (err) {
        console.error('Failed to handle WebRTC message:', err);
      }
    };

    wsRef.current.addEventListener('message', handleMessage);

    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, [wsRef, handleSignal]);

  return {
    isCallActive,
    isMuted,
    isRemoteAudioPlaying,
    callError,
    startCall,
    endCall,
    toggleMute,
    remoteAudioRef
  };
};

export default useWebRTC;