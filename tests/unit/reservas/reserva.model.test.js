const modelo = require('../../../src/models/reserva.model');
const { cuerpoValido } = require('../../helpers/reservas');

describe('Validar', () => {
  test('datos completos y correctos → sin errores', () => {
    expect(modelo.validar(cuerpoValido())).toEqual([]);
  });

  test('cuerpo vacío → 5 errores, uno por cada campo obligatorio', () => {
    expect(modelo.validar({})).toHaveLength(5);
  });

  test('fecha con formato incorrecto → error', () => {
    expect(modelo.validar(cuerpoValido({ fecha: '19-11-2026' }))).toHaveLength(1);
  });

  test.each([
    ['23:59 es válida', '23:59', 0],
    ['24:00 no es válida', '24:00', 1],
    ['12:60 no es válida', '12:60', 1],
  ])('hora: %s', (_nombre, hora, cantidadErrores) => {
    expect(modelo.validar(cuerpoValido({ hora }))).toHaveLength(cantidadErrores);
  });

  test('estado inexistente → error', () => {
    expect(modelo.validar(cuerpoValido({ estado: 'perdida' }))).toHaveLength(1);
  });

  test.each([
    ['255 caracteres es válida', 255, 0],
    ['256 caracteres no es válida', 256, 1],
  ])('observación: %s', (_nombre, largo, cantidadErrores) => {
    expect(modelo.validar(cuerpoValido({ observacion: 'x'.repeat(largo) }))).toHaveLength(cantidadErrores);
  });

  test('no se permite enviar "activo" (la baja se hace con DELETE)', () => {
    expect(modelo.validar(cuerpoValido({ activo: 0 }))).toHaveLength(1);
  });

  test('modo parcial: un cuerpo vacío no da errores', () => {
    expect(modelo.validar({}, { parcial: true })).toEqual([]);
  });

  test('modo parcial: si el campo viene, se valida', () => {
    expect(modelo.validar({ hora: '25:00' }, { parcial: true })).toHaveLength(1);
  });
});

describe('revisarCampos', () => {
  test('un campo que no existe en la reserva → error 400', () => {
    expect(() => modelo.revisarCampos(cuerpoValido({ placa: 'ABC123' }))).toThrow(
      expect.objectContaining({ estado: 400 })
    );
  });
});

describe('limpiar', () => {
  test('descarta campos no permitidos y convierte los ids a número', () => {
    const limpio = modelo.limpiar(
      { 
        ...cuerpoValido({ sede_id: '1' }), 
        id: 99, 
        activo: 0 
      }
    );

    expect(limpio).toEqual({ 
      fecha: '2026-11-19', 
      hora: '10:00', 
      sede_id: 1, 
      servicio_id: 2, 
      vehiculo_id: 3 
    });
  });
});

describe('desdeFila', () => {
  const fila = { 
    id: 5, 
    fecha: '2026-11-19', 
    hora: '10:00:00', 
    estado: 'pendiente', 
    activo: 1, 
    sede_id: 1, 
    servicio_id: 2, 
    vehiculo_id: 3 
  };

  test('fila nula → null', () => {
    expect(modelo.desdeFila(null)).toBeNull();
  });

  test('recorta la hora a HH:MM y convierte activo a booleano', () => {
    expect(modelo.desdeFila(fila)).toMatchObject({ hora: '10:00', activo: true });
  });
});
