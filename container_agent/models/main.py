from pydantic import BaseModel, RootModel
from typing import Optional

class Message(BaseModel):
    role: str
    content: str
    tool_calls: Optional[list[dict]] = None


class ChatRequest(BaseModel):
    model: str
    messages: list[Message]
    temperature: Optional[float]
    tools: Optional[list[dict]] = None
    stream: bool = False


class ResponseEvent(BaseModel):
    type: str
    data: str
    stage: str


class ResponseEvents(RootModel):
    root: list[ResponseEvent]

    class Config:
        json_schema_extra ={
            "example": [
                {
                    "type": "response",
                    "data": "Hello, how are you?",
                    "stage": "completion_event"
                },
                {
                    "type": "tool_call",
                    "data": "{\"name\": \"get_weather\", \"args\": \"{\\\"city\\\": \\\"New York\\\"}\"}",
                    "stage": "tool_call_event"
                },
                {
                    "type": "stdout",
                    "data": "stdout data",
                    "stage": "stdout_event"
                },
                {
                    "type": "stderr",
                    "data": "stderr data",
                    "stage": "stderr_event"
                },
                {
                    "type":"tool_output",
                    "data":"data:image/png;base64,iVB...",
                    "stage":"execute_python"
                }
            ]
        }
