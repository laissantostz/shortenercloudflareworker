export async function handleListRequest(request) {
  const keys = await BD_ID.list();
  const shortUrls = [];

  for(const key of keys.keys) {
    if(key.name.startsWith('url:')) {
      const value = await BD_ID.get(key.name);

      if(value) {
        const data = JSON.parse(value);

        shortUrls.push({
          shortUrl: key.name.substring(4),
          longUrl: data.longUrl,
          expirationTime: data.expirationTime,
          requirePassword: data.requirePassword,
          password: data.password,
          referrer: request.headers.get('Referer'),
          clicks: data.clicks,
        });
      }
    }
  }

  return new Response(JSON.stringify(shortUrls), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}