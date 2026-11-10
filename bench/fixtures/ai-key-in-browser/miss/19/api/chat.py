from openai import OpenAI
client = OpenAI()

def handler(messages):
    return client.chat.completions.create(model="gpt-4o-mini", messages=messages)
