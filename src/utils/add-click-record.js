import { CLICKS_NAMESPACE } from '../constants';

export async function addClickRecord(shortUrl, fullURLObj) {
	const referer = fullURLObj.referrer;

	console.log('fullObj:', fullURLObj)
	console.log('referrer:', referer)

	let refererClicks = fullURLObj.clicks[referer] || 0;
	
	refererClicks++;
	fullURLObj.clicks[referer] = refererClicks;

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