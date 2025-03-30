# Agent Chat Interface

A React-based frontend for interacting with an agentic backend service. This application provides a chat interface that:

1. Sends user prompts to the backend
2. Displays streamed completion text responses
3. Shows tool execution with "thinking" indicators
4. Displays collapsible sections for dependency installation and code execution logs
5. Allows model selection and temperature adjustment

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

This will run the app in development mode using Create React App's built-in proxy to handle CORS issues. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Running with Express Server

If you're experiencing CORS issues with the default setup, you can use the included Express server which provides a more robust proxy:

```bash
npm run server
```

Or run both the React development server and Express server simultaneously:

```bash
npm run dev
```

## Features

- **Real-time streaming** of agent responses
- **Tool execution indicator** showing which tool is being used
- **Collapsible sections** for execution outputs with color-coded stdout/stderr
- **Model selection** from various providers (Anthropic, OpenAI, Ollama)
- **Temperature control** with a slider from 0.0 to 1.0
- **Multi-stage processing** handling the agentic workflow:
  - Text completion
  - Tool calling
  - Dependency installation
  - Python code execution

## Supported Models

The application supports multiple models from different providers:

- **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku
- **OpenAI**: GPT-4o
- **Ollama**: DeepSeek R1, Llama 3.2, Phi-4 Mini

Models can be configured in the `src/config.ts` file.

## Backend Connection

The application connects to a backend service running at `http://localhost:8000` that follows the OpenAPI specification provided in `backend-openapi-spec.json`. The connection is proxied through:

- Create React App's built-in proxy (during development)
- An Express.js proxy server (for more robust handling)

All API requests are made to `/api/*` endpoints which are then proxied to the backend.

## Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder, optimizing for performance. To serve the production build with the proxy server:

```bash
npm run build && npm run server
```