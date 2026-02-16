import React from 'react';
import { Mic, MicOff, PhoneOff, Activity } from 'lucide-react';
import { MagneticButton } from './ui/MagneticButton';
import { GlitchText } from './ui/GlitchText';

export const CallOverlay = ({ isMuted, onEndCall, onToggleMute }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Holographic Border */}
            <div className="absolute inset-4 border border-cyan-500/30 rounded-3xl border-dashed opacity-50 pointer-events-none"></div>

            <div className="flex flex-col items-center gap-12 w-full max-w-md p-8 relative">
                {/* Animated Rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="w-64 h-64 border border-cyan-500 rounded-full animate-ping"></div>
                    <div className="w-48 h-48 border border-fuchsia-500 rounded-full animate-ping delay-75"></div>
                </div>

                {/* Status Text */}
                <div className="space-y-2 text-center z-10">
                    <div className="text-4xl font-bold font-['Space_Grotesk'] text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                        <GlitchText text="VOICE LINK ACTIVE" />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-fuchsia-400 font-mono text-sm tracking-widest animate-pulse">
                        <Activity className="w-4 h-4" />
                        <span>ENCRYPTED STREAM::STABLE</span>
                    </div>
                </div>

                {/* Audio Visualizer (Fake CSS for visual effect) */}
                <div className="flex items-end justify-center gap-1 h-16 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 bg-gradient-to-t from-cyan-500 to-fuchsia-500 rounded-t-full animate-bounce"
                            style={{
                                height: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '0.8s'
                            }}
                        ></div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-8 z-10">
                    <MagneticButton
                        onClick={onToggleMute}
                        className={`p-6 rounded-full border-2 transition-all ${isMuted
                                ? 'bg-red-950/50 border-red-500 text-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                                : 'bg-cyan-950/50 border-cyan-500 text-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                            }`}
                    >
                        {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </MagneticButton>

                    <MagneticButton
                        onClick={onEndCall}
                        className="p-6 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] border-2 border-red-400"
                    >
                        <PhoneOff className="w-8 h-8" />
                    </MagneticButton>
                </div>
            </div>
        </div>
    );
};
