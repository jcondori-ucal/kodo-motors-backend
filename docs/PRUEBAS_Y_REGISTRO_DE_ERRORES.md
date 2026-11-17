# Pruebas y registro de errores · Repuestos y Catálogo

Evidencia Evaluativa 3 · Fundamentos de Desarrollo Back-End (UCAL) · Grupo 3

## 1. Cómo ejecutar las pruebas

### Pruebas automáticas (Jest + Supertest)

No necesitan la base de datos: el repositorio (MySQL) se simula con `jest.mock`.

```bash
npm install
npm test
```

| Comando | Qué ejecuta |
|---|---|
| `npm test` | Todas las pruebas de `tests/` |
| `npm run test:unit` | Solo las unitarias (`tests/unit/`) |
| `npm run test:integracion` | Solo las de integración (`tests/integracion/`) |
| `npm run cobertura` | Todas, con el reporte de cobertura |
| `npm run test:suite` | La suite de verificación de la EE2 (`test-suite.js`) |

### Pruebas funcionales (Postman)

Usan la API real con la base de datos.

1. Levantar la API: `npm run dev`.
2. En Postman: *Import* → `postman/kodo-motors-grupo3-repuestos-catalogo.postman_collection.json`.
3. *Run collection* para ejecutar las 40 peticiones en orden.

La colección se puede repetir sin reiniciar la base: los registros nuevos usan un código distinto
en cada ejecución.

## 2. Qué se prueba

| Archivo | Tipo | Pruebas | Qué verifica |
|---|---|---|---|
| `tests/unit/apperror.test.js` | Unitaria | 13 | Cada clase de error tiene su código HTTP y su tipo |
| `tests/unit/errores-handler.test.js` | Unitaria | 18 | El manejador central: formato del error, 500 sin datos internos, errores de MySQL, id inválido |
| `tests/integracion/errores.api.test.js` | Integración | 22 | Errores controlados de repuestos y catálogo por HTTP: 400, 404, 409, 413, 500 y 503 |
| `tests/integracion/repuestos.validaciones.test.js` | Integración | 46 | Validaciones de repuestos: casos válidos, inválidos y límite |
| `tests/integracion/repuestos.api.test.js` | Integración | 22 | CRUD de repuestos, regla de baja con stock y un flujo completo |
| Pruebas de catálogo | Integración | — | CRUD de catálogo y regla de combinación repetida |
| Colección Postman del Grupo 3 | Funcional | 40 peticiones | Ambos módulos contra la base de datos real |

## 3. Diseño de casos

Cada regla se prueba con tres tipos de caso: uno válido, uno inválido y los dos lados del límite.

### Repuestos · condiciones límite

| Regla | Justo adentro | Justo afuera |
|---|---|---|
| Precio mayor a 0 | 0.01 → 201 | 0 → 400 |
| Precio máximo 999999.99 | 999999.99 → 201 | 1000000 → 400 |
| Stock de 0 o más | 0 → 201 | -1 → 400 |
| Código de 3 a 20 caracteres | 3 y 20 → 201 | 2 y 21 → 400 |
| Nombre de máximo 100 caracteres | 100 → 201 | 101 → 400 |
| Ubicación de máximo 20 caracteres | 20 → 201 | 21 → 400 |
| Dar de baja solo sin stock | stock 0 → 204 | stock 1 → 400 |

### Repuestos · casos por operación

| ID | Petición | Entrada | Esperado |
|---|---|---|---|
| R04 | `POST /api/repuestos` | Repuesto completo y correcto | 201 |
| R07 | `POST /api/repuestos` | Cuerpo vacío | 400 · 4 campos con error |
| R08 | `POST /api/repuestos` | `precio: -20` | 400 · `precio` |
| R11 | `POST /api/repuestos` | `modelo_compatible: "Corolla"` | 400 · `modelo_compatible` |
| R12 | `POST /api/repuestos` | `codigo: "PE01#14"` | 400 · `codigo` |
| R15 | `POST /api/repuestos` | JSON con coma final | 400 · `SOLICITUD_INVALIDA` |
| R16 | `GET /api/repuestos/abc` | id no numérico | 400 · `id` |
| R18 | `GET /api/repuestos/999999` | id que no existe | 404 |
| R19 | `POST /api/repuestos` | Código ya registrado | 409 |
| R20 | `DELETE /api/repuestos/:id` | Repuesto con stock 3 | 400 |
| R22 | `DELETE /api/repuestos/:id` | El mismo, con stock 0 | 204 |
| R24 | `POST /api/repuestos` | Código de un repuesto dado de baja | 409 |

### Catálogo · casos por operación

| ID | Petición | Entrada | Esperado |
|---|---|---|---|
| C02 | `POST /api/catalogo` | Vehículo completo y correcto | 201 |
| C05 | `POST /api/catalogo` | Cuerpo vacío | 400 · 6 campos con error |
| C06 | `POST /api/catalogo` | `modelo: "Corolla"` | 400 · `modelo` |
| C07 | `POST /api/catalogo` | `anio: 1899` (límite) | 400 · `anio` |
| C08 | `POST /api/catalogo` | `precio_usd: 0` (límite) | 400 · `precio_usd` |
| C12 | `GET /api/catalogo/999999` | id que no existe | 404 |
| C13 | `POST /api/catalogo` | Modelo + versión + año repetido | 409 |
| C14 | `DELETE /api/catalogo/:id` | Vehículo existente | 204 |
| C16 | `DELETE /api/catalogo/:id` | El mismo, por segunda vez | 404 |

Los ID coinciden con el nombre de cada petición en la colección Postman.

## 4. Resultados obtenidos

Salida de `npm test` con las partes de errores y repuestos integradas:

```
PASS tests/unit/apperror.test.js
PASS tests/unit/errores-handler.test.js
PASS tests/integracion/errores.api.test.js
PASS tests/integracion/repuestos.validaciones.test.js
PASS tests/integracion/repuestos.api.test.js

Test Suites: 5 passed, 5 total
Tests:       121 passed, 121 total
Time:        2.286 s
```

> Actualizar este bloque y agregar las capturas de `npm test` y del *Runner* de Postman cuando
> estén integradas todas las partes del grupo.

### ¿Las pruebas detectan fallos?

Se rompió el código a propósito para comprobar que alguna prueba fallara. Después se restauró.

| Cambio hecho a propósito | Qué simula | Pruebas que fallaron |
|---|---|---|
| El error 500 devuelve `error.message` | Fuga de datos internos al cliente | 3 |
| `id <= 0` por `id < 0` en `validarId` | Se acepta el id 0 | 2 |
| Quitar `validar` de `POST /api/repuestos` | Las reglas existen, pero nadie lee el resultado | 24 |
| `stock > 0` por `stock > 1` en la baja de repuestos | Se da de baja un repuesto con 1 unidad | 1 |

## 5. Registro de errores encontrados y mejoras aplicadas

### Errores funcionales detectados con las pruebas

| # | Error encontrado | Cómo se detectó | Causa | Corrección |
|---|---|---|---|---|
| 1 | Repuestos devolvía los errores de validación como lista de textos, y catálogo como `{ campo, mensaje }` | La prueba que revisa los campos con error no encontraba el `campo` | Repuestos validaba a mano dentro del modelo | Nuevo `repuestos.validators.js` con `express-validator`; ahora ambos módulos responden igual |
| 2 | Un id inválido respondía `SOLICITUD_INVALIDA` en repuestos y `VALIDACION` en catálogo | La prueba de id inválido necesitaba un tipo distinto para cada módulo | Repuestos usaba el middleware `validarId` y catálogo `idParam` | Las rutas de repuestos usan `idParam` + `validar`, igual que catálogo |
| 3 | Repuestos aceptaba un precio con 3 decimales o un código con símbolos | Casos inválidos de la tabla de diseño | El modelo solo revisaba que el precio fuera mayor a 0 y el código tuviera 3 caracteres | Reglas de formato: máximo 2 decimales; solo letras, números y guiones |
| 4 | Los filtros del listado aceptaban cualquier valor (`bajo_stock=quizas`) | Caso inválido de filtros | No había validación de la consulta | Reglas para `modelo_compatible`, `bajo_stock` e `incluir_inactivos` |
| 5 | `npm test` no ejecutaba la prueba de catálogo | El total de pruebas no subía al integrarla | El archivo estaba en `src/tests/` y Jest busca solo en `tests/` | Se movió a `tests/integracion/` |

### Comportamientos revisados que se mantienen (con explicación)

| Comportamiento | Explicación |
|---|---|
| Dar de baja un repuesto con stock responde 400 y no 409 | Se conservó el código que ya usaba el módulo desde la EE2 para no cambiar el contrato con quien consume la API |
| `PUT /api/catalogo/:id` exige todos los campos y `PUT /api/repuestos/:id` no | Catálogo reemplaza el registro completo; repuestos actualiza solo lo enviado. Está documentado en la tabla de endpoints |
| El modelo `Repuesto.validar` sigue existiendo | Es una segunda barrera dentro del servicio y la usa la suite de la EE2 |

### Incidencias de sincronización en GitHub

| # | Incidencia | Causa | Solución |
|---|---|---|---|
| 1 | `git push` rechazado con "Permission denied" | El integrante no tenía permiso de escritura en el repositorio | Flujo con fork: cada integrante sube a su fork y abre un Pull Request hacia `Grupo_3-ee3` |
| 2 | `git push` al fork respondía "Repository not found" | La URL del remoto se guardó cortada (`.gi` en lugar de `.git`) | `git remote set-url fork <url correcta>` |
| 3 | Conflicto de merge en `package.json` (PR #5) | Dos integrantes cambiaron el script `test` en la misma zona | Se resolvió en GitHub conservando los scripts de ambos y se completó el merge |
| 4 | El repositorio de trabajo cambió a mitad del avance | El docente creó un repositorio nuevo para la EE3 | Se agregó el nuevo como remoto `origin`; no hubo que clonar otra vez porque el historial era el mismo |

## 6. Evidencias

Agregar aquí las capturas (carpeta `docs/evidencias/`):

- [ ] `npm test` en verde con el total de pruebas.
- [ ] *Runner* de Postman con las 40 peticiones.
- [ ] Una respuesta exitosa (201) y una de error controlado (400) en Postman.
- [ ] Una prueba en rojo al romper el código a propósito, y en verde al restaurarlo.
- [ ] Lista de Pull Requests integrados en `Grupo_3-ee3`.
