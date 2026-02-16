import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { MagneticButton } from './ui/MagneticButton';
import { Input } from './ui/input';

export const ChatInput = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" data-testid="chat-input-form">
      <Input
        data-testid="message-input"
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
        maxLength={1000}
        className="bg-black/20 border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-sm placeholder:text-gray-700 rounded-lg h-12 flex-1"
      />
      <MagneticButton
        data-testid="send-message-button"
        type="submit"
        disabled={disabled || !message.trim()}
        className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] px-6 h-12 rounded-lg"
      >
        <Send className="h-5 w-5" />
      </MagneticButton>
    </form>
  );
};

export default ChatInput;