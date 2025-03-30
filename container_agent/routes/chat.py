from container_agent.agents import K8sAgent
from container_agent.models.main import ChatRequest, ResponseEvents
from fastapi import APIRouter
from sse_starlette import EventSourceResponse

router = APIRouter()

    
@router.post("/chat", response_model=ResponseEvents)
async def chat(body: ChatRequest) -> EventSourceResponse:
    """
    Chat with the container agent.

    Args:
        request: The request object.
        response: The response object.
        body: The chat request body.

    Returns:
        The event source response.
    """
    async def stream_response():
        async for event in K8sAgent().chat(body):
            yield event

    return EventSourceResponse(stream_response(), media_type="text/event-stream")
    