import React from 'react';

interface ThinkingIndicatorProps {
  toolName: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ toolName }) => {
  return (
    <div className="thinking">
      <div className="thinking-dots">
        <div className="thinking-dot"></div>
        <div className="thinking-dot"></div>
        <div className="thinking-dot"></div>
      </div>
      <span style={{ marginLeft: '10px' }}>Executing tool: {toolName}</span>
    </div>
  );
};

export default ThinkingIndicator;