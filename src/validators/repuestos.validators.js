// Formato de los campos de un repuesto (Semana 9).
// Las reglas que consultan la BD (código único, baja con stock) están en repuestos.service.js
const { body, query } = require('express-validator');
const Repuesto = require('../models/repuesto.model');
const {
  ENTERO_MAXIMO, campo, esTextoONumero, textoObligatorio, textoOpcional,
} = require('./common');

const MODELOS = Repuesto.MODELOS_PERMITIDOS;
const PRECIO_MAXIMO = 999999.99; // la columna es DECIMAL(8,2)
const FORMATO_CODIGO = /^[A-Z0-9-]+$/; // ej. PE01-14-302

// Entero opcional de 0 en adelante (stock y stock_minimo).
const enteroDesdeCero = (nombre) =>
  body(nombre).optional()
    .custom(esTextoONumero).withMessage(`${nombre} debe ser un entero mayor o igual a 0`).bail()
    .isInt({ min: 0, max: ENTERO_MAXIMO }).withMessage(`${nombre} debe ser un entero mayor o igual a 0`)
    .toInt();

// parcial = false → POST (campos obligatorios) · parcial = true → PUT (solo valida lo que llega)
const reglasRepuesto = (parcial = false) => [
  body('id').not().exists().withMessage('El id no se puede enviar'),

  campo('codigo', parcial)
    .notEmpty({ ignore_whitespace: true }).withMessage('El código es obligatorio').bail()
    .isString().withMessage('El código debe ser texto').bail()
    .trim()
    .toUpperCase()
    .isLength({ min: 3, max: 20 }).withMessage('El código debe tener entre 3 y 20 caracteres').bail()
    .matches(FORMATO_CODIGO).withMessage('El código solo admite letras, números y guiones (ej. PE01-14-302)'),

  textoObligatorio('nombre', 'El nombre es obligatorio', parcial)
    .isLength({ max: 100 }).withMessage('El nombre admite máximo 100 caracteres'),

  campo('modelo_compatible', parcial)
    .notEmpty().withMessage('El modelo compatible es obligatorio').bail()
    .isIn(MODELOS).withMessage(`El modelo compatible debe ser uno de: ${MODELOS.join(', ')}`),

  campo('precio', parcial)
    .notEmpty().withMessage('El precio es obligatorio').bail()
    .custom(esTextoONumero).withMessage('El precio debe ser un número').bail()
    .isFloat({ gt: 0, max: PRECIO_MAXIMO }).withMessage(`El precio debe ser mayor a 0 y máximo ${PRECIO_MAXIMO}`).bail()
    .isDecimal({ decimal_digits: '0,2' }).withMessage('El precio admite máximo 2 decimales')
    .toFloat(),

  enteroDesdeCero('stock'),
  enteroDesdeCero('stock_minimo'),

  textoOpcional('ubicacion', 20),

  body('activo').not().exists().withMessage('Activo no se puede enviar; para dar de baja usa DELETE'),
];

// Filtros de GET /api/repuestos. Un parámetro repetido llega como arreglo: isString lo rechaza.
const reglasFiltrosRepuesto = () => [
  query('modelo_compatible').optional()
    .isString().withMessage('El filtro modelo_compatible debe ser un solo valor').bail()
    .isIn(MODELOS).withMessage(`El modelo compatible debe ser uno de: ${MODELOS.join(', ')}`),

  query('bajo_stock').optional()
    .isIn(['true', 'false']).withMessage('bajo_stock debe ser true o false'),

  query('incluir_inactivos').optional()
    .isIn(['true', 'false']).withMessage('incluir_inactivos debe ser true o false'),
];

module.exports = { reglasRepuesto, reglasFiltrosRepuesto };
