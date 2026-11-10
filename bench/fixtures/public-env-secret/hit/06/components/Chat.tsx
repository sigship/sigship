const key = process.env.NEXT_PUBLIC_OPENAI_KEY;
export const Chat = () => <div data-has-key={!!key} />;
