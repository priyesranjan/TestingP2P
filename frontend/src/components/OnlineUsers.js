import React from 'react';
import { Users, Radio } from 'lucide-react';
import { Card } from './ui/card';
import { MagneticButton } from './ui/MagneticButton';
import { ScrollArea } from './ui/scroll-area';

export const OnlineUsers = ({ users, currentUserId, onConnect, disabled }) => {
  const availableUsers = users.filter(u =>
    u.userId !== currentUserId && u.status === 'available'
  );

  const truncateId = (id) => {
    if (!id) return '';
    return `${id.slice(0, 8)}...${id.slice(-4)}`;
  };

  return (
    <Card className="bg-gray-950/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-4 h-full flex flex-col" data-testid="online-users-panel">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="h-5 w-5 text-cyan-400" />
        <h3 className="text-xl font-medium text-gray-100 font-['Space_Grotesk']">
          Online
        </h3>
        <span className="ml-auto text-sm font-mono text-cyan-400" data-testid="online-count">
          {users.length}
        </span>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="space-y-2">
          {availableUsers.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8" data-testid="no-users-message">
              No available users
            </div>
          ) : (
            availableUsers.map((user) => (
              <div
                key={user.userId}
                data-testid={`user-item-${user.userId}`}
                className="bg-black/20 border border-white/5 rounded-lg p-3 hover:border-cyan-500/30 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                        user.status === 'busy' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' :
                          'bg-gray-700'
                      }`}></div>
                    <span className="text-xs font-mono text-gray-400 truncate" title={user.userId}>
                      {truncateId(user.userId)}
                    </span>
                  </div>
                  <MagneticButton
                    data-testid={`connect-button-${user.userId}`}
                    onClick={() => onConnect(user.userId)}
                    disabled={disabled}
                    className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-xs px-3 py-1 h-auto opacity-0 group-hover:opacity-100 rounded-md"
                  >
                    <Users className="h-3 w-3" />
                  </MagneticButton>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default OnlineUsers;