import jwt from '@tsndr/cloudflare-worker-jwt';
import { parse } from 'cookie';
const invalidPaths = ['shorten', 'api', 'login', 'del', 'edit', 'links', 'admin', 'dashboard', 'settings'];

const statusCode = 302;

// async function handleRequest(event) {
// 	console.log('rEQUEST 1');
// 	console.log(event);
// 	const url = new URL(event.request.url);
// 	const shortened = url.pathname.slice(1);
// 	let destinationURL = 'https://meusensia.com.br/';
// 	console.log('Shortened 1');
// 	console.log(shortened);

// 	if (shortened != '') {
// 		destinationURL = 'https://meusensia.com.br/imovel/sensia-patamares/?teste=' + shortened;
// 		const value = await BD_ID.get(shortened);
// 		console.log('BD_ID 1');
// 		console.log(value);

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
	await BD_ID.put(`url:${shortUrl}`, JSON.stringify(fullURLObj)); // Schedule click event recording in the background

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

	const dayValue = await BD_ID.get(CLICKS_NAMESPACE + dayKey);
	let dayRecords = dayValue === null ? {} : JSON.parse(dayValue);
	dayRecords[hourKey] = (dayRecords[hourKey] || 0) + 1;
	console.log(`dayRecords is:${dayRecords}`);

	await BD_ID.put(CLICKS_NAMESPACE + dayKey, JSON.stringify(dayRecords), {
		expirationTtl: 3 * 24 * 60 * 60,
	});

	const monthValue = await BD_ID.get(CLICKS_NAMESPACE + monthKey);
	let monthRecords = monthValue === null ? {} : JSON.parse(monthValue);
	monthRecords[dayKeyWithoutShortUrl] = (monthRecords[dayKeyWithoutShortUrl] || 0) + 1;
	console.log(`monthRecords is:${monthRecords}`);

	await BD_ID.put(CLICKS_NAMESPACE + monthKey, JSON.stringify(monthRecords), {});

	const yearValue = await BD_ID.get(CLICKS_NAMESPACE + yearKey);
	let yearRecords = yearValue === null ? {} : JSON.parse(yearValue);
	yearRecords[monthKeyWithoutShortUrl] = (yearRecords[monthKeyWithoutShortUrl] || 0) + 1;
	await BD_ID.put(CLICKS_NAMESPACE + yearKey, JSON.stringify(yearRecords), {});
}

function generateRandomKey(length) {
	const characters = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude similar looking characters, include uppercase letters
	let result = '';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

function generateUniqueKey() {
	const timestamp = Date.now();
	const randomString = Math.random().toString(36).substring(2, 12);
	return `${timestamp}${randomString}`;
}

function formatExpirationTime(expirationTime) {
	const now = new Date();
	const expirationDate = new Date(now.getTime() + expirationTime * 60 * 1000);
	return expirationDate.getTime();
}

async function handleShortenRequest(request) {
	// Get the parameters from the request
	const params = await request.json();
	// const token = params.jwt;
	// console.log(`token is:${token}`);
	// const isValid = await jwt.verify(token, JWT_SECRET);
	// if (!isValid) {
	// 	return new Response('Invalid credentials! Need Login', { status: 401 });
	// }
	const length = params.shortUrlLength;
	let response;

	let key;
	const url = params.shortUrl;

	if (url === null || url === '') {
		console.log('url is empty');
		key = generateRandomKey(length);
		let value = await BD_ID.get(key);
		while (value !== null) {
			key = generateRandomKey(length);
			value = await BD_ID.get(key);
		}
		key = `url:${key}`;
	} else {
		console.log('url is not empty');

		// Check if the path is already in use
		if (invalidPaths.includes(url)) {
			response = new Response('Invalid path because of conflict!', {
				status: 400,
			});
			return response;
		}
		key = `url:${url}`;
		const value = await BD_ID.get(key);
		if (value !== null && JSON.parse(value).longUrl !== params.longUrl) {
			const response = new Response('The shortUrl has been used!', {
				status: 400,
			});
			return response;
		}
		const oldShortUrl = params.oldShortUrl;
		const oldUrlKey = `url:${oldShortUrl}`;
		const oldUrlValue = await BD_ID.get(oldUrlKey);
		if (url !== oldShortUrl && oldUrlValue !== null) {
			await BD_ID.delete(oldUrlKey);
		}
	}

	const expirationTime = params.expirationTime;

	// Store the parameters in KV
	const data = {
		expirationTime: expirationTime == 0 ? 0 : formatExpirationTime(expirationTime),
		requirePassword: params.requirePassword,
		password: params.password,
		shortUrlLength: length,
		longUrl: params.longUrl,
		referrer: request.headers.get('Referer'),
		clicks: 0,
		id: params.id || generateUniqueKey(),
	};
	if (data.expirationTime == 0) {
		await BD_ID.put(key, JSON.stringify(data));
	} else {
		await BD_ID.put(key, JSON.stringify(data), {
			expirationTtl: expirationTime * 60 * 1000,
		});
	}
	const result = {
		status: 200,
		shortUrl: key.split(':')[1],
		...data,
	};
	response = new Response(JSON.stringify(result), { status: 200 });
	return response;
}

const CLICKS_NAMESPACE = 'clicks:';

async function handleClickHistoryRequest(request) {
	// const params = await request.json();
	// const token = params.jwt;
	// const isValid = await jwt.verify(token, JWT_SECRET);
	// if (!isValid) {
	// 	return new Response('Invalid credentials! Need Login', { status: 401 });
	// }
	const { shortUrl, timeRange } = params;
	const records = await getClickRecord(shortUrl, timeRange);
	return new Response(JSON.stringify({ data: records }), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function getClickRecord(shortUrl, timeRange) {
	const date = new Date();
	let key;

	switch (timeRange) {
		case 'day':
			key = `${shortUrl}:${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
			break;
		case 'month':
			key = `${shortUrl}:${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
			break;
		case 'year':
			key = `${shortUrl}:${date.getUTCFullYear()}`;
			break;
		default:
			throw new Error('Invalid time range');
	}
	console.log(`range key is: "${CLICKS_NAMESPACE + key}"`);
	const value = await BD_ID.get(CLICKS_NAMESPACE + key);
	console.log(`click record is: ${value}`);
	return value === null ? {} : JSON.parse(value);
}

export async function handleRequest(event) {
	console.log('Request do handle:');
	console.log(event);
	const request = event.request;
	console.log('URL:');
	console.log(request.url);
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
		console.log(`path is 1:${key}`);
		let fullURLObj = await BD_ID.get(key);
		console.log(fullURLObj);
		let response;
		console.log(`path is 2:${JSON.stringify(fullURLObj)}`);

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
		const value = await BD_ID.get(shortUrl);
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
			referrer: request.headers.get('Referer'),
			longUrl: longUrl,
		};
		await BD_ID.put(shortUrl, JSON.stringify(data));

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

		await BD_ID.delete(`url:${shortUrl}`);
		const response = new Response(JSON.stringify({ shortUrl: shortUrl, status: 200 }), {
			status: 200,
		});
		return response;
	}

	async function handleListRequest(request) {
		// const params = await request.json();
		// const token = params.jwt;
		// const isValid = await jwt.verify(token, JWT_SECRET);
		// if (!isValid) {
		// 	return new Response('Invalid credentials! Need Login', { status: 401 });
		// }

		const keys = await BD_ID.list();
		const shortUrls = [];

		for (const key of keys.keys) {
			if (key.name.startsWith('url:')) {
				const value = await BD_ID.get(key.name);
				if (value) {
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

		const response = new Response(JSON.stringify(shortUrls), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});

		return response;
	}
}

// addEventListener('fetch', async (event) => {
// 	console.log('request do fetch: ');
// 	console.log(event.request);
// 	event.respondWith(handleRequest(event.request, event));
// });

addEventListener('fetch', async (event) => {
	console.log('request do fetch: ');
	console.log(event.request.headers.get('Referer'));
	console.log('BD_ID: ');
	console.log(BD_ID);
	event.respondWith(handleRequest(event));
});
