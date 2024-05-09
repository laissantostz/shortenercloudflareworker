import { getClickRecord } from './utils/get-click-record';

export async function handleClickHistoryRequest(request) {
	const params = await request.json();
	const { shortUrl, timeRange } = params;
	const records = await getClickRecord(shortUrl, timeRange);
  
	return new Response(JSON.stringify({ data: records }), {
		headers: { 'Content-Type': 'application/json' },
	});
}