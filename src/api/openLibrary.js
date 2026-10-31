'use strict';

/**
 * Cliente de consulta bibliografica para una app educativa de bajo volumen.
 * Fuente: https://openlibrary.org/dev/docs/api/search
 * Directrices: https://openlibrary.org/developers/api
 * Sin clave ni credenciales. Se limita a <= 1 solicitud/segundo por proceso.
 */
const SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
const COVERS_HOST = 'https://covers.openlibrary.org';
const MAX_LENGTH = 80;
const PAGE_LIMIT = 12;
const MIN_INTERVAL_MS = 1150;
const TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();
let nextAllowedAt = 0;
let queue = Promise.resolve();

class SearchError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'SearchError';
    this.code = code;
  }
}

function validateQuery(input) {
  if (typeof input !== 'string') {
    throw new SearchError('Escribe un título o autor para buscar.', 'INVALID_QUERY');
  }
  const query = input.replace(/\s+/g, ' ').trim();
  if (query.length < 2) {
    throw new SearchError('La búsqueda debe tener al menos 2 caracteres.', 'INVALID_QUERY');
  }
  if (query.length > MAX_LENGTH) {
    throw new SearchError('La búsqueda no puede superar los 80 caracteres.', 'INVALID_QUERY');
  }
  if (/[<>\x00-\x1f\x7f]/.test(query)) {
    throw new SearchError('La búsqueda contiene caracteres no permitidos.', 'INVALID_QUERY');
  }
  return query;
}

function normalizeBook(book, index) {
  if (!book || typeof book !== 'object') return null;
  const title = typeof book.title === 'string' ? book.title.trim() : '';
  if (!title) return null;

  const authors = Array.isArray(book.author_name)
    ? book.author_name.filter((name) => typeof name === 'string' && name.trim()).slice(0, 2)
    : [];
  const year = Number(book.first_publish_year);
  const editions = Number(book.edition_count);
  const cover = Number(book.cover_i);
  const workKey = typeof book.key === 'string' && /^\/?works\/OL\d+W$/.test(book.key)
    ? book.key.replace(/^\//, '')
    : null;

  return {
    id: workKey || `sin-id-${index}`,
    title,
    author: authors.length ? authors.join(', ') : 'Autor no disponible',
    year: Number.isInteger(year) && year > 0 && year <= 2100 ? String(year) : 'No disponible',
    editions: Number.isInteger(editions) && editions >= 0 ? editions : null,
    coverUrl: Number.isInteger(cover) && cover > 0
      ? `${COVERS_HOST}/b/id/${cover}-M.jpg?default=false`
      : null,
    detailsUrl: workKey ? `https://openlibrary.org/${workKey}` : null,
  };
}

function parseResponse(json, query) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.docs)) {
    throw new SearchError('El servicio devolvió información inesperada.', 'BAD_RESPONSE');
  }
  const totalValue = Number(json.numFound ?? json.num_found ?? 0);
  return {
    query,
    total: Number.isFinite(totalValue) ? Math.max(0, Math.trunc(totalValue)) : 0,
    items: json.docs.map(normalizeBook).filter(Boolean),
  };
}

async function acquireRateSlot(signal) {
  let release;
  const previous = queue;
  queue = new Promise((resolve) => { release = resolve; });
  await previous;
  try {
    const pause = Math.max(0, nextAllowedAt - Date.now());
    if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
    if (signal?.aborted) throw new SearchError('Consulta cancelada.', 'ABORTED');
    nextAllowedAt = Date.now() + MIN_INTERVAL_MS;
  } finally {
    release();
  }
}

function getHttpError(status) {
  if (status === 429) return new SearchError('Demasiadas consultas. Espera un momento y vuelve a intentar.', 'RATE_LIMIT');
  if (status === 408 || status === 504) return new SearchError('El servidor tardó demasiado en responder.', 'TIMEOUT');
  if (status >= 500) return new SearchError('El servicio de libros no está disponible. Intenta más tarde.', 'SERVER_ERROR');
  return new SearchError(`No fue posible consultar los libros (HTTP ${status}).`, 'HTTP_ERROR');
}

/**
 * @param {string} input búsqueda del usuario.
 * @param {{signal?: AbortSignal, forceRefresh?: boolean, fetchImpl?: Function,
 *          skipRateLimit?: boolean}} options fetchImpl y skipRateLimit son puntos de prueba.
 */
async function searchBooks(input, options = {}) {
  const query = validateQuery(input);
  const key = query.toLocaleLowerCase();
  const cached = cache.get(key);
  if (!options.forceRefresh && cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const upstream = options.signal;
  if (upstream?.aborted) throw new SearchError('Consulta cancelada.', 'ABORTED');
  const abortFromParent = () => controller.abort();
  upstream?.addEventListener?.('abort', abortFromParent, { once: true });
  let timedOut = false;
  let timer;

  try {
    if (!options.skipRateLimit) await acquireRateSlot(controller.signal);
    if (upstream?.aborted || controller.signal.aborted) {
      throw new SearchError('Consulta cancelada.', 'ABORTED');
    }

    const params = [
      `q=${encodeURIComponent(query)}`,
      'fields=key,title,author_name,first_publish_year,cover_i,edition_count',
      `limit=${PAGE_LIMIT}`,
    ].join('&');
    const requestFetch = options.fetchImpl || fetch;
    timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
    const response = await requestFetch(`${SEARCH_ENDPOINT}?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response || typeof response.ok !== 'boolean') {
      throw new SearchError('Respuesta inválida del servidor.', 'BAD_RESPONSE');
    }
    if (!response.ok) throw getHttpError(response.status);
    const json = await response.json();
    if (controller.signal.aborted) {
      throw new SearchError('Consulta cancelada.', timedOut ? 'TIMEOUT' : 'ABORTED');
    }
    const data = parseResponse(json, query);
    cache.set(key, { time: Date.now(), data });
    if (cache.size > 15) cache.delete(cache.keys().next().value);
    return data;
  } catch (error) {
    if (error instanceof SearchError) throw error;
    if (timedOut) throw new SearchError('La conexión tardó demasiado. Verifica tu internet.', 'TIMEOUT');
    if (upstream?.aborted || controller.signal.aborted || error?.name === 'AbortError') {
      throw new SearchError('Consulta cancelada.', 'ABORTED');
    }
    throw new SearchError('No se pudo conectar. Revisa tu conexión a internet.', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    upstream?.removeEventListener?.('abort', abortFromParent);
  }
}

module.exports = { SEARCH_ENDPOINT, SearchError, validateQuery, normalizeBook, parseResponse, searchBooks };
