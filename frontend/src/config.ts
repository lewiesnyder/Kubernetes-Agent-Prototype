export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export const MODELS: ModelOption[] = [
  {
    id: "anthropic/claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    description: "Latest Claude model with advanced reasoning"
  },
  {
    id: "anthropic/claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Balanced performance and efficiency"
  },
  {
    id: "anthropic/claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Fast and efficient Claude model"
  },
  {
    id: "ollama_chat/deepseek-r1:32b",
    name: "DeepSeek R1 32B",
    provider: "Ollama",
    description: "Advanced reasoning model from DeepSeek"
  },
  {
    id: "ollama_chat/llama3.2:latest",
    name: "Llama 3.2",
    provider: "Ollama",
    description: "Latest Llama model from Meta"
  },
  {
    id: "ollama_chat/llama3-groq-tool-use:8b",
    name: "Llama 3 Groq Tool Use",
    provider: "Ollama",
    description: "Llama 3 with Groq's tool use capabilities"
  },
  {
    id: "ollama_chat/medragondot/Sky-T1-32B-Preview:latest",
    name: "Sky T1 32B Preview",
    provider: "Ollama",
    description: "Sky T1 32B Preview model from Medragondot"
  },
  {
    id: "ollama_chat/llama3.1:latest",
    name: "Llama 3.1",
    provider: "Ollama",
    description: "Llama 3.1 model from Meta"
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Latest GPT model from OpenAI"
  }
];

export const DEFAULT_MODEL = "anthropic/claude-3-7-sonnet-20250219";
export const DEFAULT_TEMPERATURE = 0.7;
export const MIN_TEMPERATURE = 0;
export const MAX_TEMPERATURE = 1;
export const TEMPERATURE_STEP = 0.1;
export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI research assistant. Follow the user's requirements carefully and to the letter. You have access to various tools to help you complete the user's request. Pay careful attention to the description of the tools when deciding how to properly respond.";