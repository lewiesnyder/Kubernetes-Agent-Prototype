import React, { useState, useRef, useEffect, useMemo } from 'react';
import { streamChatRequest } from '../api';
import { Message, EventStage, EventType, ResponseEvent, ToolCallData } from '../types';
import ThinkingIndicator from './ThinkingIndicator';
import CollapsibleSection from './CollapsibleSection';
import OutputLog from './OutputLog';
import ConversationHistory from './ConversationHistory';
import { 
  MODELS, 
  DEFAULT_MODEL, 
  DEFAULT_TEMPERATURE,
  MIN_TEMPERATURE,
  MAX_TEMPERATURE,
  TEMPERATURE_STEP,
  DEFAULT_SYSTEM_PROMPT
} from '../config';

interface ChatMessage {
  role: string;
  content: string;
}

interface ExecutionOutput {
  id: string;
  title: string;
  logs: { type: string; content: string }[];
  extractedOutput?: string;
  conversationId?: number;
}

// Add new interface for tool calls
interface ToolCall {
  id: string;
  name: string;
  args: string;
  conversationId?: number;
}

// Add a new interface to represent a complete conversation unit
interface ConversationUnit {
  id: number;
  userMessage: ChatMessage;
  assistantMessage?: ChatMessage;
  executions: ExecutionOutput[];
  toolCalls: ToolCall[];
}

// Interface for stored conversations
interface StoredConversation {
  id: number;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  executions: ExecutionOutput[];
  toolCalls: ToolCall[];
  model: string;
  temperature: number;
  systemPrompt: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null);
  const [executions, setExecutions] = useState<ExecutionOutput[]>([]);
  // Add state for tool calls
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(true);
  // State for saved conversations
  const [savedConversations, setSavedConversations] = useState<StoredConversation[]>([]);
  // Current active conversation ID
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  // Start conversation counter from 1
  const [conversationCounter, setConversationCounter] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Add a ref to track the current streamed response
  const currentResponseRef = useRef('');

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
    console.log('Messages state updated:', messages);
  }, [messages, streamedResponse, executions]);

  // Load conversations from local storage on initial render
  useEffect(() => {
    const loadSavedConversations = () => {
      try {
        const savedData = localStorage.getItem('chatConversations');
        if (savedData) {
          const parsed = JSON.parse(savedData) as StoredConversation[];
          setSavedConversations(parsed);
          
          // Find the max conversation ID to set the counter
          const maxId = Math.max(...parsed.map(c => c.id), 0);
          setConversationCounter(maxId + 1);
        }
      } catch (error) {
        console.error('Error loading saved conversations:', error);
      }
    };
    
    loadSavedConversations();
  }, []);

  // Save conversation to local storage when a new message is added
  useEffect(() => {
    // We only want to save if there are messages and a current conversation ID
    const handleSave = () => {
      if (messages.length > 0 && currentConversationId !== null) {
        saveCurrentConversation();
      }
    };
    
    handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, currentConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Function to save the current conversation to local storage
  const saveCurrentConversation = () => {
    if (messages.length === 0 || currentConversationId === null) return;
    
    // Get title from first user message
    const firstUserMessageIndex = messages.findIndex(msg => msg.role === 'user');
    if (firstUserMessageIndex === -1) return;
    
    const title = messages[firstUserMessageIndex].content.slice(0, 50) + (messages[firstUserMessageIndex].content.length > 50 ? '...' : '');
    
    const currentTimestamp = Date.now();
    
    // Check if this conversation already exists in savedConversations
    const existingIndex = savedConversations.findIndex(c => c.id === currentConversationId);
    
    const updatedConversation: StoredConversation = {
      id: currentConversationId,
      title,
      timestamp: currentTimestamp,
      messages,
      executions,
      toolCalls,
      model: selectedModel,
      temperature,
      systemPrompt
    };
    
    let updatedConversations: StoredConversation[];
    
    if (existingIndex >= 0) {
      // Update existing conversation
      updatedConversations = [...savedConversations];
      updatedConversations[existingIndex] = updatedConversation;
    } else {
      // Add new conversation
      updatedConversations = [...savedConversations, updatedConversation];
      // Set current conversation ID
      setCurrentConversationId(updatedConversation.id);
    }
    
    setSavedConversations(updatedConversations);
    
    try {
      localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('Error saving conversations to local storage:', error);
    }
  };
  
  // Function to handle conversation selection
  const handleSelectConversation = (conversation: { id: number; title: string; timestamp: number; messages: ChatMessage[] }) => {
    // Find the full conversation data from savedConversations
    const fullConversation = savedConversations.find(c => c.id === conversation.id);
    
    if (fullConversation) {
      setMessages(fullConversation.messages);
      setExecutions(fullConversation.executions);
      setToolCalls(fullConversation.toolCalls);
      setSelectedModel(fullConversation.model);
      setTemperature(fullConversation.temperature);
      setSystemPrompt(fullConversation.systemPrompt);
      setCurrentConversationId(fullConversation.id);
      
      // Close history panel on mobile
      if (window.innerWidth < 768) {
        setIsHistoryPanelOpen(false);
      }
    }
  };
  
  // Function to handle conversation renaming
  const handleRenameConversation = (id: number, newTitle: string) => {
    const updatedConversations = savedConversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    
    setSavedConversations(updatedConversations);
    localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
  };
  
  // Function to handle conversation deletion
  const handleDeleteConversation = (id: number) => {
    const updatedConversations = savedConversations.filter(c => c.id !== id);
    setSavedConversations(updatedConversations);
    localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
    
    // If we deleted the current conversation, clear the UI
    if (id === currentConversationId) {
      setMessages([]);
      setExecutions([]);
      setToolCalls([]);
      setCurrentConversationId(null);
    }
  };
  
  // Function to start a new conversation
  const startNewConversation = () => {
    setMessages([]);
    setExecutions([]);
    setToolCalls([]);
    setCurrentConversationId(null);
    setInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // If there's no current conversation, create a new one
    const newConversationId = currentConversationId === null ? conversationCounter : currentConversationId;
    
    if (currentConversationId === null) {
      // Set currentConversationId to the current counter value
      setCurrentConversationId(newConversationId);
      // Increment conversation counter for future conversations
      setConversationCounter(prev => prev + 1);
    }
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    // Add user message to the conversation
    const updatedWithUserMessage = [...messages, userMessage];
    
    // Update UI state with the new user message
    setMessages(updatedWithUserMessage);
    
    // Reset input and temp state
    setInput('');
    // Reset streamed response and ref
    setStreamedResponse('');
    currentResponseRef.current = '';
    setCurrentToolCall(null);
    // Don't reset executions and tool calls to preserve them between conversations
    // setExecutions([]);
    // setToolCalls([]);
    setIsLoading(true);

    try {
      // Create request with system prompt and conversation history
      const messagesWithSystem = [
        { role: 'system', content: systemPrompt },
        ...updatedWithUserMessage.map(msg => ({ 
          role: msg.role, 
          content: msg.content 
        }))
      ];
      
      const request = {
        model: selectedModel,
        messages: messagesWithSystem,
        temperature,
        stream: true,
      };

      // For debugging
      console.log('Request payload:', JSON.stringify(request));

      // Pass the conversation ID to the event handler
      await streamChatRequest(request, (event) => handleEventReceived(event, newConversationId));
      
      // After streaming is done, add the complete response
      // Use the ref value which is more reliable than the state
      if (currentResponseRef.current) {
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: currentResponseRef.current 
        };
        
        setMessages(prev => {
          const updated = [...prev, assistantMessage];
          // We need to delay saving until after state update is complete
          setTimeout(() => saveCurrentConversation(), 100);
          return updated;
        });
        
        setStreamedResponse('');
        currentResponseRef.current = '';
      }
    } catch (error) {
      console.error('Error:', error);
      // Add error message
      const errorMessage = { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' };
      setMessages(prevMessages => {
        const updated = [...prevMessages, errorMessage];
        // Save error message too
        setTimeout(() => saveCurrentConversation(), 100);
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the event handler to accept the conversation ID
  const handleEventReceived = (event: ResponseEvent, currentConversationId: number) => {
    const { type, data, stage } = event;

    if (stage === EventStage.CompletionEvent) {
      // Update both the state and the ref for streamed response
      setStreamedResponse((prev) => {
        const updated = prev + data;
        currentResponseRef.current = updated;
        return updated;
      });
    } 
    else if (stage === EventStage.ToolCallEvent) {
      try {
        const toolData: ToolCallData = JSON.parse(data);
        setCurrentToolCall(toolData.name);
        
        // Add tool call to the list of tool calls with the current conversation ID
        setToolCalls(prev => [
          ...prev, 
          { 
            id: `tool-${prev.length}`, 
            name: toolData.name, 
            args: toolData.args,
            conversationId: currentConversationId
          }
        ]);
      } catch (e) {
        console.error('Error parsing tool call data:', e);
      }
    }
    else if (
      stage === EventStage.InstallDependencies || 
      stage === EventStage.ExecutePython
    ) {
      // Handle stdout/stderr events for execution stages
      const executionStage = stage === EventStage.InstallDependencies 
        ? 'Installing Dependencies' 
        : 'Executing Python Code';
      
      // Process the data for delimiters if it's Python execution
      let processedData = data;
      let extractedOutput: string | null = null;
      
      if (stage === EventStage.ExecutePython) {
        // Check for delimiters in the data
        const startDelimiter = '%%START_OUTPUT%%';
        const endDelimiter = '%%END_OUTPUT%%';
        
        const startIndex = data.indexOf(startDelimiter);
        const endIndex = data.indexOf(endDelimiter);
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          // Extract the content between delimiters
          extractedOutput = data.substring(
            startIndex + startDelimiter.length, 
            endIndex
          );
          
          // Remove the delimited content from the log
          processedData = data.replace(`${startDelimiter}${extractedOutput}${endDelimiter}`, '');
        }
      }
      
      setExecutions(prev => {
        // Check if we already have an execution for this stage in the current conversation
        const existingExecIndex = prev.findIndex(exec => 
          exec.title === executionStage && 
          exec.conversationId === currentConversationId
        );
        
        if (existingExecIndex >= 0) {
          // Update existing execution
          const updated = [...prev];
          updated[existingExecIndex].logs.push({
            type,
            content: processedData
          });
          
          // If we extracted output, store it
          if (extractedOutput !== null) {
            updated[existingExecIndex].extractedOutput = extractedOutput;
          }
          
          return updated;
        } else {
          // Create new execution
          const newExecution: ExecutionOutput = {
            id: `exec-${prev.length}`,
            title: executionStage,
            logs: [{
              type,
              content: processedData
            }],
            conversationId: currentConversationId
          };
          
          // If we extracted output, add it
          if (extractedOutput !== null) {
            newExecution.extractedOutput = extractedOutput;
          }
          
          return [...prev, newExecution];
        }
      });
    }
    // Clear tool call when we get a new completion event
    else if (stage === EventStage.CompletionEvent && currentToolCall) {
      setCurrentToolCall(null);
    }
  };

  // Find the current model name for display
  const currentModelName = MODELS.find(m => m.id === selectedModel)?.name || 'Unknown Model';
  
  // Group models by provider for dropdown
  const modelsByProvider: Record<string, typeof MODELS> = {};
  MODELS.forEach(model => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  });

  // Group messages, executions, and tool calls by conversation
  const conversationUnits = useMemo(() => {
    const units: ConversationUnit[] = [];
    
    // First, create base units from user messages
    for (let i = 0; i < messages.length; i += 2) {
      if (messages[i]?.role === 'user') {
        const userMessage = messages[i];
        const assistantMessage = messages[i + 1];
        const unitId = Math.floor(i / 2) + 1; // Start from 1, but this may not match conversationCounter
        
        units.push({
          id: unitId,
          userMessage,
          assistantMessage,
          executions: [],
          toolCalls: []
        });
      }
    }
    
    // Then match executions and tool calls to their respective units
    executions.forEach(execution => {
      if (execution.conversationId) {
        const targetUnit = units.find(unit => unit.id === execution.conversationId);
        if (targetUnit) {
          targetUnit.executions.push(execution);
        }
      }
    });
    
    toolCalls.forEach(toolCall => {
      if (toolCall.conversationId) {
        const targetUnit = units.find(unit => unit.id === toolCall.conversationId);
        if (targetUnit) {
          targetUnit.toolCalls.push(toolCall);
        }
      }
    });
    
    return units;
  }, [messages, executions, toolCalls]);

  return (
    <div className={`app-layout ${isConfigPanelOpen ? 'config-open' : ''} ${isHistoryPanelOpen ? 'history-open' : ''}`}>
      <ConversationHistory 
        conversations={savedConversations.map(c => ({
          id: c.id,
          title: c.title,
          timestamp: c.timestamp,
          messages: c.messages
        }))}
        onSelectConversation={handleSelectConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isHistoryPanelOpen}
        onToggle={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
        currentConversationId={currentConversationId}
      />
      <div className="chat-container">
        <button 
          className="open-config-button" 
          onClick={() => setIsConfigPanelOpen(true)}
          style={{ display: isConfigPanelOpen ? 'none' : 'block' }}
        >
          Configure
        </button>
        <button 
          className="open-history-button" 
          onClick={() => setIsHistoryPanelOpen(true)}
          style={{ display: isHistoryPanelOpen ? 'none' : 'block' }}
        >
          History
        </button>
        <div className="messages-container">
          <button className="new-chat-button" onClick={startNewConversation}>
            New Chat
          </button>
        {/* Render conversations with their associated executions and tool calls */}
        {conversationUnits.map((unit) => (
          <div key={unit.id} className="conversation-unit">
            {/* User message */}
            <div className="message user-message">
              {unit.userMessage.content}
            </div>
            
            {/* Assistant message */}
            {unit.assistantMessage && (
              <div className="message assistant-message">
                {unit.assistantMessage.content}
              </div>
            )}
            
            {/* Tool calls for this conversation */}
            {unit.toolCalls.map((tool) => (
              <CollapsibleSection key={tool.id} title={`Tool: ${tool.name}`}>
                <div className="tool-call-content">
                  <pre><code>
                    {`### ${tool.name}\n\n\`\`\`json\n${JSON.stringify(JSON.parse(tool.args), null, 2)}\n\`\`\``}
                  </code></pre>
                </div>
              </CollapsibleSection>
            ))}
            
            {/* Executions for this conversation */}
            {unit.executions.map((execution) => (
              <React.Fragment key={execution.id}>
                <CollapsibleSection title={execution.title}>
                  {execution.logs.map((log, idx) => (
                    <OutputLog key={idx} type={log.type} content={log.content} />
                  ))}
                </CollapsibleSection>
                
                {/* Display extracted output if available */}
                {execution.extractedOutput && (
                  <div className="output-result-container">
                    <div className="message assistant-message output-result">
                      <h4 className="output-title">Output Result</h4>
                      <div className="output-content-wrapper">
                        {execution.extractedOutput.trim().startsWith('data:image/') ? (
                          <img 
                            src={execution.extractedOutput} 
                            alt="Generated output" 
                            className="output-image" 
                          />
                        ) : execution.extractedOutput.trim().startsWith('data:') ? (
                          <a 
                            href={execution.extractedOutput} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="output-link"
                          >
                            Open Generated Content
                          </a>
                        ) : (
                          // <pre className="text-output-pre">
                          <div>{execution.extractedOutput}</div>
                        //   </pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ))}
        
        {/* Display current streamed response if any */}
        {streamedResponse && (
          <div className="message assistant-message">
            {streamedResponse}
          </div>
        )}

        {/* Display thinking indicator when a tool is executing */}
        {currentToolCall && (
          <ThinkingIndicator toolName={currentToolCall} />
        )}

        <div ref={messagesEndRef} />
      </div>

      
      <form onSubmit={handleSubmit} className="input-container">
        <textarea
          className="message-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          rows={1}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        
        <button
          type="submit"
          className="send-button"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? <div className="spinner"></div> : 'Send'}
        </button>
      </form>
    </div>
      
    <div className={`config-panel ${isConfigPanelOpen ? 'open' : 'closed'}`}>
      <div className="config-panel-header" onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}>
        <h3>Configure</h3>
        <button className="config-toggle-button">
          {isConfigPanelOpen ? '−' : '+'}  
        </button>
      </div>
      <div className="config-panel-content">
        <div className="config-section">
          <label htmlFor="model-select">Model</label>
          <select 
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select-inline"
            disabled={isLoading}
          >
            {Object.entries(modelsByProvider).map(([provider, models]) => (
              <optgroup key={provider} label={provider}>
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        
        <div className="config-section">
          <label htmlFor="temperature-slider">Temperature: {temperature.toFixed(1)}</label>
          <input
            id="temperature-slider"
            type="range"
            min={MIN_TEMPERATURE}
            max={MAX_TEMPERATURE}
            step={TEMPERATURE_STEP}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="temperature-slider-inline"
            disabled={isLoading}
          />
          <div className="temperature-labels">
            <span>Precise</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>
        
        <div className="config-section">
          <label htmlFor="system-prompt">System Prompt</label>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="system-prompt-input"
            rows={4}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  </div>
  );
};

export default ChatInterface;