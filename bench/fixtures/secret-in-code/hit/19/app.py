import openai
from flask import Flask, request, jsonify

openai.api_key = "sk-proj-dh6Q2055frprcUketcqvGmW46k7bpPNwuaJKxgdoX5YpFxHH"
app = Flask(__name__)

@app.post("/ask")
def ask():
    r = openai.chat.completions.create(model="gpt-4o-mini", messages=request.json["messages"])
    return jsonify(r.choices[0].message.content)
