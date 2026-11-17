// Ayudas compartidas por las pruebas de integración (Semana 11, Slides 29 a 31).
// Arma la app real de Express sobre repositorios en memoria: no necesita MySQL ni Docker.

// La llave de pruebas existe solo aquí; la real vive en el .env de cada integrante
const LLAVE_DE_PRUEBA = 'llave-solo-para-pruebas';
process.env.API_KEY = LLAVE_DE_PRUEBA;

jest.mock('../../src/repositories/sedes.repository', () => require('./bd-memoria').sedes);
jest.mock('../../src/repositories/servicios.repository', () => require('./bd-memoria').servicios);
jest.mock('../../src/repositories/reserva.repository', () => require('./bd-memoria').reservas);

const request = require('supertest');
const app = require('../../src/app'); // app.js no hace listen: Supertest abre un puerto temporal
const bd = require('./bd-memoria');

// Cabeceras de cada perfil
const LECTOR = { 'x-api-key': LLAVE_DE_PRUEBA };
const RECEPCION = { 'x-api-key': LLAVE_DE_PRUEBA, 'x-rol': 'recepcion' };
const ADMIN = { 'x-api-key': LLAVE_DE_PRUEBA, 'x-rol': 'admin' };

// El contrato de TODO error de la API (Semana 10): si una respuesta cambia de formato, falla aquí
function esperarError(res, estado, tipo) {
  expect(res.status).toBe(estado);
  expect(res.body).toMatchObject({ estado, tipo });
  expect(typeof res.body.mensaje).toBe('string');
  expect(typeof res.body.idTraza).toBe('string');
  expect(typeof res.body.ruta).toBe('string');
  expect(res.headers['x-request-id']).toBe(res.body.idTraza);
}

// Un 400 de validación además trae errores[] con { campo, mensaje }; devuelve los campos que fallaron
function esperarValidacion(res) {
  esperarError(res, 400, 'VALIDACION');
  expect(Array.isArray(res.body.errores)).toBe(true);
  for (const error of res.body.errores) {
    expect(error).toEqual({ campo: expect.any(String), mensaje: expect.any(String) });
  }
  return res.body.errores.map((error) => error.campo);
}

module.exports = {
  request,
  app,
  bd,
  LECTOR,
  RECEPCION,
  ADMIN,
  LLAVE_DE_PRUEBA,
  esperarError,
  esperarValidacion,
  reiniciarDatos: bd.reiniciarDatos,
};
