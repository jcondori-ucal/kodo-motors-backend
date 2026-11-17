const { AppError } = require('../../src/middlewares/errors/AppError');

// "Hoy" fijo para que las pruebas no dependan de la fecha real: miércoles 18-nov-2026 10:00
const AHORA = '2026-11-18T10:00:00';

const FECHAS = {
  manana: '2026-11-19',
  ayer: '2026-11-17',
  domingo: '2026-11-22',
};

// Congela solo la fecha; los temporizadores siguen reales para que async/await funcione
const congelarReloj = () =>
  jest.useFakeTimers({
    now: new Date(AHORA),
    doNotFake: [
      'nextTick', 
      'setImmediate', 
      'setTimeout', 
      'setInterval', 
      'clearTimeout', 
      'clearInterval', 
      'clearImmediate'
    ],
  });

const cuerpoValido = (cambios = {}) => ({
  fecha: FECHAS.manana,
  hora: '10:00',
  sede_id: 1,
  servicio_id: 2,
  vehiculo_id: 3,
  ...cambios,
});

const sedeSurquillo = (cambios = {}) => ({
  id: 1,
  nombre: 'Kodo Surquillo',
  hora_apertura: '08:00:00',
  hora_cierre: '18:00:00',
  atiende_domingo: false,
  ...cambios,
});

const servicioDe60Min = () => ({ id: 2, nombre: 'Mantenimiento', duracion_min: 60 });

const reservaGuardada = (cambios = {}) => ({
  id: 8,
  fecha: FECHAS.manana,
  hora: '10:00',
  estado: 'pendiente',
  sede: { id: 1 },
  servicio: { id: 2 },
  vehiculo: { id: 3 },
  ...cambios,
});

// Falla si la promesa NO es rechazada o si el error no tiene el estado esperado
const esperarError = async (promesa, estado) => {
  let error;
  try {
    await promesa;
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(AppError);
  expect(error.estado).toBe(estado);
  return error;
};

module.exports = { 
  FECHAS, 
  congelarReloj, 
  cuerpoValido, 
  sedeSurquillo, 
  servicioDe60Min, 
  reservaGuardada, 
  esperarError 
};
