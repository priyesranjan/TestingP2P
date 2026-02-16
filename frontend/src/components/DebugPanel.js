import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

export const DebugPanel = ({ rtcStats, isCallActive }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isCallActive) return null;

    const getStatusColor = (status) => {
        if (['connected', 'stable', 'completed'].includes(status)) return 'text-emerald-400';
        if (['failed', 'disconnected', 'closed'].includes(status)) return 'text-red-400';
        if (['checking', 'new'].includes(status)) return 'text-amber-400';
        return 'text-gray-400';
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <div
                className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl w-64"
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-3 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
                >
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                        <Activity className="w-3 h-3" />
                        <span>NET_DIAGNOSTICS</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronUp className="w-3 h-3 text-gray-500" />}
                </button>

                {isExpanded && (
                    <div className="p-4 space-y-3 font-mono text-[10px] text-gray-300">
                        <div className="space-y-1">
                            <span className="text-gray-500 uppercase tracking-wider">Connection State</span>
                            <div className={`font-bold ${getStatusColor(rtcStats.connectionState)}`}>
                                {rtcStats.connectionState.toUpperCase()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-gray-500 uppercase tracking-wider">ICE State (Network)</span>
                            <div className={`font-bold ${getStatusColor(rtcStats.iceConnectionState)}`}>
                                {rtcStats.iceConnectionState.toUpperCase()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-gray-500 uppercase tracking-wider">Signaling State</span>
                            <div className={`font-bold ${getStatusColor(rtcStats.signalingState)}`}>
                                {rtcStats.signalingState.toUpperCase()}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/10 flex justify-between">
                            <span className="text-gray-500">ICE Candidates</span>
                            <span className="text-cyan-400">{rtcStats.iceCandidateCount}</span>
                        </div>

                        <div className="text-[9px] text-gray-600 italic pt-1">
                            If ICE State stays "CHECKING", it is a firewall issue.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
