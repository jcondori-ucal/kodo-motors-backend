# Documentación técnica · Repuestos y Catálogo

Evidencia Evaluativa 3 · Fundamentos de Desarrollo Back-End (UCAL) · Grupo 3

## 1. Nombre del proyecto

**kodo-motors-backend** — API REST de Kodo Motors.

## 2. Descripción breve

API REST que gestiona la información del negocio de Kodo Motors. Este documento cubre los dos
módulos a cargo del Grupo 3:

- **Repuestos:** inventario de piezas, con alerta de bajo stock.
- **Catálogo:** vehículos Mazda nuevos en venta.

En la EE3 se agregaron validaciones del lado del servidor, se unificó el formato de los errores
y se escribieron pruebas automáticas de ambos módulos.

## 3. Empresa aliada

**Kodo Motors**, empresa limeña especializada en vehículos Mazda: venta de vehículos, servicio
de taller y venta de repuestos.

## 4. Tecnologías utilizadas

| Tecnología | Para qué se usa |
|---|---|
| Node.js 18+ | Ejecuta JavaScript en el servidor |
| Express 5 | Rutas y middlewares |
| MySQL + mysql2 | Base de datos y consultas con parámetros |
| express-validator | Validación y limpieza de los datos de entrada |
| Jest + Supertest | Pruebas unitarias y de integración |
| Postman | Pruebas funcionales con la base de datos real |

## 5. Estructura del backend

Una petición recorre siempre el mismo camino:

```
Cliente → ruta → reglas de validación → validar → controlador → servicio → repositorio → MySQL
                                           │
                        si algo falla ─────┴──▶ manejarErrores → respuesta JSON de error
```

| Carpeta | Responsabilidad |
|---|---|
| `src/routes/` | Une cada URL con sus reglas, el middleware `validar` y el controlador |
| `src/validators/` | Reglas de `express-validator` por recurso |
| `src/controllers/` | Lee la petición y responde |
| `src/services/` | Reglas de negocio (código único, baja con stock, combinación repetida) |
| `src/repositories/` | Único lugar con SQL |
| `src/middlewares/` | Manejo central de errores y trazabilidad |
| `tests/` | Pruebas con Jest y Supertest |

## 6. Recursos documentados

| Recurso | Ruta base | Regla de negocio principal |
|---|---|---|
| Repuestos | `/api/repuestos` | El código es único; no se da de baja un repuesto con stock |
| Catálogo | `/api/catalogo` | La combinación modelo + versión + año no se repite |

En ambos, `DELETE` es **borrado lógico**: el registro queda en la base con `activo = 0` y la API
lo trata como inexistente.

## 7. Tabla de endpoints

Base: `http://localhost:4000`

### Repuestos

| Método | Ruta | Qué hace | Éxito | Errores |
|---|---|---|---|---|
| GET | `/api/repuestos` | Lista los repuestos activos | 200 | 400 filtro inválido |
| GET | `/api/repuestos/:id` | Devuelve un repuesto | 200 | 400 id inválido · 404 no existe |
| POST | `/api/repuestos` | Registra un repuesto | 201 | 400 datos inválidos · 409 código repetido |
| PUT | `/api/repuestos/:id` | Actualiza los campos enviados | 200 | 400 · 404 · 409 |
| DELETE | `/api/repuestos/:id` | Da de baja (borrado lógico) | 204 | 400 aún tiene stock · 404 |

### Catálogo

| Método | Ruta | Qué hace | Éxito | Errores |
|---|---|---|---|---|
| GET | `/api/catalogo` | Lista los vehículos activos | 200 | — |
| GET | `/api/catalogo/:id` | Devuelve un vehículo | 200 | 400 id inválido · 404 no existe |
| POST | `/api/catalogo` | Registra un vehículo | 201 | 400 datos inválidos · 409 combinación repetida |
| PUT | `/api/catalogo/:id` | Reemplaza el vehículo completo | 200 | 400 · 404 · 409 |
| DELETE | `/api/catalogo/:id` | Da de baja (borrado lógico) | 204 | 404 |

## 8. Parámetros

| Dónde | Parámetro | Recurso | Regla |
|---|---|---|---|
| Ruta | `:id` | ambos | Entero positivo |
| Consulta | `modelo_compatible` | repuestos | Uno de los modelos permitidos |
| Consulta | `bajo_stock` | repuestos | `true` o `false`. Con `true` lista solo los que están en su stock mínimo o por debajo |
| Consulta | `incluir_inactivos` | ambos | `true` incluye los dados de baja |

Ejemplo: `GET /api/repuestos?modelo_compatible=CX-5&bajo_stock=true`

## 9. Cuerpo de la solicitud

### Repuestos (`POST` y `PUT`)

En `POST` los campos marcados son obligatorios. En `PUT` todos son opcionales, pero si un campo
se envía, se valida igual.

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `codigo` | texto | sí | 3 a 20 caracteres; solo letras, números y guiones. Se guarda en mayúsculas |
| `nombre` | texto | sí | Máximo 100 caracteres |
| `modelo_compatible` | texto | sí | `Mazda2`, `Mazda3`, `CX-3`, `CX-30`, `CX-5`, `CX-50`, `CX-90`, `BT-50`, `MX-5` o `Todos` |
| `precio` | número | sí | Mayor a 0, máximo 999999.99, hasta 2 decimales |
| `stock` | entero | no (por defecto 0) | 0 o más |
| `stock_minimo` | entero | no (por defecto 5) | 0 o más |
| `ubicacion` | texto | no | Máximo 20 caracteres; no admite `<` ni `>` |

No se pueden enviar `id` ni `activo`.

```json
{
  "codigo": "PY8W-13-Z40",
  "nombre": "Filtro de aire",
  "modelo_compatible": "CX-5",
  "precio": 85,
  "stock": 12,
  "stock_minimo": 5,
  "ubicacion": "A-02"
}
```

### Catálogo (`POST` y `PUT`)

`PUT` reemplaza el vehículo completo: exige los mismos campos que `POST`.

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `modelo` | texto | sí | `Mazda2`, `Mazda3`, `CX-3`, `CX-30`, `CX-5`, `CX-50`, `CX-90`, `BT-50` o `MX-5` |
| `version` | texto | sí | Máximo 60 caracteres |
| `anio` | entero | sí | 1900 o mayor |
| `precio_usd` | número | sí | Mayor a 0 |
| `stock` | entero | no (por defecto 0) | 0 o más |
| `combustible` | texto | sí | `gasolina`, `hibrido` o `diesel` |
| `transmision` | texto | sí | `mecanica` o `automatica` |
| `destacado` | booleano | no (por defecto `false`) | `true` o `false` |

No se pueden enviar `id` ni `activo`.

```json
{
  "modelo": "CX-50",
  "version": "2.5 Hybrid Select",
  "anio": 2026,
  "precio_usd": 41990,
  "stock": 2,
  "combustible": "hibrido",
  "transmision": "automatica",
  "destacado": true
}
```

## 10. Ejemplos de respuesta exitosa

`POST /api/repuestos` → **201 Created**

```json
{
  "id": 5,
  "codigo": "PY8W-13-Z40",
  "nombre": "Filtro de aire",
  "modeloCompatible": "CX-5",
  "stock": 12,
  "stockMinimo": 5,
  "precio": 85,
  "ubicacion": "A-02",
  "activo": true,
  "alertaBajoStock": false
}
```

`alertaBajoStock` es `true` cuando el stock está en el mínimo o por debajo.

`GET /api/catalogo/1` → **200 OK**

```json
{
  "id": 1,
  "modelo": "Mazda2",
  "version": "1.5 Core MT",
  "anio": 2026,
  "precioUsd": 17990,
  "stock": 6,
  "combustible": "gasolina",
  "transmision": "mecanica",
  "destacado": false,
  "activo": true
}
```

`DELETE /api/repuestos/5` → **204 No Content** (sin cuerpo).

## 11. Ejemplos de respuesta de error

Todos los errores de la API tienen la misma forma:

| Campo | Qué contiene |
|---|---|
| `estado` | El código HTTP |
| `tipo` | Categoría del error, para que el cliente la reconozca |
| `mensaje` | Explicación en español |
| `idTraza` | Identificador de la petición; también viaja en la cabecera `X-Request-Id` |
| `ruta` | Método y URL que fallaron |
| `errores` | Solo en validaciones: lista de `{ campo, mensaje }` |

`POST /api/repuestos` con datos inválidos → **400 Bad Request**

```json
{
  "estado": 400,
  "tipo": "VALIDACION",
  "mensaje": "Datos inválidos",
  "idTraza": "e112f708",
  "ruta": "POST /api/repuestos",
  "errores": [
    { "campo": "modelo_compatible", "mensaje": "El modelo compatible debe ser uno de: Mazda2, Mazda3, CX-3, CX-30, CX-5, CX-50, CX-90, BT-50, MX-5, Todos" },
    { "campo": "precio", "mensaje": "El precio debe ser mayor a 0 y máximo 999999.99" }
  ]
}
```

`GET /api/repuestos/999` → **404 Not Found**

```json
{
  "estado": 404,
  "tipo": "NO_ENCONTRADO",
  "mensaje": "Repuesto con ID 999 no encontrado en el inventario",
  "idTraza": "3fa9c21b",
  "ruta": "GET /api/repuestos/999"
}
```

`POST /api/catalogo` con una combinación que ya existe → **409 Conflict**

```json
{
  "estado": 409,
  "tipo": "CONFLICTO",
  "mensaje": "La combinación modelo, versión y año ya existe",
  "idTraza": "9b0d44e7",
  "ruta": "POST /api/catalogo"
}
```

`DELETE /api/repuestos/2` cuando aún tiene stock → **400 Bad Request**

```json
{
  "estado": 400,
  "tipo": "SOLICITUD_INVALIDA",
  "mensaje": "No se puede dar de baja el repuesto \"Pastillas delanteras\" porque todavía cuenta con stock disponible (8 unidades). Ajuste el stock a 0 antes de darlo de baja.",
  "idTraza": "71c2ab90",
  "ruta": "DELETE /api/repuestos/2"
}
```

Un error inesperado responde **500** con el mensaje genérico `Error interno del servidor`: el
detalle técnico queda solo en el log del servidor, junto al `idTraza`.

## 12. Códigos de estado HTTP utilizados

| Código | Tipo | Cuándo |
|---|---|---|
| 200 OK | — | Consulta o actualización correcta |
| 201 Created | — | Registro creado |
| 204 No Content | — | Baja correcta (sin cuerpo) |
| 400 Bad Request | `VALIDACION` | Un campo, filtro o id no cumple las reglas |
| 400 Bad Request | `SOLICITUD_INVALIDA` | JSON mal formado, o baja de un repuesto con stock |
| 404 Not Found | `NO_ENCONTRADO` | La ruta o el registro no existe (o está dado de baja) |
| 409 Conflict | `CONFLICTO` | Código de repuesto repetido, o modelo + versión + año repetido |
| 413 Content Too Large | `CUERPO_MUY_GRANDE` | El cuerpo supera los 10 KB |
| 500 Internal Server Error | `ERROR_INTERNO` | Error inesperado del servidor |
| 503 Service Unavailable | `SERVICIO_NO_DISPONIBLE` | No hay conexión con la base de datos |

## 13. Cómo probar la API

Ver [PRUEBAS_Y_REGISTRO_DE_ERRORES.md](PRUEBAS_Y_REGISTRO_DE_ERRORES.md).
