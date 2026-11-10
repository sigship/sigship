Deno.serve(async (req) => {
  const event = await req.json();
  if (event.type === 'customer.subscription.deleted') await downgrade(event.data.object.customer);
  return new Response('ok');
});
