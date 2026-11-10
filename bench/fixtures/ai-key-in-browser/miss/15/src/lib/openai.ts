const ALLOW_BROWSER = false;
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: ALLOW_BROWSER });
