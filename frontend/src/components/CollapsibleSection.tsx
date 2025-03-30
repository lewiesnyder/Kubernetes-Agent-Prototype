import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="collapsible-section">
      <div className={`collapsible-header ${isExpanded ? 'open' : ''}`} onClick={toggleExpanded}>
        <div className="collapsible-title">{title}</div>
        <div className={`collapsible-icon ${isExpanded ? 'open' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>
      <div className={`collapsible-content ${isExpanded ? 'open' : ''}`} 
           style={{ maxHeight: isExpanded ? '500px' : '0' }}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;