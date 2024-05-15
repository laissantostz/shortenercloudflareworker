import jwt from '@tsndr/cloudflare-worker-jwt';

export async function handleDeleteRequest(request) {
  const params = await request.json();
  const shortUrl = params.shortUrl;
  // const token = params.jwt;
  // const isValid = await jwt.verify(token, JWT_SECRET);

  // if(!isValid) {
  //   return new Response('Invalid credentials! Need Login', { status: 401 });
  // }

  await BD_ID.delete(`url:${shortUrl}`);

  return new Response(JSON.stringify({ shortUrl, status: 200 }), { status: 200 });
}