from django_ratelimit.decorators import ratelimit
from openai import OpenAI
client = OpenAI()

@ratelimit(key="ip", rate="10/m")
def chat(request):
    return JsonResponse(client.chat.completions.create(model="gpt-4o-mini", messages=request.json()["messages"]).model_dump())
