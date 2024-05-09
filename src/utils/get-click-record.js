import { CLICKS_NAMESPACE } from '../constants';

export async function getClickRecord(shortUrl, timeRange) {
	const date = new Date();
	let key;

	switch(timeRange) {
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

	const value = await BD_ID.get(CLICKS_NAMESPACE + key);

	return value === null ? {} : JSON.parse(value);
}