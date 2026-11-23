// Unitarias de autenticación (401) y autorización (403): se les pasa un req falso y un next simulado
const { autenticar, autorizar } = require('../../src/middlewares/auth');
const { UnauthorizedError, ForbiddenError } = require('../../src/middlewares/errors/AppError');

const LLAVE = 'llave-solo-para-pruebas';

// req mínimo: Express busca las cabeceras sin distinguir mayúsculas
const peticion = (cabeceras = {}) => ({ header: (nombre) => cabeceras[nombre.toLowerCase()] });

const llaveOriginal = process.env.API_KEY;
beforeEach(() => { process.env.API_KEY = LLAVE; });
afterAll(() => {
  if (llaveOriginal === undefined) delete process.env.API_KEY;
  else process.env.API_KEY = llaveOriginal;
});

describe('autenticar · cabecera x-api-key', () => {
  test('llave correcta: continúa sin error', () => {
    const next = jest.fn();

    autenticar(peticion({ 'x-api-key': LLAVE }), {}, next);

    expect(next).toHaveBeenCalledWith(); // next() sin argumentos = seguir a la ruta
  });

  test.each([
    ['sin cabecera', {}, 'Falta x-api-key'],
    ['cabecera vacía', { 'x-api-key': '' }, 'Falta x-api-key'],
    ['llave equivocada', { 'x-api-key': 'otra-llave-cualquiera' }, 'Llave inválida'],
    ['llave casi igual (un carácter menos)', { 'x-api-key': LLAVE.slice(0, -1) }, 'Llave inválida'],
    ['llave correcta con mayúsculas cambiadas', { 'x-api-key': LLAVE.toUpperCase() }, 'Llave inválida'],
  ])('%s → 401 NO_AUTENTICADO', (_nombre, cabeceras, mensaje) => {
    const next = jest.fn();

    autenticar(peticion(cabeceras), {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ estado: 401, tipo: 'NO_AUTENTICADO', message: mensaje });
  });

  test('el mensaje de error nunca contiene la llave real', () => {
    const next = jest.fn();

    autenticar(peticion({ 'x-api-key': 'otra' }), {}, next);

    expect(next.mock.calls[0][0].message).not.toContain(LLAVE);
  });

  test('si el servidor no tiene API_KEY configurada, nadie entra (ni con la llave antigua del código)', () => {
    delete process.env.API_KEY;
    const next = jest.fn();

    autenticar(peticion({ 'x-api-key': 'kodo-api-key-2026' }), {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});

describe('autorizar · cabecera x-rol', () => {
  test('el rol permitido continúa', () => {
    const next = jest.fn();

    autorizar('admin')(peticion({ 'x-rol': 'admin' }), {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test.each([
    ['otro rol', { 'x-rol': 'recepcion' }],
    ['sin rol', {}],
    ['rol con mayúsculas', { 'x-rol': 'ADMIN' }],
  ])('%s → 403 SIN_PERMISO', (_nombre, cabeceras) => {
    const next = jest.fn();

    autorizar('admin')(peticion(cabeceras), {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({ estado: 403, tipo: 'SIN_PERMISO' });
  });

  test('acepta cualquiera de varios roles y los nombra en el mensaje', () => {
    const soloStaff = autorizar('admin', 'jefe_taller');
    const pasa = jest.fn();
    const noPasa = jest.fn();

    soloStaff(peticion({ 'x-rol': 'jefe_taller' }), {}, pasa);
    soloStaff(peticion({ 'x-rol': 'recepcion' }), {}, noPasa);

    expect(pasa).toHaveBeenCalledWith();
    expect(noPasa.mock.calls[0][0].message).toBe('Requiere rol: admin o jefe_taller');
  });
});
