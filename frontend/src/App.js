import React from 'react';
import { Ghost } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import useWebSocket from './hooks/useWebSocket';
import useWebRTC from './hooks/useWebRTC';
import { UserIdDisplay } from './components/UserIdDisplay';
import { OnlineUsers } from './components/OnlineUsers';
import { ConnectionControls } from './components/ConnectionControls';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { AudioControls } from './components/AudioControls';
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
            <Card className="bg-gray-950/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-4">
              <ConnectionControls
                status={status}
                onFindRandom={findRandom}
                onDisconnect={disconnectChat}
                onCancelSearch={cancelSearch}
              />
            </Card>

            {/* Chat Messages */}
            <Card className="bg-gray-950/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-6 flex-1 flex flex-col min-h-0">
              {status === 'connected' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                      <span className="text-sm text-gray-400">Chatting with stranger</span>
                    </div>
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

                  <ChatMessages messages={messages} userId={userId} />

                  <div className="mt-4 pt-4 border-t border-white/5">
                    <ChatInput
                      onSend={sendChatMessage}
                      disabled={status !== 'connected'}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center" data-testid="waiting-state">
                  <div className="text-center space-y-4">
                    <Ghost className="h-16 w-16 mx-auto text-[var(--accent-cyan)] opacity-30" />
                    <div>
                      <h3 className="text-xl font-medium text-gray-400 mb-2">
                        {status === 'searching' ? <GlitchText text="Searching..." /> :
                          status === 'available' ? 'Ready to connect' :
                            'Connecting...'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {status === 'available' && 'Click "Find Random" or select a user from the sidebar'}
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
          <div className="fixed top-4 right-4 bg-red-950/80 backdrop-blur-xl border border-[var(--accent-red)]/30 rounded-lg px-4 py-2 text-[var(--accent-red)] text-sm" data-testid="connection-error">
            Disconnected from server
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
            background: 'rgba(11, 18, 33, 0.9)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#F9FAFB',
          },
        }}
      />
    </div>
  );
}

export default App;