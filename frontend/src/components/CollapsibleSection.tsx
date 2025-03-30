import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="tool-execution">
      <div className="tool-header" onClick={toggleExpanded}>
        <span className={isExpanded ? 'chevron down' : 'chevron right'}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <div className="tool-name">{title}</div>
      </div>
      <div className={`tool-content ${isExpanded ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;