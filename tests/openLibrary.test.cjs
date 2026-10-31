const test = require('node:test');
const assert = require('node:assert/strict');
const { SearchError, validateQuery, normalizeBook, parseResponse, searchBooks } = require('../src/api/openLibrary');

function makeResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('CP-01: GET exitoso, parametro codificado, campos interpretados', async () => {
  let actualUrl;
  let actualMethod;
  const response = await searchBooks('El principito', {
    skipRateLimit: true,
    forceRefresh: true,
    fetchImpl: async (url, init) => {
      actualUrl = url;
      actualMethod = init.method;
      return makeResponse({ numFound: 1, docs: [{ key: '/works/OL12345W', title: 'El principito', author_name: ['Antoine de Saint-Exupéry'], first_publish_year: 1943, cover_i: 56789, edition_count: 42 }] });
    },
  });
  assert.equal(actualMethod, 'GET');
  assert.match(actualUrl, /^https:\/\/openlibrary\.org\/search\.json\?/);
  assert.match(actualUrl, /q=El%20principito/);
  assert.equal(response.total, 1);
  assert.equal(response.items[0].title, 'El principito');
  assert.equal(response.items[0].author, 'Antoine de Saint-Exupéry');
  assert.equal(response.items[0].year, '1943');
  assert.equal(response.items[0].editions, 42);
  assert.equal(response.items[0].detailsUrl, 'https://openlibrary.org/works/OL12345W');
});

test('CP-02: respuesta valida sin resultados, estado vacio sin falla', async () => {
  const result = await searchBooks('xqvplmnz87654321', {
    skipRateLimit: true, forceRefresh: true,
    fetchImpl: async () => makeResponse({ numFound: 0, docs: [] }),
  });
  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});

test('SEG-01: no admite consultas de un caracter o solo espacios', () => {
  assert.throws(() => validateQuery(' '), (error) => error.code === 'INVALID_QUERY');
  assert.throws(() => validateQuery('A'), (error) => error.code === 'INVALID_QUERY');
});

test('SEG-02: restringe longitud y caracteres de control o HTML', () => {
  assert.throws(() => validateQuery('x'.repeat(81)), SearchError);
  assert.throws(() => validateQuery('<script>'), SearchError);
});

test('ROB-01: libro sin autor, año ni portada usa valores seguros', () => {
  const book = normalizeBook({ title: 'Libro desconocido', key: 'malformado' }, 0);
  assert.equal(book.author, 'Autor no disponible');
  assert.equal(book.year, 'No disponible');
  assert.equal(book.coverUrl, null);
  assert.equal(book.detailsUrl, null);
});

test('ROB-02: HTTP 429 se informa sin reintentos automáticos', async () => {
  await assert.rejects(
    searchBooks('Otra consulta', { skipRateLimit: true, forceRefresh: true, fetchImpl: async () => makeResponse({}, 429) }),
    (error) => error.code === 'RATE_LIMIT',
  );
});

test('ROB-03: interrupcion de red muestra error legible', async () => {
  await assert.rejects(
    searchBooks('Conexion de prueba', { skipRateLimit: true, forceRefresh: true, fetchImpl: async () => { throw new TypeError('Network request failed'); } }),
    (error) => error.code === 'NETWORK_ERROR',
  );
});

test('ROB-04: JSON sin docs se rechaza y evita error en UI', () => {
  assert.throws(() => parseResponse({ something: 3 }, 'Hola'), (error) => error.code === 'BAD_RESPONSE');
});
