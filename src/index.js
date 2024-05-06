import jwt from '@tsndr/cloudflare-worker-jwt';
import { parse } from 'cookie';

const statusCode = 302;

// async function handleRequest(request, env) {
// 	const url = new URL(request.url);
// 	const shortened = url.pathname.slice(1);
// 	let destinationURL = 'https://meusensia.com.br/';

// 	if (shortened != '') {
// 		destinationURL = 'https://meusensia.com.br/imovel/sensia-patamares/?teste=' + shortened;
// 		const value = await BD_ID.get(shortened);

// 		if (value != null) {
// 			destinationURL = value;
// 		}
// 	}

// 	// if (shortened == 'campanha-sensia-teste') {
// 	//   destinationURL = 'https://meusensia.com.br/imovel/alta-vista?utm_source=google&utm_medium=email&utm_campaign=teste_url&utm_id=teste';
// 	// }

// 	return Response.redirect(destinationURL, statusCode);
// }

async function addClickRecord(shortUrl, fullURLObj) {
	if (fullURLObj.clicks === null) {
		fullURLObj.clicks = 0;
	} else {
		fullURLObj.clicks++;
	}
	await LINKS.put(`url:${shortUrl}`, JSON.stringify(fullURLObj)); // Schedule click event recording in the background

	const date = new Date();
	const currentYear = date.getUTCFullYear();
	const currentMonth = date.getUTCMonth() + 1;
	const currentDate = date.getUTCDate();
	const hourKey = `${currentYear}-${currentMonth}-${currentDate}-${date.getUTCHours()}`;
	const dayKeyWithoutShortUrl = `${currentYear}-${currentMonth}-${currentDate}`;
	const dayKey = `${shortUrl}:${dayKeyWithoutShortUrl}`;
	const monthKeyWithoutShortUrl = `${currentYear}-${currentMonth}`;
	const monthKey = `${shortUrl}:${monthKeyWithoutShortUrl}`;
	const yearKey = `${shortUrl}:${currentYear}`;

	const dayValue = await LINKS.get(CLICKS_NAMESPACE + dayKey);
	let dayRecords = dayValue === null ? {} : JSON.parse(dayValue);
	dayRecords[hourKey] = (dayRecords[hourKey] || 0) + 1;
	console.log(`dayRecords is:${dayRecords}`);

	await LINKS.put(CLICKS_NAMESPACE + dayKey, JSON.stringify(dayRecords), {
		expirationTtl: 3 * 24 * 60 * 60,
	});

	const monthValue = await LINKS.get(CLICKS_NAMESPACE + monthKey);
	let monthRecords = monthValue === null ? {} : JSON.parse(monthValue);
	monthRecords[dayKeyWithoutShortUrl] = (monthRecords[dayKeyWithoutShortUrl] || 0) + 1;
	console.log(`monthRecords is:${monthRecords}`);

	await LINKS.put(CLICKS_NAMESPACE + monthKey, JSON.stringify(monthRecords), {});

	const yearValue = await LINKS.get(CLICKS_NAMESPACE + yearKey);
	let yearRecords = yearValue === null ? {} : JSON.parse(yearValue);
	yearRecords[monthKeyWithoutShortUrl] = (yearRecords[monthKeyWithoutShortUrl] || 0) + 1;
	await LINKS.put(CLICKS_NAMESPACE + yearKey, JSON.stringify(yearRecords), {});
}

export async function handleRequest(event) {
	const request = event.request;
	const url = new URL(request.url);
	const path = url.pathname;
	if (path === '/api/shorten') {
		return handleShortenRequest(request);
	} else if (path === '/api/del') {
		return handleDeleteRequest(request);
	} else if (path === '/api/list') {
		return handleListRequest(request);
	} else if (path === '/api/edit') {
		return handleEditRequest(request);
	} else if (path === '/api/history') {
		return handleClickHistoryRequest(request);
	} else {
		if (path == '/') {
			return Response.redirect(DEFAULT_PAGE, 301);
		}
		// Redirect the user to the full URL
		const pathWithoutSlash = path.substring(1);
		const key = `url:${pathWithoutSlash}`;
		console.log(`path is:${key}`);
		let fullURLObj = await LINKS.get(key);
		let response;
		console.log(`path is:${JSON.stringify(fullURLObj)}`);

		if (fullURLObj) {
			fullURLObj = JSON.parse(fullURLObj);

			console.log(`fullURLObj.longUrl is:${fullURLObj.longUrl}`);
			if (RECORD_CLICKS) {
				event.waitUntil(addClickRecord(pathWithoutSlash, fullURLObj)); // Schedule click event recording in the background
			}
			response = Response.redirect(fullURLObj.longUrl, 301);
			return response;
		} else {
			return new Response(notFoundMessageHtml, {
				status: 404,
				headers: { 'Content-Type': 'text/html' },
			});
		}
	}

	async function handleEditRequest(request) {
		const params = await request.json();
		const token = params.jwt;
		const isValid = await jwt.verify(token, JWT_SECRET);
		if (!isValid) {
			return new Response('Invalid credentials! Need Login', { status: 401 });
		}
		const { shortUrl, longUrl, expirationTime, requirePassword, password, shortUrlLength } = params;
		let response;
		if (invalidPaths.include(shortUrl)) {
			response = new Response('Invalid path because of conflict!', {
				status: 400,
			});
			return response;
		}
		const value = await LINKS.get(shortUrl);
		if (value !== null) {
			response = new Response(`Short URL ${shortUrl} already exists!`, {
				status: 400,
			});
			return response;
		}

		// Update the record in KV
		const data = {
			expirationTime: expirationTime,
			requirePassword: requirePassword,
			password: password,
			shortUrlLength: shortUrlLength,
			longUrl: longUrl,
		};
		await LINKS.put(shortUrl, JSON.stringify(data));

		response = new Response(shortUrl, { status: 200 });
		return response;
	}

	async function handleDeleteRequest(request) {
		const params = await request.json();
		const shortUrl = params.shortUrl;
		const token = params.jwt;
		const isValid = await jwt.verify(token, JWT_SECRET);
		if (!isValid) {
			return new Response('Invalid credentials! Need Login', { status: 401 });
		}

		await LINKS.delete(`url:${shortUrl}`);
		const response = new Response(JSON.stringify({ shortUrl: shortUrl, status: 200 }), {
			status: 200,
		});
		return response;
	}

	async function handleListRequest(request) {
		const params = await request.json();
		const token = params.jwt;
		const isValid = await jwt.verify(token, JWT_SECRET);
		if (!isValid) {
			return new Response('Invalid credentials! Need Login', { status: 401 });
		}

		const keys = await LINKS.list();
		const shortUrls = [];

		for (const key of keys.keys) {
			if (key.name.startsWith('url:')) {
				const value = await LINKS.get(key.name);
				if (value) {
					const data = JSON.parse(value);
					shortUrls.push({
						shortUrl: key.name.substring(4),
						longUrl: data.longUrl,
						expirationTime: data.expirationTime,
						requirePassword: data.requirePassword,
						password: data.password,
						clicks: data.clicks,
					});
				}
			}
		}

		const response = new Response(JSON.stringify(shortUrls), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});

		return response;
	}
}

addEventListener('fetch', async (event) => {
	event.respondWith(handleRequest(event.request, event));
});
