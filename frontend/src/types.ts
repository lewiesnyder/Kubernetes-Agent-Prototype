export interface Message {
  role: string;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature: number | null;
  tools?: object[] | null;
  stream?: boolean;
}

export interface ResponseEvent {
  type: string;
  data: string;
  stage: string;
}

export type ResponseEvents = ResponseEvent[];

export interface ToolCallData {
  name: string;
  args: string;
}

export enum EventStage {
  CompletionEvent = "completion_event",
  ToolCallEvent = "tool_call_event",
  InstallDependencies = "install_dependencies",
  ExecutePython = "execute_python",
  StdoutEvent = "stdout_event",
  StderrEvent = "stderr_event"
}

export enum EventType {
  Response = "response",
  ToolCall = "tool_call",
  Stdout = "stdout",
  Stderr = "stderr",
  ToolOutput = "tool_output"
}