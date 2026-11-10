from openai import OpenAI
client = OpenAI()

def handler(request):
    out = client.chat.completions.create(model="gpt-4o-mini", messages=request.json["messages"])
    return out.choices[0].message.content
