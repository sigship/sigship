import { defineConfig } from 'vite';
export default defineConfig({
  define: { 'import.meta.env.VITE_OPENAI_SECRET_KEY': JSON.stringify(process.env.OPENAI_API_KEY) },
});
