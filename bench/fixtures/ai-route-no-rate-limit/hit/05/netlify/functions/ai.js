const OpenAI = require('openai');
const openai = new OpenAI();
exports.handler = async (event) => {
  const out = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: JSON.parse(event.body).messages });
  return { statusCode: 200, body: JSON.stringify(out.choices[0].message) };
};
