import React from 'react';
import { Ghost, Activity } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import useWebSocket from './hooks/useWebSocket';
import useWebRTC from './hooks/useWebRTC';
import { UserIdDisplay } from './components/UserIdDisplay';
import { OnlineUsers } from './components/OnlineUsers';
import { ConnectionControls } from './components/ConnectionControls';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { AudioControls } from './components/AudioControls';
import { CallOverlay } from './components/CallOverlay';
import { Card } from './components/ui/card';
import { GlitchText } from './components/ui/GlitchText';
import { LivingBackground } from './components/ui/LivingBackground';
import './App.css';

function App() {
  const {
    isConnected,
    userId,
    onlineUsers,
    messages,
    partnerId,
    status,
    error,
    findRandom,
    connectToUser,
    sendChatMessage,
    sendWebRTCSignal,
    disconnectChat,
    cancelSearch,
    wsRef
  } = useWebSocket();

  const {
    isCallActive,
    isMuted,
    isRemoteAudioPlaying,
    callError,
    startCall,
    endCall,
    toggleMute,
    remoteAudioRef
  } = useWebRTC(partnerId, sendWebRTCSignal, wsRef);

  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  React.useEffect(() => {
    if (callError) {
      toast.error(callError);
    }
  }, [callError]);

  React.useEffect(() => {
    if (partnerId && !isCallActive) {
      toast.success('Match found! You can now start a voice call.');
    }
  }, [partnerId, isCallActive]);

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden" data-testid="app-container">
      {/* Living Background */}
      <LivingBackground />

      {/* Noise overlay */}
      <div className="fixed inset-0 z-10 opacity-[0.05] pointer-events-none noise-texture" />

      {/* Call Overlay */}
      {isCallActive && (
        <CallOverlay
          isMuted={isMuted}
          onEndCall={endCall}
          onToggleMute={toggleMute}
        />
      )}

      {/* Main Content */}
      <div className="relative z-20 h-screen flex flex-col p-4 md:p-8 gap-4">
        {/* Header */}
        <header className="flex items-center justify-between" data-testid="app-header">
          <div className="flex items-center gap-3">
            <Ghost className="h-8 w-8 text-[var(--accent-cyan)] animate-pulse-glow" />
            <div>
              <div className="text-3xl md:text-4xl font-bold tracking-tighter text-[var(--text-primary)] font-['Space_Grotesk']">
                <GlitchText text="Ghost Protocol" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Anonymous • Encrypted • Ephemeral</p>
            </div>
          </div>

          {userId && <UserIdDisplay userId={userId} />}
        </header>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          {/* Sidebar - Online Users */}
          <aside className="lg:col-span-3 h-[300px] lg:h-auto" data-testid="sidebar">
            <OnlineUsers
              users={onlineUsers}
              currentUserId={userId}
              onConnect={connectToUser}
              disabled={status !== 'available'}
            />
          </aside>

          {/* Main Chat Area */}
          <main className="lg:col-span-9 flex flex-col gap-4 overflow-hidden" data-testid="main-chat">
            {/* Connection Status Bar */}
            <Card className="bg-gray-950/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-4 transition-all duration-300 hover:border-cyan-500/20">
              <ConnectionControls
                status={status}
                onFindRandom={findRandom}
                onDisconnect={disconnectChat}
                onCancelSearch={cancelSearch}
              />
            </Card>

            {/* Chat Messages */}
            <Card className="bg-gray-950/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-6 flex-1 flex flex-col min-h-0 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyan-900/5 pointer-events-none group-hover:opacity-100 transition-opacity opacity-0"></div>

              {status === 'connected' ? (
                <>
                  <div className="flex items-center justify-between mb-4 z-10">
                    <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-full border border-white/5">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                      </div>
                      <span className="text-xs font-mono tracking-wide text-emerald-400/80 uppercase">Secure Link Established</span>
                    </div>

                    {!isCallActive && (
                      <div className="flex items-center gap-2">
                        <AudioControls
                          isCallActive={isCallActive}
                          isMuted={isMuted}
                          isRemoteAudioPlaying={isRemoteAudioPlaying}
                          callError={callError}
                          onStartCall={() => startCall(true)}
                          onEndCall={endCall}
                          onToggleMute={toggleMute}
                          disabled={false}
                        />
                      </div>
                    )}
                  </div>

                  <ChatMessages messages={messages} userId={userId} />

                  <div className="mt-4 pt-4 border-t border-white/5 z-10">
                    <ChatInput
                      onSend={sendChatMessage}
                      disabled={status !== 'connected'}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center" data-testid="waiting-state">
                  <div className="text-center space-y-6">
                    <div className="relative inline-block">
                      <Ghost className="h-20 w-20 mx-auto text-[var(--accent-cyan)] opacity-20 animate-float" />
                      <div className="absolute inset-0 blur-2xl bg-cyan-500/10 rounded-full"></div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-300 mb-2 font-['Space_Grotesk'] tracking-wide">
                        {status === 'searching' ? <GlitchText text="SCANNING NETWORK..." /> :
                          status === 'available' ? 'SYSTEM READY' :
                            'INITIALIZING...'}
                      </h3>
                      <p className="text-sm text-cyan-500/60 font-mono">
                        {status === 'available' && 'Awaiting Input: Initiate "Find Random" Sequence'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </main>
        </div>

        {/* Connection Status Indicator */}
        {!isConnected && (
          <div className="fixed top-4 right-4 bg-red-950/90 backdrop-blur-xl border border-red-500/50 rounded-lg px-6 py-3 text-red-400 font-mono text-xs shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-slide-in-right z-50 flex items-center gap-3">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>CONNECTION SEVERED</span>
          </div>
        )}
      </div>

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />

      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(5, 5, 5, 0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(34, 211, 238, 0.1)',
            color: '#F9FAFB',
            fontFamily: 'Space Grotesk, sans-serif',
          },
          className: 'shadow-[0_0_20px_rgba(0,0,0,0.5)]',
        }}
      />
    </div>
  );
}

export default App;