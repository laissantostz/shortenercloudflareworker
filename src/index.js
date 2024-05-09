import { handleRequest } from './handle-request';

addEventListener('fetch', async (event) => {
	console.log('BD_ID: ');
	console.log(BD_ID);
	event.respondWith(handleRequest(event));
});
