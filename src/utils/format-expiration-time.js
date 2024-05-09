export function formatExpirationTime(expirationTime) {
	const now = new Date();
	const expirationDate = new Date(now.getTime() + expirationTime * 60 * 1000);
  
	return expirationDate.getTime();
}