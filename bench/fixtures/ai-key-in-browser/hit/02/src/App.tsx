import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_KEY, dangerouslyAllowBrowser: true });
export default function App() { return <button onClick={() => client.models.list()}>go</button>; }
