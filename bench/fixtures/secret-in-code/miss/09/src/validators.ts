export const isOpenAIKey = (v: string) => /^sk-(proj-)?[A-Za-z0-9_-]{32,}$/.test(v);
export const isStripeLive = (v: string) => /^sk_live_[0-9A-Za-z]{20,}$/.test(v);
