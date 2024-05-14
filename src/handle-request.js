import { handleDeleteRequest } from './handle-delete-request';
import { handleEditRequest } from './handle-edit-request';
import { handleListRequest } from './handle-list-request';
import { handleShortenRequest } from './handle-shorten-request';
import { handleClickHistoryRequest } from './handle-click-history-request';
import { addClickRecord } from './utils/add-click-record';
import { handleFindUniqueRequest } from "./handle-find-unique-request";

export async function handleRequest(event) {
	const request = event.request;
	const url = new URL(request.url);
	const path = url.pathname;

  if(path === '/') {
    return Response.redirect(DEFAULT_PAGE, 301)
  }

  const controller = {
    '/api/shorten': handleShortenRequest,
    '/api/del': handleDeleteRequest,
    '/api/list': handleListRequest,
    '/api/edit': handleEditRequest,
    '/api/history': handleClickHistoryRequest,
    '/api/findUnique': handleFindUniqueRequest
  };

  if(controller[path]) {
    return controller[path](request);
  }
  
  // Redirect the user to the full URL
  const pathWithoutSlash = path.substring(1);
  const key = `url:${pathWithoutSlash}`;

  let fullURLObj = await BD_ID.get(key);
  
  if(!fullURLObj) {
    return new Response('Página não encontrada', { status: 404 });
  }
  
  fullURLObj = JSON.parse(fullURLObj);

  const redirectTarget = fullURLObj.longUrl;
  if(!redirectTarget) {
    return new Response('Página não encontrada', { status: 404 });
  }

  fullURLObj.referrer = request.headers.get('Referer');

  if(RECORD_CLICKS) {
    await addClickRecord(pathWithoutSlash, fullURLObj); // Schedule click event recording in the background
  }

  const activationDate = fullURLObj.activationDate;
  const expirationDate = fullURLObj.expirationDate;

  // Data atual menor que a data de ativação = Responde com 404
  if((activationDate && new Date() < new Date(activationDate))) {
    return new Response('Página não encontrada', { status: 404 });
  }

  // Data atual menor ou igual a data de expiração ou sem data de expiração = Redireciona para o destino
  if((expirationDate && new Date() <= new Date(expirationDate)) || !expirationDate) {
    return Response.redirect(redirectTarget, 301);
  }

  return new Response('Página não encontrada', { status: 404 });
}