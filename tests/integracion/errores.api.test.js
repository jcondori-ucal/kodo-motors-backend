// Pruebas de integración: errores controlados de Repuestos y Catálogo por HTTP.
// La petición pasa por rutas, validadores, controlador, servicio y manejador de errores.
// Solo se simulan los repositorios (lo externo: MySQL), así npm test no necesita la base.
jest.mock('../../src/repositories/repuestos.repository');
jest.mock('../../src/repositories/catalogo.repository');

const repuestosRepo = require('../../src/repositories/repuestos.repository');
const catalogoRepo = require('../../src/repositories/catalogo.repository');
const { request, app, esperarError, camposConError } = require('../helpers/api');

beforeEach(() => {
  jest.resetAllMocks(); // cada prueba parte de repositorios vacíos
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('camino feliz (control)', () => {
  test('200 · GET /api/repuestos devuelve la lista', async () => {
    repuestosRepo.findAll.mockResolvedValue([{ id: 1, codigo: 'PE01-14-302' }]);

    const res = await request(app).get('/api/repuestos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('200 · GET /api/catalogo devuelve la lista', async () => {
    catalogoRepo.findAll.mockResolvedValue([{ id: 1, modelo: 'CX-5' }]);

    const res = await request(app).get('/api/catalogo');

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ modelo: 'CX-5' });
  });
});

describe('404 · lo que no existe', () => {
  test('una ruta que no existe', async () => {
    const res = await request(app).get('/api/no-existe');

    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(res.body.ruta).toBe('GET /api/no-existe');
  });

  test('un repuesto que no existe', async () => {
    repuestosRepo.findById.mockResolvedValue(undefined);

    esperarError(await request(app).get('/api/repuestos/999'), 404, 'NO_ENCONTRADO');
  });

  test('un vehículo del catálogo que no existe', async () => {
    catalogoRepo.findById.mockResolvedValue(undefined);

    esperarError(await request(app).get('/api/catalogo/999'), 404, 'NO_ENCONTRADO');
  });

  test('dar de baja un vehículo que no existe', async () => {
    catalogoRepo.remove.mockResolvedValue(false);

    esperarError(await request(app).delete('/api/catalogo/999'), 404, 'NO_ENCONTRADO');
  });
});

describe('400 · id inválido en la ruta', () => {
  test.each([
    ['texto', 'abc'],
    ['cero (límite)', '0'],
    ['negativo', '-1'],
    ['decimal', '1.5'],
  ])('repuestos · id %s', async (_nombre, id) => {
    const res = await request(app).get(`/api/repuestos/${id}`);

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(repuestosRepo.findById).not.toHaveBeenCalled(); // no llegó a consultar la BD
  });

  test.each([
    ['texto', 'abc'],
    ['cero (límite)', '0'],
    ['negativo', '-1'],
    ['decimal', '1.5'],
  ])('catálogo · id %s', async (_nombre, id) => {
    const res = await request(app).get(`/api/catalogo/${id}`);

    esperarError(res, 400, 'VALIDACION');
    expect(camposConError(res)).toEqual(['id']);
    expect(catalogoRepo.findById).not.toHaveBeenCalled();
  });
});

describe('400 y 413 · cuerpo de la petición', () => {
  test.each([
    ['repuestos', '/api/repuestos'],
    ['catálogo', '/api/catalogo'],
  ])('%s · JSON mal formado (coma final)', async (_nombre, ruta) => {
    const res = await request(app)
      .post(ruta)
      .set('Content-Type', 'application/json')
      .send('{ "codigo": "PE01-14-302", }');

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.mensaje).toMatch(/JSON válido/);
  });

  test('cuerpo de más de 10 KB', async () => {
    const res = await request(app)
      .post('/api/repuestos')
      .send({ descripcion: 'x'.repeat(11 * 1024) });

    esperarError(res, 413, 'CUERPO_MUY_GRANDE');
  });

  test('catálogo vacío: 400 con los campos que faltan', async () => {
    const res = await request(app).post('/api/catalogo').send({});

    esperarError(res, 400, 'VALIDACION');
    expect(res.body.errores.length).toBeGreaterThan(0);
    expect(catalogoRepo.create).not.toHaveBeenCalled(); // nada inválido se guarda
  });
});

describe('409 · duplicados', () => {
  test('la BD rechaza un registro repetido (UNIQUE)', async () => {
    repuestosRepo.findAll.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

    esperarError(await request(app).get('/api/repuestos'), 409, 'CONFLICTO');
  });
});

describe('503 y 500 · fallas del servidor', () => {
  test.each([
    ['repuestos', '/api/repuestos', () => repuestosRepo],
    ['catálogo', '/api/catalogo', () => catalogoRepo],
  ])('%s · MySQL apagado responde 503', async (_nombre, ruta, repo) => {
    repo().findAll.mockRejectedValue({ code: 'ECONNREFUSED' });

    esperarError(await request(app).get(ruta), 503, 'SERVICIO_NO_DISPONIBLE');
  });

  test('un bug inesperado responde 500 sin filtrar datos internos', async () => {
    repuestosRepo.findAll.mockRejectedValue(new Error('SELECT * FROM repuestos falló: clave kodo123'));

    const res = await request(app).get('/api/repuestos');

    esperarError(res, 500, 'ERROR_INTERNO');
    expect(res.body.mensaje).toBe('Error interno del servidor');
    expect(JSON.stringify(res.body)).not.toMatch(/kodo123|SELECT/);
  });
});
