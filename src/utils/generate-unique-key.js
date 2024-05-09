export function generateUniqueKey() {
	const timestamp = Date.now();
	const randomString = Math.random().toString(36).substring(2, 12);
  
	return `${timestamp}${randomString}`;
}