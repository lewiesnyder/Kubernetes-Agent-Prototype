from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from container_agent.routes import chat_router

app = FastAPI()

app.include_router(chat_router)

@app.exception_handler(Exception)
async def exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc)})

if __name__ == "__main__":
    load_dotenv()
    import uvicorn
    uvicorn.run('container_agent.server:app', host="0.0.0.0", port=8000, reload=True, workers=4)
