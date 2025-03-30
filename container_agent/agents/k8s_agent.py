import litellm
import ujson as json

from typing import AsyncGenerator
from container_agent.models import ChatRequest, Message, ResponseEvent, ResponseEvents
from container_agent.tools.k8s import execute_python_in_k8s
from container_agent.utils import docstring_to_anthropic_spec, docstring_to_openai_spec


class K8sAgent:

    async def chat(self, chat_request:ChatRequest) -> AsyncGenerator[ResponseEvent, None]:
        resp = litellm.completion(
            model=chat_request.model,
            messages=[message.model_dump() for message in chat_request.messages],
            tools=[docstring_to_anthropic_spec(execute_python_in_k8s) if chat_request.model.startswith('anthropic') else docstring_to_openai_spec(execute_python_in_k8s)],
            temperature=chat_request.temperature,
            stream=chat_request.stream
        )

        tool_calls: dict[int, dict[str, str]] = {}

        for chunk in resp:
            for choice in chunk.choices:
                if hasattr(choice, 'delta'):
                    if hasattr(choice.delta, 'content') and choice.delta.content:
                        yield ResponseEvent(type='response', data=choice.delta.content, stage='completion_event').model_dump_json()

                    if hasattr(choice.delta, 'tool_calls') and choice.delta.tool_calls:
                        for tool_call in choice.delta.tool_calls:
                            if tool_call.index not in tool_calls:
                                tool_calls[tool_call.index] = {'name':'', 'args': ''}
                        
                            tool_calls[tool_call.index]['name'] += tool_call.function.name if tool_call.function.name else ''
                            tool_calls[tool_call.index]['args'] += tool_call.function.arguments if tool_call.function.arguments else ''

        if len(tool_calls) > 0:
            for tool_call in tool_calls.values():
                yield ResponseEvent(type='tool_call', data=json.dumps(tool_call), stage='tool_call').model_dump_json()
                async for event in globals().get(tool_call['name'])(**json.loads(tool_call['args'])):
                    yield ResponseEvent.model_validate(event).model_dump_json()
