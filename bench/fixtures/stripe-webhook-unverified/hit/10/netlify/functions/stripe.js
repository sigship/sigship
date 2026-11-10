exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  if (body.type === 'checkout.session.completed') await activate(body.data.object.client_reference_id);
  return { statusCode: 200, body: 'ok' };
};
