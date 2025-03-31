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
      <div className="thinking-text">
        <span className="tool-execution-label">Executing tool:</span>
        <span className="tool-name">{toolName}</span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;