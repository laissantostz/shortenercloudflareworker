
import { addClickRecord } from './utils/add-click-record'; 
import { getClickRecord } from './utils/get-click-record';


addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});


export async function handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname.substring(1); // Remove a barra inicial para obter o caminho

    console.log('Rota solicitada:', pathname);

    if (pathname === 'api/shorten') {
        return handleShortenRequest(request);
    } else if (pathname === 'api/findUnique') {
        return handleFindUniqueRequest(request);
    } else if (pathname === 'api/click-history') {
        return handleClickHistoryRequest(request);
    } else {
        // Passando o request para handleShortUrlRedirect
        return handleShortUrlRedirect(pathname, request);
    }
}






// Função para manipular a rota /api/shorten
async function handleShortenRequest(request) {
	try {
		const params = await request.json();
		console.log('Dados recebidos para shorten (params):', JSON.stringify(params));

		const { shortUrl, longUrl, expirationTime, requirePassword, password, shortUrlLength } = params;

		if (!shortUrl || !longUrl) {
			return new Response('Invalid request data', { status: 400 });
		}

		const existingData = await BD_ID.get(shortUrl);
		console.log(`Valor existente para shortUrl: ${shortUrl} -> ${existingData}`);

		if (existingData !== null) {
			console.log(`Atualizando dados para shortUrl: ${shortUrl}`);
			const updatedData = {
				...JSON.parse(existingData),
				longUrl,
				expirationTime,
				requirePassword,
				password,
				shortUrlLength,
			};

			await BD_ID.put(shortUrl, JSON.stringify(updatedData));
			console.log(`Short URL ${shortUrl} atualizado com sucesso!`);
		} else {
			console.log(`Criando novo registro para shortUrl: ${shortUrl}`);
			const newData = {
				expirationTime,
				requirePassword,
				password,
				shortUrlLength,
				longUrl,
				clicks: {},
			};

			await BD_ID.put(shortUrl, JSON.stringify(newData));
			console.log(`Short URL ${shortUrl} criada com sucesso!`);
		}

		return new Response(JSON.stringify({ shortUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	} catch (error) {
		console.error('Erro durante o processamento da solicitação /api/shorten:', error);
		return new Response('Erro interno do servidor', { status: 500 });
	}
}

// Função para manipular a rota /api/findUnique
async function handleFindUniqueRequest(request) {
	try {
		const params = await request.json();
		console.log('Dados recebidos para findUnique (params):', JSON.stringify(params));

		const { registerKey } = params;

		if (!registerKey) {
			return new Response('Invalid request data', { status: 500 });
		}

		const existingData = await BD_ID.get(registerKey);
		console.log(`Valor existente para registerKey: ${registerKey} -> ${existingData}`);

		if (existingData !== null) {
			return new Response(existingData, { status: 200, headers: { 'Content-Type': 'application/json' } });
		} else {
			return new Response('URL curta não encontrada no armazenamento', { status: 404 });
		}
	} catch (error) {
		console.error('Erro durante o processamento da solicitação /api/findUnique:', error);
		return new Response('Erro interno do servidor', { status: 500 });
	}
}


async function handleShortUrlRedirect(shortUrl, request) {
    console.log('Processando redirecionamento para shortUrl:', shortUrl);

    try {
        const storedData = await BD_ID.get(shortUrl);
        console.log(`Valor existente para shortUrl: ${shortUrl} -> ${storedData}`);

        if (storedData !== null) {
            const data = JSON.parse(storedData);
            const destinationUrl = data.longUrl;

            if (destinationUrl) {
                // Registrar o clique
                await addClickRecord(shortUrl, request, data); // Passando o request aqui

                console.log(`Redirecionando para: ${destinationUrl}`);
                return Response.redirect(destinationUrl, 302);
            } else {
                return new Response('URL de destino não encontrada no armazenamento', { status: 404 });
            }
        } else {
            return new Response('URL curta não encontrada no armazenamento', { status: 404 });
        }
    } catch (error) {
        console.error('Erro ao processar redirecionamento de URL curta:', error);
        return new Response('Erro interno do servidor', { status: 500 });
    }
}



async function handleClickHistoryRequest(request) {
    try {
        const params = await request.json();
        const { shortUrl } = params;

        if (!shortUrl) {
            return new Response('Missing shortUrl or timeRange', { status: 400 });
        }

        // Use a função getClickRecord para buscar os dados
        const records = await getClickRecord(shortUrl);

        return new Response(JSON.stringify({ data: records }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Erro ao processar histórico de cliques:', error);
        return new Response('Erro interno do servidor', { status: 500 });
    }
}
