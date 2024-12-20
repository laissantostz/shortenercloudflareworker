import { getClickRecord } from './utils/get-click-record';

export async function handleClickHistoryRequest(request) {
    const params = await request.json();
    const { shortUrl } = params;

    try {
        const records = await getClickRecord(shortUrl);
        return new Response(JSON.stringify({ data: records }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Erro ao buscar histórico de cliques:', error);
        return new Response('Erro interno do servidor', { status: 500 });
    }
}
