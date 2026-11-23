/**
 * Rutas: Endpoints del recurso Repuestos (Kodo Motors)
 * Prefijo: /api/repuestos · DELETE es borrado lógico
 *
 * Orden de cada ruta: reglas → validar → controlador.
 * Si una regla falla, validar responde 400 y el controlador no se ejecuta.
 */
const { Router } = require('express');
const repuestosController = require('../controllers/repuestos.controller');
const { idParam } = require('../validators/common');
const validar = require('../validators/validar');
const { reglasRepuesto, reglasFiltrosRepuesto } = require('../validators/repuestos.validators');

const router = Router();

router.get('/', reglasFiltrosRepuesto(), validar, repuestosController.listar);
router.get('/:id', idParam(), validar, repuestosController.obtenerPorId);
router.post('/', reglasRepuesto(), validar, repuestosController.crear);
router.put('/:id', idParam(), reglasRepuesto(true), validar, repuestosController.actualizar);
router.delete('/:id', idParam(), validar, repuestosController.eliminar);

module.exports = router;
