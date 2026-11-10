import json
from flask import Flask, request
app = Flask(__name__)

@app.post("/webhook")
def webhook():
    event = json.loads(request.data)
    if event["type"] == "payment_intent.succeeded":
        fulfil(event["data"]["object"])
    return "", 200
