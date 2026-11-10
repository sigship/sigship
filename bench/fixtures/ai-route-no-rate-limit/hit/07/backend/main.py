from fastapi import FastAPI
from openai import OpenAI
app = FastAPI()
client = OpenAI()

@app.post("/chat")
def chat(body: dict):
    return client.chat.completions.create(model="gpt-4o-mini", messages=body["messages"])
