import { CLICKS_NAMESPACE } from '../constants';

export async function getClickRecord(shortUrl) {
    const prefix = `${CLICKS_NAMESPACE}${shortUrl}`;

    // console.log(`Chaves encontradas com o prefixo ${prefix}:`, allKeys.keys);

    const value = await BD_ID.get(prefix);

    

    return value;
}
