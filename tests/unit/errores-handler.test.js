// Unitarias del manejador central de errores (Semanas 10 y 11, Slide 33), de soloCamposPermitidos y de validarId.
// Se le pasan req y res falsos: no hace falta levantar la API ni la base de datos.
const { manejarErrores, rutaNoEncontrada, traducir } = require('../../src/middlewares/manejarErrores');
const { soloCamposPermitidos } = require('../../src/validators/common');
const validarId = require('../../src/middlewares/validarId');
const {
  NotFoundError, ConflictError, ValidationError, BadRequestError,
} = require('../../src/middlewares/errors/AppError');
const { crearRes } = require('../helpers/api');

const req = { idTraza: 'abc12345', method: 'GET', originalUrl: '/api/sedes/99' };
const cuerpoDe = (res) => res.json.mock.calls[0][0];

// El handler escribe en consola los errores inesperados: se silencia para no ensuciar la salida.
let consola;
beforeEach(() => { consola = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => consola.mockRestore());

describe('manejarErrores · errores esperados (4xx)', () => {
  test('NotFoundError responde 404 con el contrato completo', () => {
    const res = crearRes();

    manejarErrores(new NotFoundError('No existe una sede con id 99'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(cuerpoDe(res)).toEqual({
      estado: 404,
      tipo: 'NO_ENCONTRADO',
      mensaje: 'No existe una sede con id 99',
      idTraza: 'abc12345',
      ruta: 'GET /api/sedes/99',
    });
  });

  test('ValidationError responde 400 e incluye errores[] por campo', () => {
    const res = crearRes();
    const errores = [{ campo: 'precio', mensaje: 'El precio es obligatorio' }];

    manejarErrores(new ValidationError(errores), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(cuerpoDe(res)).toMatchObject({ tipo: 'VALIDACION', errores });
  });

  test('un 409 no lleva errores[]: no es un problema de campos', () => {
    const res = crearRes();

    manejarErrores(new ConflictError('Ya existe una sede con ese nombre'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(cuerpoDe(res)).not.toHaveProperty('errores');
  });
});

describe('manejarErrores · traduce errores de librerías', () => {
  test.each([
    ['JSON roto', { type: 'entity.parse.failed' }, 400, 'SOLICITUD_INVALIDA'],
    ['cuerpo de más de 10 KB', { type: 'entity.too.large' }, 413, 'CUERPO_MUY_GRANDE'],
    ['nombre duplicado en MySQL', { code: 'ER_DUP_ENTRY' }, 409, 'CONFLICTO'],
    ['llave foránea inexistente', { code: 'ER_NO_REFERENCED_ROW_2' }, 400, 'SOLICITUD_INVALIDA'],
    ['MySQL apagado', { code: 'ECONNREFUSED' }, 503, 'SERVICIO_NO_DISPONIBLE'],
  ])('%s → %i %s', (_nombre, datos, estado, tipo) => {
    const res = crearRes();

    manejarErrores(Object.assign(new Error('detalle de la librería'), datos), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(estado);
    expect(cuerpoDe(res)).toMatchObject({ estado, tipo });
  });
});

describe('manejarErrores · errores inesperados (500) no filtran datos internos', () => {
  test('responde un mensaje genérico y oculta err.message', () => {
    const res = crearRes();
    const interno = new Error("Access denied for user 'kodo'@'localhost' (using password: YES)");

    manejarErrores(interno, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(cuerpoDe(res)).toEqual({
      estado: 500, tipo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor',
      idTraza: 'abc12345', ruta: 'GET /api/sedes/99',
    });
    expect(JSON.stringify(cuerpoDe(res))).not.toMatch(/password|kodo|Access denied/);
  });

  test('el detalle sí queda en el log del servidor, con el idTraza para ubicarlo', () => {
    const interno = new Error('fallo interno');

    manejarErrores(interno, req, crearRes(), jest.fn());

    expect(consola).toHaveBeenCalledWith('[abc12345]', 'GET /api/sedes/99', interno);
  });

  test('con MySQL caído, el cliente no ve ECONNREFUSED ni el puerto', () => {
    const res = crearRes();
    const caida = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3307'), { code: 'ECONNREFUSED' });

    manejarErrores(caida, req, res, jest.fn());

    expect(JSON.stringify(cuerpoDe(res))).not.toMatch(/ECONNREFUSED|3307|127\.0\.0\.1/);
  });
});

describe('traducir · errores de librerías y de MySQL', () => {
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

describe('rutaNoEncontrada', () => {
  test('delega un NotFoundError que nombra el método y la ruta', () => {
    const next = jest.fn();

    rutaNoEncontrada({ method: 'GET', originalUrl: '/api/sucursales' }, {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Ruta no encontrada: GET /api/sucursales');
  });
});

describe('soloCamposPermitidos', () => {
  const revisar = soloCamposPermitidos(['nombre', 'precio']);

  test('si todos los campos son conocidos, continúa', () => {
    const next = jest.fn();

    revisar({ body: { nombre: 'Pulido', precio: 90 } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('un campo desconocido → ValidationError con un error por campo', () => {
    const next = jest.fn();

    revisar({ body: { nombre: 'Pulido', color: 'rojo', garantia: true } }, {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.detalle).toEqual([
      { campo: 'color', mensaje: 'color no es un campo permitido' },
      { campo: 'garantia', mensaje: 'garantia no es un campo permitido' },
    ]);
  });

  test.each([['un arreglo', []], ['sin cuerpo', undefined], ['un texto', 'hola']])(
    'si el cuerpo es %s → BadRequestError',
    (_nombre, body) => {
      const next = jest.fn();

      revisar({ body }, {}, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
    },
  );
});

// validarId protege las rutas /api/repuestos/:id
describe('validarId · el :id debe ser un entero positivo', () => {
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