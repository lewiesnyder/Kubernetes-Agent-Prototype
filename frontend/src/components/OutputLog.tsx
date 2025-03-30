import React from 'react';
import { EventType } from '../types';

interface OutputLogProps {
  type: string;
  content: string;
}

const OutputLog: React.FC<OutputLogProps> = ({ type, content }) => {
  const logClass = type === EventType.Stderr ? 'output-log stderr' : 'output-log stdout';

  // Helper function to check if a string is a data URL
  const isDataUrl = (str: string) => {
    return str.trim().startsWith('data:');
  };

  // Helper to determine if a data URL is an image
  const isImageDataUrl = (dataUrl: string) => {
    return dataUrl.startsWith('data:image/');
  };

  // Helper to extract content from simple data URLs in the text
  const renderContent = () => {
    // If content isn't a data URL, just return it as is
    if (!content.includes('data:')) {
      return content;
    }

    // Attempt to find data URLs in the content
    const regex = /(data:[^\s]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    // Find all data URLs in the content
    const matches = Array.from(content.matchAll(regex));
    
    if (matches.length === 0) {
      return content;
    }

    // If content is only a data URL (nothing before or after), render it specially
    if (matches.length === 1 && matches[0].index === 0 && matches[0][0].length === content.trim().length) {
      const dataUrl = matches[0][0];
      if (isImageDataUrl(dataUrl)) {
        return (
          <div className="data-url-container">
            <img src={dataUrl} alt="Generated content" className="data-url-image" />
          </div>
        );
      } else {
        return (
          <div className="data-url-container">
            <a href={dataUrl} target="_blank" rel="noopener noreferrer" className="data-url-link">
              Open Generated Content in New Tab
            </a>
          </div>
        );
      }
    }
    
    // Handle content with embedded data URLs
    while ((match = regex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const dataUrl = match[0];
      if (isImageDataUrl(dataUrl)) {
        parts.push(
          <img 
            key={match.index} 
            src={dataUrl} 
            alt="Inline generated content" 
            className="inline-data-url-image" 
          />
        );
      } else {
        parts.push(
          <a 
            key={match.index} 
            href={dataUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="data-url-link"
          >
            Open Generated Content
          </a>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining content after the last match
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts;
  };

  return (
    <div className={logClass}>
      {renderContent()}
    </div>
  );
};

export default OutputLog;