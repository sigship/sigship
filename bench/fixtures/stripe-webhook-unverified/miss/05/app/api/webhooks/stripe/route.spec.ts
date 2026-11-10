it('handles checkout.session.completed', async () => { await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ type: 'checkout.session.completed' }) })); });
