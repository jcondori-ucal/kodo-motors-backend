// Unitarias de las reglas de express-validator de sedes (Semana 9): obligatorio, tipo, longitud y formato
const { reglasSede } = require('../../src/validators/sedes.validators');
const { ejecutarReglas } = require('../helpers/validadores');

const sedeValida = {
  nombre: 'Kodo San Isidro',
  distrito: 'San Isidro',
  direccion: 'Av. Javier Prado Este 1234, Of. 2',
  telefono: '014445566',
  hora_apertura: '08:00',
  hora_cierre: '18:00',
  atiende_domingo: false,
};

const validarCreacion = (cambios = {}) => ejecutarReglas(reglasSede(), { ...sedeValida, ...cambios });

describe('reglasSede en POST (todos los campos obligatorios)', () => {
  test('una sede completa no tiene errores', async () => {
    expect((await validarCreacion()).campos).toEqual([]);
  });

  test('un body vacío marca los seis campos obligatorios', async () => {
    const { campos } = await ejecutarReglas(reglasSede(), {});

    expect(campos).toEqual(['nombre', 'distrito', 'direccion', 'telefono', 'hora_apertura', 'hora_cierre']);
  });

  test('atiende_domingo es opcional', async () => {
    const { atiende_domingo, ...sinDomingo } = sedeValida;

    expect((await ejecutarReglas(reglasSede(), sinDomingo)).campos).toEqual([]);
  });
});

describe('teléfono: clases de equivalencia', () => {
  test.each([
    ['fijo de Lima (01 + 7 dígitos)', '014445566', true],
    ['celular (9 + 8 dígitos)', '987654321', true],
    ['muy corto (8 dígitos)', '98765432', false],
    ['muy largo (10 dígitos)', '9876543210', false],
    ['no empieza en 0 ni en 9', '812345678', false],
    ['contiene letras', '98765432a', false],
    ['número en vez de texto', 987654321, false],
  ])('%s → %s', async (_nombre, telefono, valido) => {
    const { campos } = await validarCreacion({ telefono });

    expect(campos).toEqual(valido ? [] : ['telefono']);
  });
});

describe('horas: formato HH:MM de 24 horas', () => {
  test.each([
    ['primera hora del día', '00:00', true],
    ['último minuto del día', '23:59', true],
    ['hora 24 no existe', '24:00', false],
    ['minuto 60 no existe', '08:60', false],
    ['sin cero a la izquierda', '8:00', false],
    ['con segundos', '08:00:00', false],
    ['texto libre', 'ocho', false],
  ])('%s (%s)', async (_nombre, hora, valido) => {
    const { campos } = await validarCreacion({ hora_apertura: hora });

    expect(campos).toEqual(valido ? [] : ['hora_apertura']);
  });
});

describe('nombre: longitud de 3 a 80 y caracteres permitidos', () => {
  test.each([
    ['2 caracteres', 'Ko', false],
    ['3 caracteres (mínimo)', 'Kod', true],
    ['80 caracteres (máximo)', 'K'.repeat(80), true],
    ['81 caracteres', 'K'.repeat(81), false],
    ['solo espacios', '    ', false],
    ['etiqueta HTML', '<script>alert(1)</script>', false],
    ['arreglo en vez de texto', ['Kodo Surco'], false],
  ])('%s', async (_nombre, nombre, valido) => {
    const { campos } = await validarCreacion({ nombre });

    expect(campos).toEqual(valido ? [] : ['nombre']);
  });

  test('sanea el texto: quita extremos y une espacios repetidos', async () => {
    const { body } = await validarCreacion({ nombre: '  Kodo    San   Isidro ' });

    expect(body.nombre).toBe('Kodo San Isidro');
  });
});

describe('otros campos', () => {
  test('distrito no admite números', async () => {
    expect((await validarCreacion({ distrito: 'Lima 1' })).campos).toEqual(['distrito']);
  });

  test('dirección de 4 caracteres es muy corta', async () => {
    expect((await validarCreacion({ direccion: 'Av 1' })).campos).toEqual(['direccion']);
  });

  test.each([['texto "true"', 'true'], ['número 1', 1], ['texto libre', 'quizá']])(
    'atiende_domingo como %s se rechaza: debe ser booleano',
    async (_nombre, valor) => {
      expect((await validarCreacion({ atiende_domingo: valor })).campos).toEqual(['atiende_domingo']);
    },
  );

  test('id y activa no se pueden enviar, con un mensaje que explica por qué', async () => {
    const { campos, mensajes } = await validarCreacion({ id: 9, activa: false });

    expect(campos).toEqual(['id', 'activa']);
    expect(mensajes[1]).toMatch(/usa DELETE/);
  });
});

describe('reglasSede(true) en PUT (actualización parcial)', () => {
  test('un solo campo válido no exige los demás', async () => {
    expect((await ejecutarReglas(reglasSede(true), { telefono: '987654321' })).campos).toEqual([]);
  });

  test('el campo enviado se valida igual que en POST', async () => {
    expect((await ejecutarReglas(reglasSede(true), { telefono: '123' })).campos).toEqual(['telefono']);
  });

  test('tampoco en PUT se acepta activa', async () => {
    expect((await ejecutarReglas(reglasSede(true), { activa: true })).campos).toEqual(['activa']);
  });
});
