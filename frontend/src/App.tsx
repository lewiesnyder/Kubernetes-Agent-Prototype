import React from 'react';
import './styles.css';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="app-container">
      <div className="header">
        <h1>Agent Chat Interface</h1>
      </div>
      <ChatInterface />
    </div>
  );
}

export default App;