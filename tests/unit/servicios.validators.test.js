// Unitarias de las reglas de express-validator de servicios (Semana 9): obligatorio, tipo, rango y lista cerrada
const { reglasServicio } = require('../../src/validators/servicios.validators');
const { ejecutarReglas } = require('../helpers/validadores');

const servicioValido = {
  nombre: 'Cambio de aceite',
  categoria: 'mantenimiento',
  descripcion: 'Aceite sintético y filtro',
  precio: 180,
  duracion_min: 45,
};

const validarCreacion = (cambios = {}) => ejecutarReglas(reglasServicio(), { ...servicioValido, ...cambios });

describe('reglasServicio en POST', () => {
  test('un servicio completo no tiene errores', async () => {
    expect((await validarCreacion()).campos).toEqual([]);
  });

  test('un body vacío marca los cuatro campos obligatorios (descripción es opcional)', async () => {
    const { campos } = await ejecutarReglas(reglasServicio(), {});

    expect(campos).toEqual(['nombre', 'categoria', 'precio', 'duracion_min']);
  });
});

describe('duración: de 15 a 480 minutos (una jornada de taller)', () => {
  test.each([
    ['un minuto antes del mínimo', 14, false],
    ['mínimo', 15, true],
    ['máximo', 480, true],
    ['un minuto sobre el máximo', 481, false],
    ['con decimales', 45.5, false],
    ['booleano', true, false],
    ['texto numérico', '60', true],
  ])('%s (%s)', async (_nombre, duracion, valido) => {
    const { campos } = await validarCreacion({ duracion_min: duracion });

    expect(campos).toEqual(valido ? [] : ['duracion_min']);
  });

  test('convierte el texto numérico a entero', async () => {
    expect((await validarCreacion({ duracion_min: '60' })).body.duracion_min).toBe(60);
  });
});

describe('precio: mayor a 0, hasta 999 999.99 y con máximo 2 decimales', () => {
  test.each([
    ['cero', 0, false],
    ['negativo', -50, false],
    ['un céntimo (mínimo)', 0.01, true],
    ['máximo', 999999.99, true],
    ['sobre el máximo', 1000000, false],
    ['tres decimales', 10.999, false],
    ['booleano', true, false],
    ['texto que no es número', 'gratis', false],
  ])('%s (%s)', async (_nombre, precio, valido) => {
    const { campos } = await validarCreacion({ precio });

    expect(campos).toEqual(valido ? [] : ['precio']);
  });

  test('convierte el texto numérico a número', async () => {
    expect((await validarCreacion({ precio: '120.50' })).body.precio).toBe(120.5);
  });
});

describe('categoría: lista cerrada', () => {
  test.each(['mantenimiento', 'diagnostico', 'frenos', 'neumaticos', 'electrico', 'planchado_pintura'])(
    '%s es válida',
    async (categoria) => {
      expect((await validarCreacion({ categoria })).campos).toEqual([]);
    },
  );

  test.each([['fuera de la lista', 'lavado'], ['con mayúscula', 'Frenos'], ['número', 3]])(
    'categoría %s se rechaza',
    async (_nombre, categoria) => {
      expect((await validarCreacion({ categoria })).campos).toEqual(['categoria']);
    },
  );

  test('el mensaje enumera las categorías permitidas', async () => {
    const { mensajes } = await validarCreacion({ categoria: 'lavado' });

    expect(mensajes[0]).toMatch(/mantenimiento, diagnostico, frenos/);
  });
});

describe('descripción: texto libre opcional de hasta 255 caracteres', () => {
  test.each([
    ['255 caracteres', 'a'.repeat(255), true],
    ['256 caracteres', 'a'.repeat(256), false],
    ['null', null, true],
    ['etiqueta HTML', '<b>oferta</b>', false],
    ['número', 123, false],
  ])('%s', async (_nombre, descripcion, valido) => {
    const { campos } = await validarCreacion({ descripcion });

    expect(campos).toEqual(valido ? [] : ['descripcion']);
  });

  test('una descripción vacía se convierte en null', async () => {
    expect((await validarCreacion({ descripcion: '   ' })).body.descripcion).toBeNull();
  });
});

describe('nombre y campos prohibidos', () => {
  test.each([
    ['2 caracteres', 'Ab', false],
    ['3 caracteres', 'Abc', true],
    ['100 caracteres', 'A'.repeat(100), true],
    ['101 caracteres', 'A'.repeat(101), false],
  ])('nombre de %s', async (_nombre, nombre, valido) => {
    expect((await validarCreacion({ nombre })).campos).toEqual(valido ? [] : ['nombre']);
  });

  test('id y activo no se pueden enviar', async () => {
    expect((await validarCreacion({ id: 1, activo: false })).campos).toEqual(['id', 'activo']);
  });
});

describe('reglasServicio(true) en PUT (actualización parcial)', () => {
  test('solo el precio: no exige los demás campos', async () => {
    expect((await ejecutarReglas(reglasServicio(true), { precio: 200 })).campos).toEqual([]);
  });

  test('el precio enviado respeta el mismo rango que en POST', async () => {
    expect((await ejecutarReglas(reglasServicio(true), { precio: 0 })).campos).toEqual(['precio']);
  });
});
