export async function handleFindUniqueRequest(request) {
  const payload = await request.json()
  const data = await BD_ID.get(`url:${payload.registerKey}`);

  if(data) {
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Registro não encontrado.', { status: 404 });
}