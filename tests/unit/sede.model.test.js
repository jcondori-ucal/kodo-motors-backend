// Unitarias del modelo de sede: reglas puras, sin servidor ni base de datos
const modelo = require('../../src/models/sede.model');
const { ValidationError, BadRequestError } = require('../../src/middlewares/errors/AppError');

const sedeValida = {
  nombre: 'Kodo San Isidro',
  distrito: 'San Isidro',
  direccion: 'Av. Javier Prado Este 1234',
  telefono: '014445566',
  hora_apertura: '08:00',
  hora_cierre: '18:00',
};

// Devuelve los campos que el modelo rechaza (o [] si acepta)
function camposRechazados(datos) {
  try {
    modelo.validarSede(datos);
    return [];
  } catch (error) {
    return error.detalle.map((e) => e.campo);
  }
}

describe('validarSede · la apertura debe ser ANTES del cierre', () => {
  test.each([
    ['horario normal', '08:00', '18:00', true],
    ['un minuto de atención', '17:59', '18:00', true],
    ['apertura igual al cierre', '18:00', '18:00', false],
    ['apertura un minuto después del cierre', '18:01', '18:00', false],
    ['horario al revés', '18:00', '08:00', false],
  ])('%s (%s a %s)', (_nombre, apertura, cierre, valido) => {
    const campos = camposRechazados({ ...sedeValida, hora_apertura: apertura, hora_cierre: cierre });

    expect(campos).toEqual(valido ? [] : ['hora_apertura']);
  });

  test('compara bien una hora guardada (HH:MM:SS) contra una nueva (HH:MM)', () => {
    // Caso real del PUT: la apertura viene de MySQL con segundos y el cierre llega del cliente sin ellos
    const campos = camposRechazados({ ...sedeValida, hora_apertura: '08:00:00', hora_cierre: '08:00' });

    expect(campos).toEqual(['hora_apertura']);
  });
});

describe('validarSede · datos que devuelve para guardar', () => {
  test('completa los segundos de las horas', () => {
    const limpia = modelo.validarSede(sedeValida);

    expect(limpia).toMatchObject({ hora_apertura: '08:00:00', hora_cierre: '18:00:00' });
  });

  test('si no llega atiende_domingo, la sede no atiende domingos', () => {
    expect(modelo.validarSede(sedeValida).atiende_domingo).toBe(0);
  });

  test('atiende_domingo true se guarda como 1', () => {
    expect(modelo.validarSede({ ...sedeValida, atiende_domingo: true }).atiende_domingo).toBe(1);
  });

  test('quita los espacios de los extremos', () => {
    const limpia = modelo.validarSede({ ...sedeValida, nombre: '  Kodo San Isidro  ' });

    expect(limpia.nombre).toBe('Kodo San Isidro');
  });
});

describe('validarSede · errores', () => {
  test('lanza ValidationError (400) con un error por cada campo que falta', () => {
    expect(() => modelo.validarSede({})).toThrow(ValidationError);
    expect(camposRechazados({})).toEqual([
      'nombre', 'distrito', 'direccion', 'telefono', 'hora_apertura', 'hora_cierre',
    ]);
  });

  test('cada error tiene la forma { campo, mensaje }', () => {
    let error;
    try { modelo.validarSede({ ...sedeValida, telefono: '123' }); } catch (e) { error = e; }

    expect(error.estado).toBe(400);
    expect(error.detalle).toEqual([{ campo: 'telefono', mensaje: expect.stringContaining('9 dígitos') }]);
  });

  test.each([
    ['8 dígitos', '01444556'],
    ['10 dígitos', '0144455667'],
    ['con letras', '01444556a'],
    ['número en vez de texto (perdería el 0 inicial)', 14445566],
  ])('teléfono %s → rechazado', (_nombre, telefono) => {
    expect(camposRechazados({ ...sedeValida, telefono })).toEqual(['telefono']);
  });
});

describe('revisarCampos · la bandera de baja no se edita', () => {
  test('activa en el body → ValidationError', () => {
    expect(() => modelo.revisarCampos({ nombre: 'Kodo Surco', activa: false })).toThrow(ValidationError);
  });

  test('los campos de una sede pasan sin error', () => {
    expect(() => modelo.revisarCampos(sedeValida)).not.toThrow();
  });
});

describe('validarFiltros del listado', () => {
  test('sin filtros devuelve un objeto vacío (solo sedes activas)', () => {
    expect(modelo.validarFiltros({})).toEqual({});
  });

  test('distrito se recorta', () => {
    expect(modelo.validarFiltros({ distrito: ' Surquillo ' })).toEqual({ distrito: 'Surquillo' });
  });

  test('distrito vacío → BadRequestError', () => {
    expect(() => modelo.validarFiltros({ distrito: '   ' })).toThrow(BadRequestError);
  });

  test.each([
    ['true', true],
    ['false', undefined],
    ['1', undefined],
  ])('incluir_inactivos=%s', (valor, esperado) => {
    expect(modelo.validarFiltros({ incluir_inactivos: valor }).incluirInactivos).toBe(esperado);
  });
});
