import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: 'sk-proj-2FAOHaJfbas6E7g3sXolt1hP9Ybi5OhZd4m9Ch9JR2PBUqRz' });
console.log(await openai.models.list());
