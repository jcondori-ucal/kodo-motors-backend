// Ayudas compartidas por las pruebas (Semana 11).
// Lo que se repite en muchas pruebas vive aquí; lo que cambia en cada una queda a la vista.
const request = require('supertest');
const app = require('../../src/app'); // la app SIN .listen(): Supertest abre un puerto temporal

// Contrato de TODO error de la API (Semana 10):
// { estado, tipo, mensaje, idTraza, ruta } y la cabecera X-Request-Id igual a idTraza.
const esperarError = (res, estado, tipo) => {
  expect(res.status).toBe(estado);
  expect(res.body).toMatchObject({ estado, tipo });
  expect(typeof res.body.mensaje).toBe('string');
  expect(typeof res.body.idTraza).toBe('string');
  expect(typeof res.body.ruta).toBe('string');
  expect(res.headers['x-request-id']).toBe(res.body.idTraza);
};

// Campos que fallaron en un 400 de express-validator: ['anio', 'modelo']
const camposConError = (res) => (res.body.errores || []).map((e) => e.campo).sort();

// res falso para probar un middleware sin levantar la API
const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = { request, app, esperarError, camposConError, crearRes };
