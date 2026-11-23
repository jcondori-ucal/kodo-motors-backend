# Kodo Motors API · Encuestas y Repuestos

![Kodo Motors](assets/banner.png)

API REST de **Kodo Motors** (taller y venta de vehículos Mazda) con Node.js, Express y MySQL.
Este documento corresponde a la **Evidencia Evaluativa 3** del curso *Fundamentos de Desarrollo Back-End*
(UCAL) y documenta los servicios **Encuestas** y **Repuestos** del **equipo E2 (rama `G2-EE3`)**.

## Contenido

1. [Nombre del proyecto](#1-nombre-del-proyecto)
2. [Integrantes del equipo](#2-integrantes-del-equipo)
3. [Empresa aliada](#3-empresa-aliada)
4. [Descripción de la solución](#4-descripción-de-la-solución)
5. [Tecnologías utilizadas](#5-tecnologías-utilizadas)
6. [Instalación](#6-instalación)
7. [Ejecución](#7-ejecución)
8. [Endpoints principales](#8-endpoints-principales)
9. [Base de datos](#9-base-de-datos)
10. [Observaciones y problemas resueltos durante la integración](#10-observaciones-y-problemas-resueltos-durante-la-integración)
11. [EE3 · Validaciones, pruebas y documentación (Grupo 3)](#11-ee3--validaciones-pruebas-y-documentación-grupo-3)

## 1. Empresa aliada

**Kodo Motors**, empresa limeña especializada en vehículos Mazda, con tres líneas de trabajo: venta de
vehículos, servicio de taller y venta de repuestos.

## 2. Equipo

| Integrante | Responsabilidad en la EE3 |
|---|---|
| Adso Martin Obregon Gutierrez | Semana 9 · validaciones |
| Iván Hermilio Mera Ibarguen | Semana 10 · manejo de errores |
| Lenin David Mamani Sarmiento | Semana 11 · pruebas |
| Sharmili Luzmer Soncco Lupa | Documentación |
| Geraldo Fair Jaramillo Florida (líder técnico) | Documentación · revisión y merge |
| Rodrigo Alonso | Documentación QA (reporte de pruebas) |

## 3. Tecnologías

| Tecnología | Uso |
|---|---|
| Node.js 18 o superior | Entorno de ejecución |
| Express 5 | Servidor HTTP y rutas |
| express-validator | Validación de datos de entrada |
| MySQL 8.4 (Docker) y `mysql2` | Base de datos relacional y conexión |
| `dotenv` y `cors` | Variables de entorno y CORS |
| nodemon | Reinicio automático en desarrollo |
| Postman | Pruebas manuales de los endpoints |

## 4. Estructura del proyecto

```text
src/
├── app.js                 # Express: middlewares globales, rutas y manejo de errores
├── server.js              # Arranque: prueba la conexión a MySQL y escucha el puerto
├── config/                # Conexión a MySQL (pool)
├── routes/                # Rutas por recurso
├── controllers/           # Reciben la petición y responden
├── services/              # Reglas de negocio
├── repositories/          # Consultas SQL
├── models/                # Validación y forma de cada recurso
├── validators/            # Reglas de express-validator
├── middlewares/           # manejarErrores.js y validarId.js
└── utils/                 # Utilidades compartidas
database/                  # 01_schema.sql y 02_seed.sql
postman/                   # Colección de Postman
assets/                    # Logo
```

## 5. Instalación

Requisitos: Node.js 18+, Docker Desktop abierto y Git.

```bash
git clone https://github.com/jcondori-ucal/kodo-motors-backend.git
cd kodo-motors-backend
git switch G2-EE3
npm install
cp .env.example .env
```

En Windows (cmd): `copy .env.example .env`. Luego se reemplaza cada texto del `.env` por el valor real.

## 6. Ejecución

```bash
docker compose up -d      # levanta MySQL (puerto 3307) y Adminer (puerto 8081)
npm run dev               # levanta la API en http://localhost:4000
```

Comprobación rápida: `GET http://localhost:4000/api/salud`.

| Comando | Para qué |
|---|---|
| `npm run dev` | API con reinicio automático |
| `npm start` | API sin nodemon |
| `npm test` | Ejecuta `test-suite.js` (sin necesidad de base de datos) |
| `npm run bd:levantar` · `bd:detener` | Levanta o detiene MySQL |
| `npm run bd:reiniciar` | Borra la base y la vuelve a crear desde `database/` |

## 7. Variables de entorno

El archivo `.env` **no se sube a GitHub**; solo se sube la plantilla `.env.example`, que contiene las claves:

```
kodo-motor-backend/
├── database/
│   ├── 01_schema.sql          # 14 tablas de kodo_db, trigger de encuestas
│   └── 02_seed.sql            # datos de ejemplo
├── postman/
│   └── kodo-motor-backend.postman_collection.json
├── src/
│   ├── server.js              # entrada: prueba MySQL y levanta la API
│   ├── app.js                 # CORS, JSON, rutas, 404 y errores
│   ├── config/db.js           # pool de mysql2/promise
│   ├── routes/                # un archivo por recurso + index.js
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── middlewares/           # validarId, manejarErrores
│   ├── validators/            # reglas de express-validator por recurso
│   └── utils/                 # HttpError, validaciones
├── tests/                     # npm test (Jest + Supertest)
│   ├── helpers/api.js         # app, esperarError y ayudas compartidas
│   ├── unit/                  # clases de error y manejador central
│   └── integracion/           # la API por HTTP, con el repositorio simulado
├── docs/                      # documentación técnica y registro de pruebas
├── test-suite.js              # npm run test:suite (verificación de la EE2)
├── docker-compose.yml         # MySQL 8.4 y Adminer
└── .env.example               # qué variables hay que definir (sin credenciales)
```

Si hay errores por campo se agrega `"errores": [ ... ]`. La cabecera `X-Request-Id` repite el `idTraza`.
Un error inesperado responde `500` con `"mensaje": "Error interno del servidor"` y **nunca** expone datos internos.

| Código | `tipo` | Cuándo |
|---|---|---|
| Node.js | 18 o superior | Ejecuta JavaScript en el servidor |
| Express | 5.2 | Servidor HTTP, rutas y middlewares |
| mysql2 | 3.24 | Pool de conexiones y consultas con placeholders |
| dotenv | 17.4 | Lee el archivo `.env` |
| cors | 2.8 | Permite que un frontend en otra dirección consuma la API |
| MySQL | 8.4 | Base de datos relacional, en un contenedor Docker |
| Docker Compose | — | Levanta MySQL y Adminer |
| nodemon | 3.1 | Reinicia la API al guardar cambios |
| express-validator | 7.3 | Valida y limpia los datos de entrada |
| Jest | 30 | Pruebas automáticas |
| Supertest | 7.3 | Peticiones HTTP a la API dentro de las pruebas |
| Postman | — | Pruebas de los endpoints |

## 6. Instalación

### 8.2 Repuestos · `/api/repuestos`

Piezas de repuesto y su stock. El `DELETE` es **borrado lógico**: la fila se conserva con `activo = false`.

| Método | Ruta | Parámetros | Cuerpo | Éxito | Errores |
|---|---|---|---|---|---|
| GET | `/api/repuestos` | `modelo_compatible`, `bajo_stock=true`, `incluir_inactivos=true` (opcionales) | — | 200 lista | — |
| GET | `/api/repuestos/:id` | `id` entero positivo | — | 200 objeto | 400 id inválido · 404 |
| POST | `/api/repuestos` | — | ver abajo | 201 objeto | 400 `VALIDACION` · 409 código repetido |
| PUT | `/api/repuestos/:id` | `id` | cualquier campo de la tabla | 200 objeto | 400 · 404 · 409 |
| DELETE | `/api/repuestos/:id` | `id` | — | 204 | 400 con stock · 404 |

**Cuerpo de `POST`:**

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `codigo` | texto | sí | mínimo 3 caracteres; se guarda en mayúsculas; único |
| `nombre` | texto | sí | no vacío |
| `modelo_compatible` | texto | sí | uno de: `Mazda2`, `Mazda3`, `CX-3`, `CX-30`, `CX-5`, `CX-50`, `CX-90`, `BT-50`, `MX-5`, `Todos` |
| `precio` | número | sí | mayor a 0 |
| `stock` | entero | no (0) | mayor o igual a 0 |
| `stock_minimo` | entero | no (5) | mayor o igual a 0 |
| `ubicacion` | texto | no | — |

`activo` **no se puede enviar**: la baja solo se hace con `DELETE`.

#### Ejemplos

**GET `/api/repuestos/1` → 200**

```json
{ "id": 1, "codigo": "FIL-001", "nombre": "Filtro de aceite", "modeloCompatible": "Mazda3",
  "stock": 0, "stockMinimo": 5, "precio": 25.5, "ubicacion": "A-1", "activo": true,
  "alertaBajoStock": true }
```

> **Importante:** el cuerpo que se **envía** usa `modelo_compatible` y `stock_minimo` (snake_case), pero la
> respuesta devuelve `modeloCompatible` y `stockMinimo` (camelCase) y agrega `alertaBajoStock`
> (`true` cuando `stock` es menor o igual a `stockMinimo`).

**POST `/api/repuestos` → 201**

```json
// cuerpo enviado
{ "codigo": "FIL-002", "nombre": "Filtro de aire", "modelo_compatible": "CX-5", "stock": 10, "precio": 40 }
// respuesta
{ "id": 2, "codigo": "FIL-002", "nombre": "Filtro de aire", "modeloCompatible": "CX-5",
  "stock": 10, "stockMinimo": 5, "precio": 40, "ubicacion": null, "activo": true,
  "alertaBajoStock": false }
```

**POST con cuerpo vacío → 400 `VALIDACION`**

```json
{ "estado": 400, "tipo": "VALIDACION", "mensaje": "Datos de repuesto inválidos",
  "idTraza": "75d8c1e2", "ruta": "POST /api/repuestos",
  "errores": [
    "El campo \"codigo\" es obligatorio y debe tener al menos 3 caracteres",
    "El campo \"nombre\" es obligatorio y no puede estar vacío",
    "El campo \"modelo_compatible\" debe ser uno de: Mazda2, Mazda3, CX-3, CX-30, CX-5, CX-50, CX-90, BT-50, MX-5, Todos",
    "El campo \"precio\" es obligatorio y debe ser un número mayor a 0"
  ] }
```

**POST con código repetido → 409**

```json
{ "estado": 409, "tipo": "CONFLICTO",
  "mensaje": "Ya existe un repuesto registrado con el código \"FIL-001\"",
  "idTraza": "e3cdb4a4", "ruta": "POST /api/repuestos" }
```

**GET `/api/repuestos/abc` → 400 `SOLICITUD_INVALIDA`**

| Comando | Para qué |
|---|---|
| `npm run dev` | API con reinicio automático |
| `npm start` | API sin nodemon |
| `npm test` | Pruebas automáticas con Jest y Supertest, sin necesidad de base de datos |
| `npm run test:unit` / `test:integracion` | Solo las pruebas unitarias o solo las de integración |
| `npm run cobertura` | Pruebas con reporte de cobertura |
| `npm run test:suite` | 61 pruebas de verificación de la EE2 (`test-suite.js`) |
| `npm run bd:levantar` / `bd:detener` | Levanta o detiene MySQL |
| `npm run bd:reiniciar` | Borra la base y la vuelve a crear desde `database/` |

**DELETE `/api/repuestos/1` → 204** (sin cuerpo).
**Regla de negocio:** si el repuesto todavía tiene `stock` mayor a 0, responde **400** y no lo da de baja.

### 8.3 Encuestas · `/api/encuestas`

Encuesta de satisfacción de una orden de servicio. Una orden solo admite **una** encuesta y debe estar **entregada**.
El `DELETE` es borrado lógico.

| Método | Ruta | Parámetros | Cuerpo | Éxito | Errores |
|---|---|---|---|---|---|
| GET | `/api/encuestas` | `puntuacion`, `recomendaria`, `incluir_inactivos=true` (opcionales) | — | 200 lista | — |
| GET | `/api/encuestas/:id` | `id` entero positivo | — | 200 objeto | 400 · 404 |
| POST | `/api/encuestas` | — | ver abajo | 201 objeto | 400 · 404 orden · 409 |
| PUT | `/api/encuestas/:id` | `id` | `puntuacion`, `recomendaria`, `comentario` | 200 objeto | 400 · 404 |
| DELETE | `/api/encuestas/:id` | `id` | — | 204 | 404 |

**Cuerpo de `POST`:**

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `orden_id` | entero | sí | positivo; la orden debe existir y estar en estado `entregado` |
| `puntuacion` | entero | sí | de 1 a 5 |
| `recomendaria` | booleano | sí | `true/false` o `1/0` |
| `comentario` | texto | no | máximo 300 caracteres |

#### Ejemplos

**POST `/api/encuestas` → 201**

```json
// cuerpo enviado
{ "orden_id": 10, "puntuacion": 4, "recomendaria": true, "comentario": "Buen servicio" }
// respuesta
{ "id": 2, "ordenId": 10, "puntuacion": 4, "recomendaria": true, "comentario": "Buen servicio",
  "createdAt": "2026-11-16T19:40:00.000Z", "activo": true }
```

> **Importante:** se envía `orden_id` (snake_case) y la respuesta devuelve `ordenId` (camelCase) y `createdAt`.

**POST con puntuación 9 → 400 `VALIDACION`**

```json
{ "estado": 400, "tipo": "VALIDACION", "mensaje": "Datos de encuesta inválidos",
  "idTraza": "562f31da", "ruta": "POST /api/encuestas",
  "errores": ["El campo \"puntuacion\" es obligatorio y debe ser un número entero entre 1 y 5"] }
```

En sedes, servicios, catálogo, reservas y repuestos, los errores de formato llegan así, por campo. Las reglas
que consultan la base responden `{ "mensaje": "..." }`, a veces con `errores` como lista de textos.

**POST con una orden que no está entregada → 400 `SOLICITUD_INVALIDA`**

```json
{ "estado": 400, "tipo": "SOLICITUD_INVALIDA",
  "mensaje": "No se puede encuestar la orden #12 porque su estado es \"en proceso\". Solo se admiten encuestas para órdenes con estado \"entregado\".",
  "idTraza": "4cc87ee0", "ruta": "POST /api/encuestas" }
```

**POST con una orden que ya tiene encuesta → 409**

```json
{ "estado": 409, "tipo": "CONFLICTO",
  "mensaje": "La orden de servicio #11 ya cuenta con una encuesta de satisfacción registrada (ID: 1)",
  "idTraza": "74a69c5a", "ruta": "POST /api/encuestas" }
```

**GET `/api/encuestas/999` → 404**

```json
{ "estado": 404, "tipo": "NO_ENCONTRADO", "mensaje": "Encuesta con ID 999 no encontrada",
  "idTraza": "da02e41d", "ruta": "GET /api/encuestas/999" }
```

**Ruta inexistente (`GET /api/no-existe`) → 404, en JSON y no en HTML**

```json
{ "estado": 404, "tipo": "NO_ENCONTRADO", "mensaje": "Ruta no encontrada: GET /api/no-existe",
  "idTraza": "eab5b445", "ruta": "GET /api/no-existe" }
```

## 9. Pruebas

| Tipo | Cómo se ejecuta | Estado |
|---|---|---|
| Automáticas (`test-suite.js`) | `npm test` | Disponible |
| Manuales con Postman | Importar `postman/kodo-motor-backend.postman_collection.json` y ejecutar *Run collection* | Disponible |
| Reporte de pruebas QAS de Repuestos y Encuestas | Documento del equipo con petición, resultado esperado, resultado obtenido y evidencia | En elaboración |

## 10. Incidencias detectadas

| Incidencia | Causa | Mejora aplicada o pendiente |
|---|---|---|
| Conflicto de merge en `src/routes/index.js` | Dos integrantes agregaron sus rutas en las mismas líneas del archivo | Se conservaron las rutas de ambos, se quitaron las marcas `<<<<<<<`, `=======` y `>>>>>>>` y se completó el merge |
| Conflicto de merge en `.gitignore` | Dos integrantes editaron el archivo en ramas distintas | Se resolvió en Visual Studio Code conservando las reglas de las dos ramas |
| Trabajo subido a una rama distinta de la acordada | Un integrante subió su parte a `feature/errores-y-docs` | Se integró a `main` con `git merge` |
| Una rama no permitía abrir un pull request | `feature/encuestas-qa-docs` se subió desde un clon anterior y no tenía historial común con `main` | Se creó la rama desde `origin/main` actualizado, sin `push --force` |
| El precio llegaba como texto (`"380.00"`) | mysql2 devuelve las columnas `DECIMAL` como texto | `decimalNumbers: true` en el pool de `db.js` |
| Las banderas llegaban como `1` y `0` | MySQL guarda `TINYINT(1)` como número | `typeCast` en `db.js` que las convierte en `true` y `false` |
| El teléfono perdía el 0 inicial | Enviado como número, `014567890` se vuelve `14567890` | El teléfono se exige como texto de 9 dígitos |
| Un `stock_minimo` de 0 se guardaba como 5 | `Number(stock_minimo) \|\| 5` trata el 0 como falso | Se cambió por `Number(stock_minimo ?? 5)`, que usa 5 solo si el campo no llega |
| Un JSON mal formado devolvía una página HTML con rutas del disco | Express no tenía un manejador de errores de 4 parámetros | Middleware de errores que responde `400` en JSON |
| Las tildes del seed se guardaban mal (`AtenciÃ³n`) | El contenedor ejecutaba los `.sql` con `latin1` | `SET NAMES utf8mb4;` al inicio de los scripts SQL |
| Reservas y catálogo respondían los errores con formatos distintos | Cada módulo tenía su propia clase de error | Se unificaron en una sola clase y un manejador central |
| Cada PC usaba un puerto de MySQL distinto | Docker publica el 3307, MySQL instalado usa el 3306 y XAMPP otro | El puerto se configura en `.env`, sin tocar código |
| Riesgo de subir las claves de la base de datos | El `.env` tiene usuario y contraseña | `.env` está en `.gitignore`; solo se sube `.env.example` |

### Trabajo colaborativo en GitHub

- `main` contiene los commits de los tres repositorios originales unidos por merge, no copiados.
  `git shortlog -sne` muestra a cada autor (`.mailmap` agrupa a quienes usaron dos correos).
- Las ramas que no llegaron a `main` en sus repos originales se conservan como
  `historial/u2/archivo-reservas`, `historial/u2/jeff` y `historial/g14/feature/encuestas-qa-docs`.
- Cada paso de la fusión es un commit aparte con el formato `[TAG] módulo: descripción`.

## 11. EE3 · Validaciones, pruebas y documentación (Grupo 3)

El Grupo 3 trabajó los módulos de **Repuestos** y **Catálogo** en la rama `Grupo_3-ee3`.

| Qué se hizo | Dónde está |
|---|---|
| Validaciones de repuestos con `express-validator` (obligatorios, formatos, tipos y rangos) | `src/validators/repuestos.validators.js` |
| Mismo formato de error en repuestos y catálogo: `errores: [{ campo, mensaje }]` | `src/routes/repuestos.routes.js` |
| Base de pruebas con Jest y Supertest | `package.json`, `tests/helpers/api.js` |
| Pruebas unitarias y de integración | `tests/unit/`, `tests/integracion/` |
| Pruebas funcionales en Postman con aserciones (`pm.test`) | `postman/kodo-motors-grupo3-repuestos-catalogo.postman_collection.json` |

**Documentación**

- [Documentación técnica de Repuestos y Catálogo](docs/API_REPUESTOS_CATALOGO.md): endpoints,
  parámetros, cuerpos, ejemplos de éxito y de error, y códigos HTTP.
- [Pruebas y registro de errores](docs/PRUEBAS_Y_REGISTRO_DE_ERRORES.md): cómo ejecutar las
  pruebas, tabla de casos, resultados, errores encontrados y su corrección.

**Probar en un minuto** (sin base de datos):

```bash
npm install
npm test
```
