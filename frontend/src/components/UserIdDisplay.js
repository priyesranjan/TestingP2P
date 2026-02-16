import React from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export const UserIdDisplay = ({ userId }) => {
  const [copied, setCopied] = React.useState(false);

  const truncateId = (id) => {
    if (!id) return 'Connecting...';
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const copyToClipboard = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success('User ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-black/30 border border-cyan-500/20 rounded-lg px-4 py-2" data-testid="user-id-display">
      <span className="text-xs text-gray-500 uppercase tracking-wider">Your ID:</span>
      <code className="font-mono text-sm text-cyan-400 tracking-widest" data-testid="user-id-value">
        {truncateId(userId)}
      </code>
      <Button
        data-testid="copy-id-button"
        onClick={copyToClipboard}
        variant="ghost"
        size="sm"
        className="ml-auto h-6 w-6 p-0 hover:bg-white/5 text-gray-400 hover:text-cyan-400 transition-colors"
      >
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default UserIdDisplay;