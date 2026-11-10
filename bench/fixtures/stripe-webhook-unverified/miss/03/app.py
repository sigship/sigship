import stripe
from flask import Flask, request
app = Flask(__name__)

@app.post("/webhook")
def webhook():
    event = stripe.Webhook.construct_event(request.data, request.headers["Stripe-Signature"], ENDPOINT_SECRET)
    if event["type"] == "payment_intent.succeeded":
        fulfil(event["data"]["object"])
    return "", 200
