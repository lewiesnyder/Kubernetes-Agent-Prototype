import React, { useState, useRef, useEffect } from 'react';

interface Conversation {
  id: number;
  title: string;
  timestamp: number;
  messages: Array<{ role: string; content: string }>;
}

interface ConversationHistoryProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onRenameConversation: (id: number, newTitle: string) => void;
  onDeleteConversation: (id: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  currentConversationId: number | null;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
  currentConversationId
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleDoubleClick = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      onRenameConversation(id, editingTitle.trim() || 'Untitled Conversation');
      setEditingId(null);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleBlur = (id: number) => {
    onRenameConversation(id, editingTitle.trim() || 'Untitled Conversation');
    setEditingId(null);
  };

  return (
    <div className={`history-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="history-panel-header" onClick={onToggle}>
        <h3>History</h3>
        <button className="history-toggle-button">
          {isOpen ? '−' : '+'}
        </button>
      </div>
      
      <div className="history-panel-content">
        {conversations.length === 0 ? (
          <div className="no-conversations">No saved conversations</div>
        ) : (
          <ul className="conversation-list">
            {conversations.map(conversation => (
              <li 
                key={conversation.id} 
                className={`conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
                onClick={() => onSelectConversation(conversation)}
                onDoubleClick={() => handleDoubleClick(conversation)}
              >
                {editingId === conversation.id ? (
                  <input
                    ref={inputRef}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                    onBlur={() => handleBlur(conversation.id)}
                    className="conversation-title-input"
                  />
                ) : (
                  <>
                    <div className="conversation-title">{conversation.title}</div>
                    <div className="conversation-date">
                      {new Date(conversation.timestamp).toLocaleDateString()}
                    </div>
                    <button 
                      className="delete-conversation" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;