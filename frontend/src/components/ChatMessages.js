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
      <div className="space-y-3 pb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8" data-testid="no-messages">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} animate-slide-up`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  msg.isMine
                    ? 'bg-cyan-950/50 border border-cyan-500/30 text-cyan-50'
                    : 'bg-gray-900/50 border border-white/10 text-gray-100'
                }`}
              >
                <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;