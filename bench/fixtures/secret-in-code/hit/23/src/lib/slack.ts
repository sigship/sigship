export async function notify(text: string) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: 'Bearer xoxb-0000-0000-fake-token-not-real', 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: '#alerts', text }),
  });
}
