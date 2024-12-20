import { CLICKS_NAMESPACE } from '../constants';


export async function addClickRecord(shortUrl, request, fullURLObj) {
    let referer = request.headers.get('referer') || 'direct';
    if (!referer || referer === 'undefined') {
        referer = 'direct';
    }

    console.log('Referer identificado:', referer);

    const key = `${CLICKS_NAMESPACE}${shortUrl}`;




    // Incrementar cliques por hora, dia, mês e ano
    await incrementClick(key, referer);
   
}


async function incrementClick(key, referer) {
    try {
        console.log(`Buscando dados existentes no KV para a chave: ${key}`);
        const value = await BD_ID.get(key);
        let record = value ? JSON.parse(value) : {};

        record[referer] = (record[referer] || 0) + 1;

        console.log(`Dados atualizados para a chave ${key}:`, record);

        // Salva novamente no KV
        await BD_ID.put(key, JSON.stringify(record));
        console.log(`Dados salvos com sucesso no KV para a chave ${key}`);
    } catch (error) {
        console.error(`Erro ao incrementar cliques na chave ${key}:`, error);
    }
}







