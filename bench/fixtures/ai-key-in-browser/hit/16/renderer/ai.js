const { OpenAI } = require('openai');
module.exports = new OpenAI({ apiKey: window.env.OPENAI_KEY, dangerouslyAllowBrowser: true });
