import axios from 'axios';
import { ChatRequest, ResponseEvents } from './types';

// Use relative URL or proxy URL instead of direct backend URL
// This will work with the proxy we set up in package.json or server.js
const API_URL = '/api';

// Configure Axios with default settings
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendChatRequest = async (request: ChatRequest): Promise<ResponseEvents> => {
  try {
    const response = await axiosInstance.post('/chat', request);
    return response.data;
  } catch (error) {
    console.error('Error sending chat request:', error);
    throw error;
  }
};

export const streamChatRequest = async (
  request: ChatRequest, 
  onEventReceived: (event: any) => void
): Promise<void> => {
  try {
    // Set stream to true for the streaming endpoint
    const streamRequest = { ...request, stream: true };
    
    // Use the proxy endpoint
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(streamRequest),
    });
    
    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // Split by newlines and process each complete event
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        // Check for server-sent event format
        if (line.startsWith('data: ')) {
          const eventData = line.slice(6); // Remove 'data: ' prefix
          try {
            const parsedEvent = JSON.parse(eventData);
            onEventReceived(parsedEvent);
          } catch (e) {
            console.error('Error parsing event:', e, eventData);
          }
        } else {
          // For regular JSON response format
          try {
            const parsedEvent = JSON.parse(line);
            onEventReceived(parsedEvent);
          } catch (e) {
            // If parsing fails, it might not be a JSON line
            console.error('Error parsing non-SSE line:', e, line);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error streaming chat request:', error);
    throw error;
  }
};