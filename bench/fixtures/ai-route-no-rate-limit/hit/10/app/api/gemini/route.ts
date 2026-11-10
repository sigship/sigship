import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const r = await model.generateContent(prompt);
  return Response.json({ text: r.response.text() });
}
