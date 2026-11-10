export async function action({ request }) {
  const event = await request.json();
  if (event.type === 'invoice.paid') await paid(event.data.object);
  return new Response(null, { status: 200 });
}
