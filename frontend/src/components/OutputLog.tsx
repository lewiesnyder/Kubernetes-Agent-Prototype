import React, { useEffect, useState, ReactElement } from 'react';
import { EventType } from '../types';

interface OutputLogProps {
  type: string;
  content: string;
}

const OutputLog: React.FC<OutputLogProps> = ({ type, content }) => {
  const [processedContent, setProcessedContent] = useState<string | React.ReactNode>(content);
  const logClass = type === EventType.Stderr ? 'output-log stderr' : 'output-log stdout';

  // Helper function to check if a string is a data URL
  const isDataUrl = (str: string) => {
    return str.trim().startsWith('data:');
  };

  // Helper to determine if a data URL is an image
  const isImageDataUrl = (dataUrl: string) => {
    return dataUrl.startsWith('data:image/');
  };

  // Process content when it changes
  useEffect(() => {
    processContent();
  }, [content]);

  // Helper to extract content from simple data URLs in the text
  const processContent = () => {
    // If content is empty or undefined, show a placeholder
    if (!content || content.trim() === '') {
      setProcessedContent('No output available');
      return;
    }

    // If content isn't a data URL and doesn't include any, just return it as is
    if (!content.includes('data:')) {
      setProcessedContent(content);
      return;
    }

    // Attempt to find data URLs in the content
    const regex = /(data:[^\s]+)/g;
    let match;

    // Find all data URLs in the content
    const matches = Array.from(content.matchAll(regex));
    
    if (matches.length === 0) {
      setProcessedContent(content);
      return;
    }

    // If content is only a data URL (nothing before or after), render it specially
    if (matches.length === 1 && matches[0].index === 0 && matches[0][0].length === content.trim().length) {
      const dataUrl = matches[0][0];
      if (isImageDataUrl(dataUrl)) {
        const element = (
          <div className="data-url-container">
            <img src={dataUrl} alt="Generated content" className="data-url-image" />
          </div>
        );
        setProcessedContent(element);
      } else {
        const element = (
          <div className="data-url-container">
            <a href={dataUrl} target="_blank" rel="noopener noreferrer" className="data-url-link">
              Open Generated Content in New Tab
            </a>
          </div>
        );
        setProcessedContent(element);
      }
      return;
    }
    
    // Handle content with embedded data URLs
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
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
    
    setProcessedContent(parts);
  };

  return (
    <div className={logClass}>
      {processedContent}
    </div>
  );
};

export default OutputLog;