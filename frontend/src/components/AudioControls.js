import React from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { MagneticButton } from './ui/MagneticButton';

export const AudioControls = ({
  isCallActive,
  isMuted,
  isRemoteAudioPlaying,
  callError,
  onStartCall,
  onEndCall,
  onToggleMute,
  disabled
}) => {
  return (
    <div className="flex items-center gap-3">
      {callError && (
        <span className="text-xs text-red-400" data-testid="call-error">{callError}</span>
      )}

      {!isCallActive ? (
        <MagneticButton
          data-testid="start-call-button"
          onClick={onStartCall}
          disabled={disabled}
          className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] rounded-full p-3 h-12 w-12 flex items-center justify-center"
        >
          <Phone className="h-5 w-5" />
        </MagneticButton>
      ) : (
        <>
          <MagneticButton
            data-testid="toggle-mute-button"
            onClick={onToggleMute}
            className={`${isMuted ? 'bg-amber-950/50 border-amber-500/30 text-amber-400' : 'bg-cyan-950/50 border-cyan-500/30 text-cyan-400'} border hover:bg-cyan-900/50 hover:border-cyan-400 rounded-full p-3 h-12 w-12 flex items-center justify-center`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </MagneticButton>

          {isRemoteAudioPlaying && (
            <div className="flex items-center gap-1" data-testid="audio-visualizer">
              <div className="w-1 bg-cyan-500 rounded-full animate-pulse" style={{ height: '12px' }}></div>
              <div className="w-1 bg-cyan-500 rounded-full animate-pulse" style={{ height: '18px', animationDelay: '0.1s' }}></div>
              <div className="w-1 bg-cyan-500 rounded-full animate-pulse" style={{ height: '14px', animationDelay: '0.2s' }}></div>
              <div className="w-1 bg-cyan-500 rounded-full animate-pulse" style={{ height: '20px', animationDelay: '0.15s' }}></div>
            </div>
          )}

          <MagneticButton
            data-testid="end-call-button"
            onClick={onEndCall}
            className="bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-900/50 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] rounded-full p-3 h-12 w-12 flex items-center justify-center"
          >
            <PhoneOff className="h-5 w-5" />
          </MagneticButton>
        </>
      )}
    </div>
  );
};

export default AudioControls;