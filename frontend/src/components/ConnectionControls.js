import React from 'react';
import { Shuffle, X, Loader2 } from 'lucide-react';
import { MagneticButton } from './ui/MagneticButton';

export const ConnectionControls = ({ status, onFindRandom, onDisconnect, onCancelSearch }) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'searching':
        return (
          <div className="flex items-center gap-2" data-testid="searching-status">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            <span className="text-sm text-gray-400">Searching for a partner...</span>
          </div>
        );
      case 'connected':
        return (
          <div className="flex items-center gap-2" data-testid="connected-status">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
            <span className="text-sm text-emerald-400">Connected</span>
          </div>
        );
      case 'available':
        return (
          <div className="flex items-center gap-2" data-testid="available-status">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span className="text-sm text-gray-400">Available</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2" data-testid="disconnected-status">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-400">Disconnected</span>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {getStatusDisplay()}

      <div className="flex items-center gap-2">
        {status === 'available' && (
          <MagneticButton
            data-testid="find-random-button"
            onClick={onFindRandom}
            className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] px-4 py-2 rounded-md"
          >
            <div className="flex items-center">
              <Shuffle className="h-4 w-4 mr-2" />
              Find Random
            </div>
          </MagneticButton>
        )}

        {status === 'searching' && (
          <MagneticButton
            data-testid="cancel-search-button"
            onClick={onCancelSearch}
            className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-950/50 hover:border-red-400 px-4 py-2 rounded-md"
          >
            <div className="flex items-center">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </div>
          </MagneticButton>
        )}

        {status === 'connected' && (
          <MagneticButton
            data-testid="disconnect-button"
            onClick={onDisconnect}
            className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-950/50 hover:border-red-400 px-4 py-2 rounded-md"
          >
            <div className="flex items-center">
              <X className="h-4 w-4 mr-2" />
              Disconnect
            </div>
          </MagneticButton>
        )}
      </div>
    </div>
  );
};

export default ConnectionControls;