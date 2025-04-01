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
  tool_calls?: ToolCall[];
}

interface ExecutionOutput {
  id: string;
  title: string;
  logs: { type: string; content: string }[];
  extractedOutput?: string;
  toolOutput?: string;
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
    
    // Clear previous executions related to this conversation to ensure fresh results
    setExecutions(prev => prev.filter(exec => exec.conversationId !== newConversationId));
    setToolCalls(prev => prev.filter(tool => tool.conversationId !== newConversationId));
    
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
        // Get tool calls for this conversation
        const conversationToolCalls = toolCalls.filter(tool => 
          tool.conversationId === newConversationId
        );
        
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: currentResponseRef.current,
          // Only include tool_calls if we have any
          ...(conversationToolCalls.length > 0 && { tool_calls: conversationToolCalls })
        };
        
        setMessages(prev => {
          const updated = [...prev, assistantMessage];
          // We need to delay saving until after state update is complete
          setTimeout(() => saveCurrentConversation(), 100);
          return updated;
        });
        
        setStreamedResponse('');
        currentResponseRef.current = '';
        
        // Ensure any remaining tool call indicator is cleared
        setCurrentToolCall(null);
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
    
    console.log("Event received:", type, stage, data.substring(0, 100));

    if (stage === EventStage.CompletionEvent) {
      // Update both the state and the ref for streamed response
      setStreamedResponse((prev) => {
        const updated = prev + data;
        currentResponseRef.current = updated;
        return updated;
      });
      
      // Clear tool call when we get a new completion event
      if (currentToolCall) {
        setCurrentToolCall(null);
      }
    } 
    else if (type === EventType.ToolCall || stage === EventStage.ToolCallEvent || stage === EventStage.ToolCall) {
      try {
        console.log("Tool call detected:", data);
        const toolData: ToolCallData = JSON.parse(data);
        setCurrentToolCall(toolData.name);
        
        // Add tool call to the list of tool calls with the current conversation ID
        console.log("Tool call parsed:", toolData);
        
        // Try to parse the nested args 
        let parsedArgs = toolData.args;
        try {
          // Check if the args is a JSON string and parse it
          const argsObj = JSON.parse(toolData.args);
          // Format code and dependencies if they exist
          if (argsObj.code || argsObj.dependencies) {
            parsedArgs = JSON.stringify({
              code: argsObj.code || '',
              dependencies: argsObj.dependencies || []
            });
          }
        } catch (argsError) {
          console.log("Tool args are not JSON or already parsed:", argsError);
        }
        
        // Add the tool call to state
        setToolCalls(prev => {
          const newToolCall = { 
            id: `tool-${Date.now()}-${prev.length}`,
            name: toolData.name, 
            args: parsedArgs,
            conversationId: currentConversationId
          };
          console.log("Adding tool call to state:", newToolCall);
          return [...prev, newToolCall];
        });
      } catch (e) {
        console.error('Error parsing tool call data:', e, data);
      }
    }
    else if (type === EventType.ToolOutput) {
      // Handle tool_output type events - add to the current execution
      const executionStage = `Tool Output: ${stage}`;
      
      // Clear the current tool call indicator when we get a tool output
      // This signals that the tool has finished executing
      setCurrentToolCall(null);
      
      setExecutions(prev => {
        // Generate a stable execution ID for tool output
        const executionKey = `tool-output-${stage}-${currentConversationId}`;
        
        // Check if we already have a tool output execution for this stage
        const existingExecIndex = prev.findIndex(exec => 
          exec.title === executionStage && 
          exec.conversationId === currentConversationId
        );
        
        if (existingExecIndex >= 0) {
          // Update existing execution
          const updated = [...prev];
          
          // Store the tool output
          updated[existingExecIndex].toolOutput = data;
          
          return updated;
        } else {
          // Create new execution with unique ID for this tool output
          const newExecution: ExecutionOutput = {
            id: `exec-${executionKey}-${Date.now()}`,
            title: executionStage,
            logs: [],
            toolOutput: data,
            conversationId: currentConversationId
          };
          
          return [...prev, newExecution];
        }
      });
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
      
      // If data contains END_OUTPUT, tool execution is probably complete
      if (data.includes("%%END_OUTPUT%%") || 
          (stage === EventStage.ExecutePython && type === EventType.Stderr && data.includes("exited with code"))) {
        setCurrentToolCall(null);
      }
      
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
          ).trim();
          
          // Remove the delimited content from the log
          processedData = data.replace(`${startDelimiter}${extractedOutput}${endDelimiter}`, '');
        } else {
          // If no delimiters but there's output, and it's stdout, consider it the extracted output
          if (type === EventType.Stdout && data.trim()) {
            // Only extract if it looks like meaningful output (not just status messages)
            if (!data.includes("Running code") && !data.includes("Executing") && data.length > 5) {
              extractedOutput = data.trim();
            }
          }
        }
      }
      
      setExecutions(prev => {
        // Generate a stable execution ID for this stage and conversation
        const executionKey = `${stage}-${currentConversationId}`;
        
        // Check if we already have an execution for this stage in the current conversation
        const existingExecIndex = prev.findIndex(exec => 
          exec.title === executionStage && 
          exec.conversationId === currentConversationId
        );
        
        if (existingExecIndex >= 0) {
          // Update existing execution
          const updated = [...prev];
          
          // Ensure log entry is not duplicate
          const isDuplicate = updated[existingExecIndex].logs.some(
            log => log.type === type && log.content === processedData
          );
          
          if (!isDuplicate && processedData.trim()) {
            updated[existingExecIndex].logs.push({
              type,
              content: processedData
            });
          }
          
          // If we extracted output, store it
          if (extractedOutput !== null) {
            updated[existingExecIndex].extractedOutput = extractedOutput;
          }
          
          return updated;
        } else {
          // Skip empty logs
          if (!processedData.trim() && extractedOutput === null) {
            return prev;
          }
          
          // Create new execution with unique ID
          const newExecution: ExecutionOutput = {
            id: `exec-${executionKey}-${Date.now()}`,
            title: executionStage,
            logs: processedData.trim() ? [{
              type,
              content: processedData
            }] : [],
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
        // For historical conversations, use calculated index+1 as ID
        const unitId = Math.floor(i / 2) + 1;
        
        units.push({
          id: unitId,
          userMessage,
          assistantMessage,
          executions: [],
          toolCalls: []
        });
      }
    }
    
    // Log active tool calls for debugging
    if (currentToolCall) {
      console.log("Active tool call:", currentToolCall);
    }
    
    // Then match executions and tool calls to their respective units
    if (units.length > 0) {
      // Create a priority map for execution types
      const executionTypePriority: Record<string, number> = {
        'Installing Dependencies': 1,
        'Executing Python Code': 2,
      };
      
      // Tool outputs should come after code execution
      const isToolOutput = (title: string) => title.startsWith('Tool Output:');
      
      // Sort executions to ensure they're displayed in the correct order
      const sortedExecutions = [...executions].sort((a, b) => {
        // First by conversation ID
        if (a.conversationId !== b.conversationId) {
          return (a.conversationId || 0) - (b.conversationId || 0);
        }
        
        // Tool output should come last
        if (isToolOutput(a.title) && !isToolOutput(b.title)) return 1;
        if (!isToolOutput(a.title) && isToolOutput(b.title)) return -1;
        
        // If both are tool outputs or neither are tool outputs, use priorities
        if (isToolOutput(a.title) && isToolOutput(b.title)) {
          // Sort by ID for tool outputs (chronological order)
          return a.id.localeCompare(b.id);
        } else {
          // Sort by predefined priority
          const priorityA = executionTypePriority[a.title] || 99;
          const priorityB = executionTypePriority[b.title] || 99;
          return priorityA - priorityB;
        }
      });
      
      // Map from conversation ID to most recent unit that should contain its executions
      const lastUnitByConversationId: Record<number, number> = {};
      
      // First, establish which unit should handle which conversation ID
      units.forEach((unit, idx) => {
        // For the active conversation, associate with the current conversation ID
        if (idx === units.length - 1 && currentConversationId !== null) {
          lastUnitByConversationId[currentConversationId] = unit.id;
        } else {
          // Otherwise use the unit's ID
          lastUnitByConversationId[unit.id] = unit.id;
        }
      });
      
      // Log tool calls for debugging
      console.log("Available tool calls:", toolCalls);
      console.log("Current conversation ID:", currentConversationId);
      console.log("Units:", units);
      
      // Distribute executions to appropriate conversation units
      sortedExecutions.forEach(execution => {
        if (execution.conversationId !== undefined) {
          // Try to find the correct unit for this execution
          const targetUnitId = lastUnitByConversationId[execution.conversationId];
          const targetUnit = units.find(unit => unit.id === targetUnitId);
          
          if (targetUnit) {
            targetUnit.executions.push(execution);
          } else if (units.length > 0) {
            // If we can't find a specific match, add to the most recent conversation
            units[units.length - 1].executions.push(execution);
          }
        } else if (units.length > 0) {
          // If no conversation ID, add to the most recent conversation
          units[units.length - 1].executions.push(execution);
        }
      });
      
      // Similarly for tool calls
      toolCalls.forEach(toolCall => {
        console.log(`Processing tool call: ${toolCall.name} for conversation ${toolCall.conversationId}`);
        if (toolCall.conversationId !== undefined) {
          const targetUnitId = lastUnitByConversationId[toolCall.conversationId];
          const targetUnit = units.find(unit => unit.id === targetUnitId);
          
          if (targetUnit) {
            console.log(`Adding tool call ${toolCall.name} to unit ${targetUnit.id}`);
            targetUnit.toolCalls.push(toolCall);
          } else if (units.length > 0) {
            console.log(`Adding tool call ${toolCall.name} to most recent unit (fallback)`);
            units[units.length - 1].toolCalls.push(toolCall);
          }
        } else if (units.length > 0) {
          console.log(`Adding tool call ${toolCall.name} to most recent unit (no conversation ID)`);
          units[units.length - 1].toolCalls.push(toolCall);
        }
      });
      
      // For each unit, sort the executions in the desired order
      units.forEach(unit => {
        unit.executions.sort((a, b) => {
          // Tool output should come last
          if (isToolOutput(a.title) && !isToolOutput(b.title)) return 1;
          if (!isToolOutput(a.title) && isToolOutput(b.title)) return -1;
          
          // If both are tool outputs or neither are tool outputs, use priorities
          if (isToolOutput(a.title) && isToolOutput(b.title)) {
            // Sort by ID for tool outputs (chronological order)
            return a.id.localeCompare(b.id);
          } else {
            // Sort by predefined priority
            const priorityA = executionTypePriority[a.title] || 99;
            const priorityB = executionTypePriority[b.title] || 99;
            return priorityA - priorityB;
          }
        });
      });
    }
    
    return units;
  }, [messages, executions, toolCalls, currentConversationId]);

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
            
            {/* Assistant message - always place right after user message */}
            {unit.assistantMessage && (
              <div className="message assistant-message">
                {unit.assistantMessage.content}
                
                {/* Display tool calls from the assistant message if available */}
                {/* {unit.assistantMessage.tool_calls && unit.assistantMessage.tool_calls.length > 0 && (
                  <div className="assistant-tool-calls">
                    {unit.assistantMessage.tool_calls.map((tool) => {
                      // Try to parse the tool arguments
                      let args;
                      try {
                        args = JSON.parse(tool.args);
                        const hasDependencies = args.dependencies && args.dependencies.length > 0;
                        const hasCode = args.code && args.code.trim().length > 0;
                        
                        return (
                          <CollapsibleSection key={tool.id} title={`Tool: ${tool.name}`} defaultOpen={true}>
                            <div className="tool-call-content">
                              {hasDependencies && (
                                <>
                                  <h5>Dependencies:</h5>
                                  <pre><code>
                                    {Array.isArray(args.dependencies) 
                                      ? args.dependencies.join('\n') 
                                      : args.dependencies}
                                  </code></pre>
                                </>
                              )}
                              
                              {hasCode && (
                                <>
                                  <h5>Code:</h5>
                                  <pre><code className="language-python">
                                    {args.code}
                                  </code></pre>
                                </>
                              )}
                              
                              {!hasCode && !hasDependencies && (
                                <pre><code>
                                  {JSON.stringify(args, null, 2)}
                                </code></pre>
                              )}
                            </div>
                          </CollapsibleSection>
                        );
                      } catch (e) {
                        // Fallback to original format if parsing fails
                        return (
                          <CollapsibleSection key={tool.id} title={`Tool: ${tool.name}`} defaultOpen={true}>
                            <div className="tool-call-content">
                              <pre><code>
                                {`### ${tool.name}\n\n\`\`\`json\n${JSON.stringify(JSON.parse(tool.args), null, 2)}\n\`\`\``}
                              </code></pre>
                            </div>
                          </CollapsibleSection>
                        );
                      }
                    })}
                  </div>
                )} */}
              </div>
            )}
            
            {/* Tool calls for this conversation */}
            {unit.toolCalls.length > 0 && (
              <div className="tool-calls-section">
                <h4>Tools Used ({unit.toolCalls.length})</h4>
                {unit.toolCalls.map((tool) => {
                  console.log("Rendering tool call:", tool);
                  
                  // Try to parse the tool arguments - handle potential parsing errors
                  let parsed = false;
                  let hasDependencies = false;
                  let hasCode = false;
                  let formattedCode = '';
                  let formattedDependencies: string[] = [];
                  let displayContent: React.ReactNode = null;
                  
                  try {
                    const args = JSON.parse(tool.args);
                    
                    // Check if this is already processed with code/dependencies format
                    if (typeof args.code === 'string' || (args.dependencies && args.dependencies.length)) {
                      parsed = true;
                      hasDependencies = !!args.dependencies?.length;
                      hasCode = !!args.code?.trim();
                      formattedCode = args.code || '';
                      formattedDependencies = Array.isArray(args.dependencies) ? args.dependencies : [args.dependencies];
                      
                      displayContent = (
                        <>
                          {hasDependencies && (
                            <>
                              <h5>Dependencies:</h5>
                              <pre><code>
                                {formattedDependencies.join('\n')}
                              </code></pre>
                            </>
                          )}
                          
                          {hasCode && (
                            <>
                              <h5>Code:</h5>
                              <pre><code className="language-python">
                                {formattedCode}
                              </code></pre>
                            </>
                          )}
                        </>
                      );
                    } else {
                      // If it doesn't match our expected format, just show the JSON
                      parsed = true;
                      displayContent = (
                        <>
                          <h5>Arguments:</h5>
                          <pre><code>
                            {JSON.stringify(args, null, 2)}
                          </code></pre>
                        </>
                      );
                    }
                  } catch (e) {
                    console.warn("Could not parse tool args as JSON:", e);
                    // Just display raw string if all else fails
                    displayContent = (
                      <>
                        <h5>Raw Arguments:</h5>
                        <pre><code>
                          {String(tool.args)}
                        </code></pre>
                      </>
                    );
                  }
                  
                  return (
                    <CollapsibleSection key={tool.id} title={`${tool.name}`} defaultOpen={true}>
                      <div className="tool-call-content">
                        {displayContent}
                      </div>
                    </CollapsibleSection>
                  );
                })}
              </div>
            )}
            
            {/* Executions for this conversation - already sorted in the conversationUnits logic */}
            {unit.executions.length > 0 && unit.executions.map((execution) => (
              <React.Fragment key={execution.id}>
                {/* Only show sections with logs */}
                {execution.logs.length > 0 && (
                  <CollapsibleSection title={execution.title} defaultOpen={true}>
                    {execution.logs.map((log, idx) => (
                      <OutputLog key={idx} type={log.type} content={log.content} />
                    ))}
                  </CollapsibleSection>
                )}
                
                {/* Display extracted output if available */}
                {execution.extractedOutput && (
                  <div className="output-result-container">
                    <div className="message assistant-message output-result">
                      <h4 className="output-title">Output Result</h4>
                      <div className="output-content-wrapper">
                        {execution.extractedOutput.split(/\s+/).map((part, index) => {
                          if (part.trim().startsWith('data:image/')) {
                            return (
                              <img 
                                key={index}
                                src={part} 
                                alt="Generated output" 
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
                                Open Generated Content
                              </a>
                            );
                          } else {
                            return (
                              <span key={index} className="text-output-content">{part} </span>
                            );
                          }
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Display tool output if available */}
                {execution.toolOutput && (
                  <div className="output-result-container">
                    <div className="message assistant-message output-result">
                      <h4 className="output-title">{execution.title}</h4>
                      <div className="output-content-wrapper">
                        {execution.toolOutput.trim().includes('data:') ? (
                          // Split by spaces and process each part for potential data URLs
                          execution.toolOutput.split(/\s+/).map((part, index) => {
                            if (part.trim().startsWith('data:image/')) {
                              return (
                                <img 
                                  key={index}
                                  src={part} 
                                  alt="Tool output" 
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
                            } else {
                              return (
                                <span key={index} className="text-output-content">{part} </span>
                              );
                            }
                          })
                        ) : (
                          <div className="markdown-content">
                            {execution.toolOutput}
                          </div>
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
      
      <div className="sample-prompts">
        <h4>Sample Prompts:</h4>
        <ul>
          <li onClick={() => setInput("solve collatz conjecture for 134958712379418239412")}>"solve collatz conjecture for 134958712379418239412"</li>
          <li onClick={() => setInput("calculate pi to 1000000 digits")}>"calculate pi to 1000000 digits"</li>
          <li onClick={() => setInput("create a csv with some test data with columns: first_name, last_name, dob, state, city")}>"create a csv with some test data with columns: first_name, last_name, dob, state, city"</li>
          <li onClick={() => setInput("Print Hello World")}>"Print Hello World"</li>
        </ul>
      </div>
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