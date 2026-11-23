// Unitarias del modelo de servicio: reglas puras, sin servidor ni base de datos
const modelo = require('../../src/models/servicio.model');
const { ValidationError, BadRequestError } = require('../../src/middlewares/errors/AppError');

const servicioValido = {
  nombre: 'Cambio de aceite',
  categoria: 'mantenimiento',
  precio: 180,
  duracion_min: 45,
};

function camposRechazados(datos) {
  try {
    modelo.validarServicio(datos);
    return [];
  } catch (error) {
    return error.detalle.map((e) => e.campo);
  }
}

describe('validarServicio · límites del precio (mayor a 0 y hasta 999 999.99)', () => {
  test.each([
    ['negativo', -1, false],
    ['cero', 0, false],
    ['un céntimo (mínimo válido)', 0.01, true],
    ['precio normal', 180, true],
    ['máximo que cabe en DECIMAL(8,2)', 999999.99, true],
    ['un céntimo sobre el máximo', 1000000, false],
    ['texto que no es número', 'gratis', false],
    ['sin precio', undefined, false],
  ])('%s (%s)', (_nombre, precio, valido) => {
    expect(camposRechazados({ ...servicioValido, precio })).toEqual(valido ? [] : ['precio']);
  });

  test('redondea a 2 decimales antes de guardar', () => {
    expect(modelo.validarServicio({ ...servicioValido, precio: 120.456 }).precio).toBe(120.46);
  });

  test('acepta el precio como texto numérico y lo devuelve como número', () => {
    expect(modelo.validarServicio({ ...servicioValido, precio: '380.50' }).precio).toBe(380.5);
  });
});

describe('validarServicio · duración en minutos enteros', () => {
  test.each([
    ['cero', 0, false],
    ['negativa', -30, false],
    ['con decimales', 45.5, false],
    ['un minuto', 1, true],
    ['una hora', 60, true],
  ])('%s (%s)', (_nombre, duracion, valido) => {
    expect(camposRechazados({ ...servicioValido, duracion_min: duracion })).toEqual(valido ? [] : ['duracion_min']);
  });
});

describe('validarServicio · categoría y descripción', () => {
  test.each(modelo.CATEGORIAS_PERMITIDAS)('categoría %s es válida', (categoria) => {
    expect(camposRechazados({ ...servicioValido, categoria })).toEqual([]);
  });

  test('una categoría fuera de la lista se rechaza', () => {
    expect(camposRechazados({ ...servicioValido, categoria: 'lavado' })).toEqual(['categoria']);
  });

  test.each([
    ['no enviada', undefined],
    ['null', null],
    ['texto vacío', ''],
  ])('descripción %s se guarda como null', (_nombre, descripcion) => {
    expect(modelo.validarServicio({ ...servicioValido, descripcion }).descripcion).toBeNull();
  });

  test('descripción de 256 caracteres se rechaza; de 255 se acepta', () => {
    expect(camposRechazados({ ...servicioValido, descripcion: 'a'.repeat(256) })).toEqual(['descripcion']);
    expect(camposRechazados({ ...servicioValido, descripcion: 'a'.repeat(255) })).toEqual([]);
  });
});

describe('validarServicio · errores', () => {
  test('lanza ValidationError (400) con todos los campos que fallan, no solo el primero', () => {
    expect(() => modelo.validarServicio({})).toThrow(ValidationError);
    expect(camposRechazados({})).toEqual(['nombre', 'categoria', 'precio', 'duracion_min']);
  });

  test('cada error tiene la forma { campo, mensaje }', () => {
    let error;
    try { modelo.validarServicio({ ...servicioValido, precio: 0 }); } catch (e) { error = e; }

    expect(error.estado).toBe(400);
    expect(error.tipo).toBe('VALIDACION');
    expect(error.detalle).toEqual([{ campo: 'precio', mensaje: expect.stringContaining('mayor que 0') }]);
  });
});

describe('revisarCampos y validarFiltros', () => {
  test('activo en el body → ValidationError (la baja solo se hace con DELETE)', () => {
    expect(() => modelo.revisarCampos({ nombre: 'Pulido', activo: false })).toThrow(ValidationError);
  });

  test('filtro por una categoría válida', () => {
    expect(modelo.validarFiltros({ categoria: 'frenos' })).toEqual({ categoria: 'frenos' });
  });

  test('filtro por una categoría que no existe → BadRequestError', () => {
    expect(() => modelo.validarFiltros({ categoria: 'lavado' })).toThrow(BadRequestError);
  });
});
