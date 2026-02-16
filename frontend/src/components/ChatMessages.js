import React, { useEffect, useRef } from 'react';
import { ScrollArea } from './ui/scroll-area';

export const ChatMessages = ({ messages, userId }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollArea className="flex-1 -mr-4 pr-4" ref={scrollRef} data-testid="chat-messages">
      <div className="space-y-6 pb-4 pt-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4 py-12" data-testid="no-messages">
            <div className="w-16 h-16 border border-cyan-500/30 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-full"></div>
            </div>
            <p className="text-cyan-500/50 font-mono text-sm tracking-widest uppercase">Encryption Channel Open</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} group animate-slide-up`}
            >
              <div
                className={`max-w-[80%] relative p-4 transition-all duration-300 hover:scale-[1.02] ${msg.isMine
                    ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-r-2 border-cyan-500 rounded-l-xl rounded-tr-xl'
                    : 'bg-gradient-to-br from-fuchsia-950/80 to-purple-950/80 border-l-2 border-fuchsia-500 rounded-r-xl rounded-tl-xl'
                  } backdrop-blur-md shadow-lg hover:shadow-cyan-500/10`}
              >
                {/* Decorative corner accents */}
                <div className={`absolute top-0 w-2 h-2 border-t border-${msg.isMine ? 'cyan' : 'fuchsia'}-500/50 ${msg.isMine ? 'right-0 border-r' : 'left-0 border-l'}`}></div>
                <div className={`absolute bottom-0 w-2 h-2 border-b border-${msg.isMine ? 'cyan' : 'fuchsia'}-500/50 ${msg.isMine ? 'left-0 border-l' : 'right-0 border-r'}`}></div>

                <p className={`text-md leading-relaxed break-words font-sans ${msg.isMine ? 'text-cyan-50' : 'text-fuchsia-50'} text-shadow-sm`}>
                  {msg.text}
                </p>

                <div className={`flex items-center gap-2 mt-2 ${msg.isMine ? 'justify-end' : 'justify-start'} opacity-60 group-hover:opacity-100 transition-opacity`}>
                  <span className={`text-[10px] font-mono tracking-wider ${msg.isMine ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.isMine && <span className="text-[10px] text-cyan-500">◈ SENT</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;