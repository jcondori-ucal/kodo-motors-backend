# Documentación técnica de la API · Sedes y Servicios

Evidencia Evaluativa 3 · Fundamentos de Desarrollo Back-End (UCAL).
Este documento cubre los dos recursos a cargo del equipo: **`/api/sedes`** y **`/api/servicios`**.

## 1. Nombre del proyecto

**kodo-motors-backend** — API REST de Kodo Motors.

## 2. Descripción breve de la API

API REST que gestiona la información de Kodo Motors. Este módulo administra las **sedes**
(locales con su distrito, dirección, teléfono y horario) y los **servicios de taller**
(categoría, precio y duración). Las reservas de citas se apoyan en ambos: una cita se agenda en una
sede, dentro de su horario, y para un servicio, cuya duración define cuánto ocupa.

En esta etapa (EE3) el módulo incorpora validación en el servidor, manejo centralizado de errores,
acceso protegido por credencial y pruebas automatizadas.

## 3. Empresa aliada

**Kodo Motors**, empresa limeña especializada en vehículos Mazda: venta de vehículos, servicio de
taller y venta de repuestos.

## 4. Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 18 o superior | Entorno de ejecución |
| Express | 5.2 | Servidor HTTP, rutas y middlewares |
| express-validator | 7.3 | Reglas de validación y saneamiento por ruta |
| mysql2 | 3.24 | Conexión a MySQL con placeholders `?` |
| MySQL | 8.4 (Docker) | Base de datos `kodo_db` |
| dotenv | 17.4 | Variables de entorno (`.env`) |
| cors | 2.8 | Acceso desde un frontend en otro origen |
| Jest | 30 | Pruebas unitarias y de integración |
| Supertest | 7 | Peticiones HTTP a la app sin levantar el servidor |
| Postman / Newman | — | Pruebas manuales con aserciones y su ejecución por terminal |

## 5. Estructura general del backend

```
src/
├── server.js                  # entrada: exige API_KEY, prueba MySQL y escucha
├── app.js                     # trazabilidad → CORS → JSON → rutas → 404 → manejador de errores
├── config/db.js               # pool de mysql2
├── routes/                    # método + URL; encadena auth, validadores y controlador
│   ├── sedes.routes.js
│   └── servicios.routes.js
├── middlewares/
│   ├── auth.js                # autenticar (401) y autorizar (403)
│   ├── trazabilidad.js        # idTraza y cabecera X-Request-Id
│   ├── manejarErrores.js      # único lugar que arma la respuesta de error
│   └── errors/AppError.js     # clases de error: 400, 401, 403, 404, 409
├── validators/                # reglas de express-validator, separadas de las rutas
│   ├── common.js              # piezas reutilizables (idParam, textoObligatorio, soloCamposPermitidos…)
│   ├── validar.js             # convierte los errores en 400 con errores[] por campo
│   ├── sedes.validators.js
│   └── servicios.validators.js
├── controllers/               # lee req, llama al servicio, responde res
├── services/                  # reglas de negocio; lanza errores tipados
├── models/                    # validación de la entidad completa (cruces entre campos)
└── repositories/              # único lugar con SQL
tests/
├── unit/                      # funciones, reglas, servicios con mock, middlewares
├── integracion/               # la API completa por HTTP con Supertest
└── helpers/                   # app de pruebas, contrato de error, base en memoria
```

Recorrido de una petición de escritura:

```
cliente → trazabilidad → autenticar (401) → autorizar (403) → reglas + validar (400)
        → controlador → servicio (404 / 409) → repositorio → MySQL
cualquier error → next(error) → manejarErrores → JSON uniforme
```

## 6. Módulos o recursos implementados

| Recurso | Ruta base | Tabla | Baja |
|---|---|---|---|
| Sedes | `/api/sedes` | `sedes` | Lógica: `activa = 0` |
| Servicios | `/api/servicios` | `servicios` | Lógica: `activo = 0` |

## 7 – 10. Endpoints: método, ruta y parámetros

Base: `http://localhost:4000`. **Todas las rutas exigen la cabecera `x-api-key`.**
Las de escritura exigen además `x-rol: admin`.

| # | Método | Ruta | Qué hace | Cabeceras | Parámetros | Éxito | Errores |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/sedes` | Lista las sedes activas | `x-api-key` | Query opcionales: `distrito`, `incluir_inactivos=true` | 200 | 400, 401 |
| 2 | GET | `/api/sedes/:id` | Devuelve una sede | `x-api-key` | Ruta: `id` entero ≥ 1 | 200 | 400, 401, 404 |
| 3 | POST | `/api/sedes` | Registra una sede | `x-api-key`, `x-rol: admin` | Cuerpo JSON (ver 11) | 201 | 400, 401, 403, 409, 413 |
| 4 | PUT | `/api/sedes/:id` | Actualiza los campos enviados | `x-api-key`, `x-rol: admin` | Ruta: `id` · Cuerpo JSON parcial | 200 | 400, 401, 403, 404, 409 |
| 5 | DELETE | `/api/sedes/:id` | Da de baja la sede | `x-api-key`, `x-rol: admin` | Ruta: `id` | 204 | 400, 401, 403, 404, 409 |
| 6 | GET | `/api/servicios` | Lista los servicios activos | `x-api-key` | Query opcionales: `categoria`, `incluir_inactivos=true` | 200 | 400, 401 |
| 7 | GET | `/api/servicios/:id` | Devuelve un servicio | `x-api-key` | Ruta: `id` entero ≥ 1 | 200 | 400, 401, 404 |
| 8 | POST | `/api/servicios` | Registra un servicio | `x-api-key`, `x-rol: admin` | Cuerpo JSON (ver 11) | 201 | 400, 401, 403, 409, 413 |
| 9 | PUT | `/api/servicios/:id` | Actualiza los campos enviados | `x-api-key`, `x-rol: admin` | Ruta: `id` · Cuerpo JSON parcial | 200 | 400, 401, 403, 404, 409 |
| 10 | DELETE | `/api/servicios/:id` | Da de baja el servicio | `x-api-key`, `x-rol: admin` | Ruta: `id` | 204 | 400, 401, 403, 404, 409 |

### Seguridad

| Cabecera | Valor | Si falta o es incorrecta |
|---|---|---|
| `x-api-key` | El valor de `API_KEY` del archivo `.env` del servidor | `401 NO_AUTENTICADO` |
| `x-rol` | `admin` en POST, PUT y DELETE | `403 SIN_PERMISO` |

- La llave **no está escrita en el código ni en el repositorio**: vive en `.env`, que está en
  `.gitignore`. Si `API_KEY` no está definida, la API no arranca.
- Las comprobaciones siguen el orden **401 → 403 → 400 → 404/409**. Quien no tiene credencial recibe
  siempre 401: la respuesta no le revela si el recurso existe ni si sus datos eran válidos.
- `x-rol` es una simulación didáctica (Semana 10): el cliente declara su rol. La versión con rol
  firmado (JWT) corresponde a la Semana 14.

## 11. Cuerpo de solicitud esperado

### Sede — `POST /api/sedes` (todos obligatorios salvo `atiende_domingo`) · `PUT` (solo los que cambian)

| Campo | Tipo | Regla |
|---|---|---|
| `nombre` | texto | 3 a 80 caracteres; letras, números y `. , ' - ( )`; **único** |
| `distrito` | texto | 3 a 60 caracteres; solo letras, espacios y `. ' -` |
| `direccion` | texto | 5 a 150 caracteres |
| `telefono` | texto | 9 dígitos; empieza en `0` (fijo) o `9` (celular). Texto, para no perder el 0 inicial |
| `hora_apertura` | texto | Formato `HH:MM` de 24 horas |
| `hora_cierre` | texto | Formato `HH:MM`; **la apertura debe ser anterior al cierre** |
| `atiende_domingo` | booleano | Opcional; por defecto `false` |

```json
{
  "nombre": "Kodo San Isidro",
  "distrito": "San Isidro",
  "direccion": "Av. Javier Prado Este 1234",
  "telefono": "014447788",
  "hora_apertura": "08:00",
  "hora_cierre": "18:00",
  "atiende_domingo": false
}
```

### Servicio — `POST /api/servicios` (obligatorios salvo `descripcion`) · `PUT` (solo los que cambian)

| Campo | Tipo | Regla |
|---|---|---|
| `nombre` | texto | 3 a 100 caracteres; **único** |
| `categoria` | texto | Una de: `mantenimiento`, `diagnostico`, `frenos`, `neumaticos`, `electrico`, `planchado_pintura` |
| `descripcion` | texto o `null` | Opcional; máximo 255 caracteres; sin `<` ni `>` |
| `precio` | número | Mayor a 0, hasta 999 999.99, máximo 2 decimales |
| `duracion_min` | entero | De 15 a 480 minutos |

```json
{
  "nombre": "Cambio de aceite",
  "categoria": "mantenimiento",
  "descripcion": "Aceite sintético y filtro",
  "precio": 180,
  "duracion_min": 45
}
```

En ambos recursos **no se aceptan** `id`, la bandera de baja (`activa` / `activo`) ni campos que el
recurso no conoce: responden 400.

### Reglas de negocio

| Regla | Respuesta si no se cumple |
|---|---|
| El nombre no se repite, tampoco frente a registros dados de baja | 409 |
| La sede abre antes de cerrar (se compara también contra el horario ya guardado en un `PUT`) | 400 |
| No se da de baja una sede o un servicio con citas pendientes o confirmadas desde hoy | 409 |
| La baja es lógica y no se revierte por la API | 400 si se envía `activa` / `activo` |
| Un `PUT` debe traer al menos un campo | 400 |

## 12. Ejemplos de respuesta exitosa

`GET /api/sedes/1` → **200 OK**

```json
{
  "id": 1,
  "nombre": "Kodo Surquillo",
  "distrito": "Surquillo",
  "direccion": "Av. República de Panamá 4550",
  "telefono": "014445566",
  "hora_apertura": "08:00:00",
  "hora_cierre": "18:00:00",
  "atiende_domingo": false,
  "activa": true
}
```

`POST /api/servicios` con el cuerpo del punto 11 → **201 Created**

```json
{
  "id": 6,
  "nombre": "Cambio de aceite",
  "categoria": "mantenimiento",
  "descripcion": "Aceite sintético y filtro",
  "precio": 180,
  "duracion_min": 45,
  "activo": true
}
```

`PUT /api/servicios/1` con `{ "precio": 399.9 }` → **200 OK** con el servicio completo actualizado.

`DELETE /api/sedes/3` → **204 No Content**, sin cuerpo.

## 13. Ejemplos de respuesta de error

Todos los errores comparten el mismo formato. `idTraza` coincide con la cabecera `X-Request-Id` y
permite ubicar la petición en el log del servidor. `errores[]` solo aparece en los 400 de validación.

**400 · validación por campo** — `POST /api/servicios` con `categoria: "lavado"`, `precio: -1`, `duracion_min: 5`

```json
{
  "estado": 400,
  "tipo": "VALIDACION",
  "mensaje": "Datos inválidos",
  "idTraza": "e112f708",
  "ruta": "POST /api/servicios",
  "errores": [
    { "campo": "categoria", "mensaje": "La categoría debe ser una de: mantenimiento, diagnostico, frenos, neumaticos, electrico, planchado_pintura" },
    { "campo": "precio", "mensaje": "El precio debe ser mayor a 0 y máximo 999999.99" },
    { "campo": "duracion_min", "mensaje": "La duración debe ser un entero de 15 a 480 minutos" }
  ]
}
```

**400 · regla de negocio** — `PUT /api/sedes/1` con `{ "hora_cierre": "07:30" }` (la sede abre a las 08:00)

```json
{
  "estado": 400,
  "tipo": "VALIDACION",
  "mensaje": "Datos de la sede no válidos",
  "idTraza": "9b1d04aa",
  "ruta": "PUT /api/sedes/1",
  "errores": [{ "campo": "hora_apertura", "mensaje": "hora_apertura debe ser menor que hora_cierre" }]
}
```

**401** — sin `x-api-key`

```json
{ "estado": 401, "tipo": "NO_AUTENTICADO", "mensaje": "Falta x-api-key", "idTraza": "3fa2c1d0", "ruta": "GET /api/sedes" }
```

**403** — `x-rol: recepcion` en una escritura

```json
{ "estado": 403, "tipo": "SIN_PERMISO", "mensaje": "Requiere rol: admin", "idTraza": "77c0e5b2", "ruta": "POST /api/sedes" }
```

**404** — recurso inexistente o dado de baja

```json
{ "estado": 404, "tipo": "NO_ENCONTRADO", "mensaje": "No existe una sede con id 999", "idTraza": "0a4be9f1", "ruta": "GET /api/sedes/999" }
```

**409** — nombre repetido / baja con citas pendientes

```json
{ "estado": 409, "tipo": "CONFLICTO", "mensaje": "Ya existe una sede con el nombre \"Kodo Surquillo\"", "idTraza": "c81f2a66", "ruta": "POST /api/sedes" }
```

**500** — error inesperado: el detalle queda en el log del servidor, nunca en la respuesta

```json
{ "estado": 500, "tipo": "ERROR_INTERNO", "mensaje": "Error interno del servidor", "idTraza": "5d9e7c30", "ruta": "GET /api/sedes" }
```

## 14. Códigos de estado HTTP utilizados

| Código | `tipo` | Cuándo |
|---|---|---|
| 200 OK | — | Consulta o actualización correcta |
| 201 Created | — | Registro creado |
| 204 No Content | — | Baja realizada |
| 400 Bad Request | `VALIDACION` · `SOLICITUD_INVALIDA` | Campo inválido, regla de negocio sobre los datos, id mal formado, JSON roto, `PUT` vacío |
| 401 Unauthorized | `NO_AUTENTICADO` | Falta `x-api-key` o no es la correcta |
| 403 Forbidden | `SIN_PERMISO` | Hay credencial, pero el rol no permite escribir |
| 404 Not Found | `NO_ENCONTRADO` | La ruta o el recurso no existen (o el recurso está dado de baja) |
| 409 Conflict | `CONFLICTO` | Nombre repetido; baja con citas pendientes |
| 413 Content Too Large | `CUERPO_MUY_GRANDE` | Cuerpo de más de 10 KB |
| 500 Internal Server Error | `ERROR_INTERNO` | Fallo no previsto del servidor |
| 503 Service Unavailable | `SERVICIO_NO_DISPONIBLE` | No hay conexión con MySQL |

## Cómo probar un endpoint a mano

```bash
curl -H "x-api-key: TU_API_KEY" http://localhost:4000/api/sedes
```

```bash
curl -X POST http://localhost:4000/api/servicios -H "x-api-key: TU_API_KEY" -H "x-rol: admin" -H "Content-Type: application/json" -d "{\"nombre\":\"Cambio de aceite\",\"categoria\":\"mantenimiento\",\"precio\":180,\"duracion_min\":45}"
```

Las pruebas automatizadas y sus resultados están en [PRUEBAS-SEDES-SERVICIOS.md](PRUEBAS-SEDES-SERVICIOS.md).
