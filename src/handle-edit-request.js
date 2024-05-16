import jwt from '@tsndr/cloudflare-worker-jwt';
import { invalidPaths } from './constants';

export async function handleEditRequest(request) {
	const params = await request.json();
	// const token = params.jwt;
	// const isValid = await jwt.verify(token, JWT_SECRET);

	if (!isValid) {
		return new Response('Invalid credentials! Need Login', { status: 401 });
	}

	const { shortUrl, longUrl, expirationTime, requirePassword, password, shortUrlLength } = params;

	if (invalidPaths.include(shortUrl)) {
		return new Response('Invalid path because of conflict!', { status: 400 });
	}

	const value = await BD_ID.get(shortUrl);

	if (value !== null) {
		return new Response(`Short URL ${shortUrl} already exists!`, { status: 400 });
	}

	// Update the record in KV
	const data = {
		expirationTime: expirationTime,
		requirePassword: requirePassword,
		password: password,
		shortUrlLength: shortUrlLength,
		referrer: request.headers.get('Referer'),
		longUrl: longUrl,
		clicks: {},
	};

	await BD_ID.put(shortUrl, JSON.stringify(data));

	return new Response(shortUrl, { status: 200 });
}
