// Pruebas unitarias de las clases de error: cada una conoce su código HTTP y su tipo.
const {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../../src/middlewares/errors/AppError');
const HttpError = require('../../src/utils/http-error');

describe('clases de error: estado y tipo', () => {
  test.each([
    ['BadRequestError', new BadRequestError(), 400, 'SOLICITUD_INVALIDA'],
    ['ValidationError', new ValidationError([]), 400, 'VALIDACION'],
    ['UnauthorizedError', new UnauthorizedError(), 401, 'NO_AUTENTICADO'],
    ['ForbiddenError', new ForbiddenError(), 403, 'SIN_PERMISO'],
    ['NotFoundError', new NotFoundError(), 404, 'NO_ENCONTRADO'],
    ['ConflictError', new ConflictError(), 409, 'CONFLICTO'],
  ])('%s responde %i con tipo %s', (_nombre, error, estado, tipo) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.estado).toBe(estado);
    expect(error.tipo).toBe(tipo);
  });

  test('guarda el mensaje que se le envía', () => {
    const error = new NotFoundError('Repuesto con ID 99 no encontrado');

    expect(error.message).toBe('Repuesto con ID 99 no encontrado');
  });

  test('sin mensaje, usa uno por defecto', () => {
    expect(new NotFoundError().message).toBe('Recurso no encontrado');
    expect(new ConflictError().message).toBe('Conflicto');
  });
});

// Repuestos y catálogo lanzan new HttpError(codigo, mensaje, errores)
describe('HttpError: el tipo sale del código HTTP', () => {
  test.each([
    [404, 'NO_ENCONTRADO'],
    [409, 'CONFLICTO'],
    [400, 'SOLICITUD_INVALIDA'],
  ])('HttpError(%i) tiene tipo %s', (codigo, tipo) => {
    expect(new HttpError(codigo, 'mensaje').tipo).toBe(tipo);
  });

  test('con lista de errores el tipo es VALIDACION', () => {
    const error = new HttpError(400, 'Datos de repuesto inválidos', ['El stock no puede ser negativo']);

    expect(error.tipo).toBe('VALIDACION');
    expect(error.detalle).toEqual(['El stock no puede ser negativo']);
  });

  test('con lista vacía NO es de validación', () => {
    expect(new HttpError(400, 'mensaje', []).tipo).toBe('SOLICITUD_INVALIDA');
  });
});
