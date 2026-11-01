import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownWithDataUrlProps {
  content: string;
}

const MarkdownWithDataUrl: React.FC<MarkdownWithDataUrlProps> = ({ content }) => {
  // Check if content contains data URLs
  if (content.trim().includes('data:')) {
    // Check if it's only a single data URL
    if (content.trim().startsWith('data:') && !content.includes(' ')) {
      if (content.startsWith('data:image/')) {
        return (
          <img 
            src={content} 
            alt="Generated output" 
            className="output-image" 
          />
        );
      } else {
        return (
          <a 
            href={content} 
            target="_blank" 
            rel="noopener noreferrer"
            className="output-link"
          >
            Download File
          </a>
        );
      }
    }

    // Handle mixed content with data URLs and text
    const parts = content.split(/(\s+)/);
    return (
      <div className="markdown-with-data-url">
        {parts.map((part, index) => {
          if (part.trim().startsWith('data:image/')) {
            return (
              <img 
                key={index}
                src={part} 
                alt="Generated content" 
                className="output-image" 
              />
            );
          } else if (part.trim().startsWith('data:')) {
            return (
              <a 
                key={index}
                href={part} 
                target="_blank" 
                rel="noopener noreferrer"
                className="output-link"
              >
                Download File
              </a>
            );
          } else if (part.trim().length > 0) {
            // For non-data URL text segments, render as markdown
            return (
              <span key={index} className="markdown-segment">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part}
                </ReactMarkdown>
              </span>
            );
          } else {
            // Preserve whitespace
            return <span key={index}>{part}</span>;
          }
        })}
      </div>
    );
  }

  // If no data URLs, just render the entire content as markdown
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownWithDataUrl; 