@Post() chat(@Body() b) { return this.openai.chat.completions.create({ model: 'gpt-4o-mini', messages: b.messages }); }
