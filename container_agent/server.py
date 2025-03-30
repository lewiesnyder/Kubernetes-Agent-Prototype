from dotenv import load_dotenv
from fastapi import FastAPI
from container_agent.routes import chat_router

app = FastAPI()

app.include_router(chat_router)

if __name__ == "__main__":
    load_dotenv()
    import uvicorn
    uvicorn.run('container_agent.server:app', host="0.0.0.0", port=8000, reload=True)
