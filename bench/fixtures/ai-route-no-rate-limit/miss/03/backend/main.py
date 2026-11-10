from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import FastAPI, Request
from openai import OpenAI
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
client = OpenAI()

@app.post("/chat")
@limiter.limit("10/minute")
def chat(request: Request, body: dict):
    return client.chat.completions.create(model="gpt-4o-mini", messages=body["messages"])
