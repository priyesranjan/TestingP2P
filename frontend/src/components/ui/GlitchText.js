import React from 'react';
import './GlitchText.css';

export const GlitchText = ({ text, className = '' }) => {
  return (
    <div className={`glitch-wrapper ${className}`}>
      <div className="glitch" data-text={text}>
        {text}
      </div>
    </div>
  );
};
