// Ejecuta reglas de express-validator sobre una petición falsa, sin levantar Express.
const { validationResult } = require('express-validator');

// Devuelve { campos, mensajes, body }: los campos con error, sus mensajes y el body ya saneado
async function ejecutarReglas(reglas, body = {}) {
  const req = { body: { ...body }, query: {}, params: {} };
  for (const regla of reglas) await regla.run(req);
  const errores = validationResult(req).array({ onlyFirstError: true });
  return {
    campos: errores.map((e) => e.path),
    mensajes: errores.map((e) => e.msg),
    body: req.body,
  };
}

module.exports = { ejecutarReglas };
