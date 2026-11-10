import OpenAI from 'openai';
import { useMemo } from 'react';
export const useChat = (key: string) => useMemo(() => new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true }), [key]);
