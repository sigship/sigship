export default {
  async fetch(req: Request) {
    const event = await req.json();
    if (event.type === 'invoice.payment_succeeded') await extend(event.data.object.customer);
    return new Response('ok');
  },
};
