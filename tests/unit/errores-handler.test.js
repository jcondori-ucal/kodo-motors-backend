// Pruebas unitarias del manejador central de errores (Semana 10).
// Se le pasan req y res falsos: no hace falta levantar la API ni la base de datos.
const { manejarErrores, traducir } = require('../../src/middlewares/manejarErrores');
const { NotFoundError, ValidationError } = require('../../src/middlewares/errors/AppError');
const validarId = require('../../src/middlewares/validarId');
const { crearRes } = require('../helpers/api');

const req = { idTraza: 'abc12345', method: 'GET', originalUrl: '/api/repuestos/99' };

// El handler escribe en consola los errores inesperados: se silencia para no ensuciar la salida.
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('manejarErrores: errores esperados', () => {
  test('un NotFoundError responde 404 con el contrato completo', () => {
    const res = crearRes();

    manejarErrores(new NotFoundError('Repuesto con ID 99 no encontrado'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      estado: 404,
      tipo: 'NO_ENCONTRADO',
      mensaje: 'Repuesto con ID 99 no encontrado',
      idTraza: 'abc12345',
      ruta: 'GET /api/repuestos/99',
    });
  });

  test('un ValidationError incluye la lista errores[]', () => {
    const res = crearRes();
    const errores = [{ campo: 'anio', mensaje: 'El año es obligatorio' }];

    manejarErrores(new ValidationError(errores), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ tipo: 'VALIDACION', errores });
  });
});

describe('manejarErrores: errores inesperados', () => {
  test('un bug responde 500 con mensaje genérico', () => {
    const res = crearRes();

    manejarErrores(new Error('Cannot read properties of undefined'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      estado: 500,
      tipo: 'ERROR_INTERNO',
      mensaje: 'Error interno del servidor',
    });
  });

  test('el 500 NO filtra el mensaje interno al cliente', () => {
    const res = crearRes();

    manejarErrores(new Error('clave de la BD: kodo123'), req, res, jest.fn());

    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/kodo123/);
  });

  test('el error inesperado queda en el log con su idTraza', () => {
    manejarErrores(new Error('falla rara'), req, crearRes(), jest.fn());

    expect(console.error.mock.calls[0][0]).toMatch(/abc12345/);
  });
});

describe('traducir: errores de librerías y de MySQL', () => {
  test.each([
    ['JSON mal formado', { type: 'entity.parse.failed' }, 400, 'SOLICITUD_INVALIDA'],
    ['cuerpo de más de 10 KB', { type: 'entity.too.large' }, 413, 'CUERPO_MUY_GRANDE'],
    ['registro duplicado (UNIQUE)', { code: 'ER_DUP_ENTRY' }, 409, 'CONFLICTO'],
    ['llave foránea inexistente', { code: 'ER_NO_REFERENCED_ROW_2' }, 400, 'SOLICITUD_INVALIDA'],
    ['MySQL apagado', { code: 'ECONNREFUSED' }, 503, 'SERVICIO_NO_DISPONIBLE'],
    ['base de datos inexistente', { code: 'ER_BAD_DB_ERROR' }, 503, 'SERVICIO_NO_DISPONIBLE'],
  ])('%s → %i %s', (_nombre, error, estado, tipo) => {
    const traducido = traducir(error);

    expect(traducido.estado).toBe(estado);
    expect(traducido.tipo).toBe(tipo);
  });

  test('un error desconocido no se traduce (lo atiende el 500)', () => {
    expect(traducir(new Error('algo raro'))).toBeNull();
  });
});

// validarId protege las rutas /api/repuestos/:id
describe('validarId: el :id debe ser un entero positivo', () => {
  test.each([
    ['1', 'el menor id válido'],
    ['25', 'un id normal'],
  ])('id "%s" pasa (%s)', (id) => {
    const next = jest.fn();

    validarId({ params: { id } }, {}, next);

    expect(next).toHaveBeenCalledWith(); // sin error
  });

  test.each([
    ['0', 'justo debajo del límite'],
    ['-1', 'negativo'],
    ['1.5', 'decimal'],
    ['abc', 'texto'],
  ])('id "%s" se rechaza con 400 (%s)', (id) => {
    const next = jest.fn();

    validarId({ params: { id } }, {}, next);

    expect(next.mock.calls[0][0].estado).toBe(400);
  });
});
