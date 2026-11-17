# Pruebas de los módulos Sedes y Servicios

Evidencia Evaluativa 3 · Entregable 2. Pruebas unitarias y de integración con **Jest + Supertest**,
y pruebas manuales con aserciones en **Postman**.

## 1. Cómo ejecutarlas

Las pruebas de Jest **no necesitan MySQL ni Docker**: los repositorios (lo único externo) se
reemplazan por una base en memoria con los datos del seed.

| Comando | Qué corre |
|---|---|
| `npm test` | Todo Jest: 333 pruebas |
| `npm run test:unit` | Solo unitarias (194) |
| `npm run test:integracion` | Solo integración por HTTP (139) |
| `npm run cobertura` | Jest + reporte de cobertura |
| `npm run test:suite` | Suite anterior del proyecto (`test-suite.js`, 61 casos) |
| `npm run test:todo` | Suite anterior + Jest |

Postman: importar `postman/kodo-sedes-servicios-pruebas.postman_collection.json`, poner en la variable
`apiKey` el valor de `API_KEY` del `.env` y ejecutar con *Run collection* (API y MySQL levantados).
Por terminal:

```bash
npx newman run postman/kodo-sedes-servicios-pruebas.postman_collection.json --env-var apiKey=TU_API_KEY
```

## 2. Qué se prueba y en qué nivel

| Archivo | Tipo | Pruebas | Qué verifica |
|---|---|---|---|
| `tests/unit/sede.model.test.js` | Unitaria | 24 | Apertura antes del cierre (límites), datos que se guardan, filtros |
| `tests/unit/servicio.model.test.js` | Unitaria | 31 | Límites del precio y la duración, redondeo, categorías |
| `tests/unit/sedes.validators.test.js` | Unitaria | 34 | Reglas de express-validator: obligatorio, formato, longitud, saneamiento |
| `tests/unit/servicios.validators.test.js` | Unitaria | 42 | Rangos de precio y duración, lista cerrada de categorías |
| `tests/unit/sedes.service.test.js` | Unitaria con `jest.mock` | 17 | Reglas de negocio sin base: 404, 409 y que **no guarda** cuando falla |
| `tests/unit/servicios.service.test.js` | Unitaria con `jest.mock` | 16 | Igual para servicios; reloj congelado en la baja |
| `tests/unit/auth.test.js` | Unitaria | 13 | 401 y 403 |
| `tests/unit/errores-handler.test.js` | Unitaria con `jest.fn` | 17 | Contrato de error; el 500 no filtra datos internos |
| `tests/integracion/sedes.api.test.js` | Integración | 42 | CRUD de sedes por HTTP: 200, 201, 204, 400, 404, 409, 413, 500, 503 |
| `tests/integracion/servicios.api.test.js` | Integración | 39 | CRUD de servicios por HTTP |
| `tests/integracion/seguridad.api.test.js` | Integración | 55 | Las 10 rutas sin credencial (401), escrituras sin rol (403), orden 401→403→400→404 |
| `tests/integracion/flujo.api.test.js` | Integración | 3 | Crear → consultar → actualizar → eliminar → ya no existe; baja bloqueada por citas |
| **Total** | | **333** | |

## 3. Tabla de casos (diseño)

Cada regla se prueba con un caso positivo, uno negativo y **ambos lados de cada límite**.

| ID | Regla | Entrada | Esperado | Tipo |
|---|---|---|---|---|
| C01 | Listar sedes | `GET /api/sedes` con llave | 200 · 3 sedes | positivo |
| C02 | Sede inexistente | `GET /api/sedes/999` | 404 `NO_ENCONTRADO` | negativo |
| C03 | Id mal formado | `GET /api/sedes/abc`, `0`, `-1`, `1.5` | 400, sin consultar la base | negativo |
| C04 | Crear sede | cuerpo completo | 201 · id nuevo · horas `HH:MM:SS` | positivo |
| C05 | Obligatorios | `POST /api/sedes` con `{}` | 400 · 6 campos en `errores[]` | negativo |
| C06 | Teléfono de 9 dígitos | 9 dígitos / 8 y 10 | 201 / 400 | límite |
| C07 | Apertura antes del cierre | 17:59–18:00 / 18:00–18:00 | 201 / 400 | límite |
| C08 | Horario contra lo guardado | `PUT` cierre 07:30 (abre 08:00) | 400 y no cambia | negocio |
| C09 | Nombre único | `Kodo Surquillo` otra vez | 409 `CONFLICTO` | negativo |
| C10 | Nombre de sede dada de baja | nombre de una sede eliminada | 409 que lo aclara | negocio |
| C11 | Baja lógica | `DELETE` y luego `GET` | 204 → 404; sigue con `activa=false` | positivo |
| C12 | Baja con citas pendientes | sede con 2 citas | 409 y la sede sigue activa | negocio |
| C13 | Precio | 0.01 y 999999.99 / 0 y 1000000 | 201 / 400 | límite |
| C14 | Duración | 15 y 480 / 14 y 481 | 201 / 400 | límite |
| C15 | Categoría | `frenos` / `lavado` | 201 / 400 | equivalencia |
| C16 | Varios campos mal | categoría, precio y duración inválidos | 400 con los 3 campos | negativo |
| C17 | Bandera de baja | `activa` / `activo` en el cuerpo | 400 | negativo |
| C18 | Campo desconocido | `gerente`, `garantia_meses` | 400 con ese campo | negativo |
| C19 | Sin credencial | las 10 rutas sin `x-api-key` | 401 `NO_AUTENTICADO` | seguridad |
| C20 | Sin rol | las 6 escrituras con `x-rol: recepcion` | 403 `SIN_PERMISO` y nada cambia | seguridad |
| C21 | Error inesperado | el repositorio lanza un error | 500 genérico, sin detalle interno | negativo |
| C22 | MySQL apagado | `ECONNREFUSED` | 503, sin `ECONNREFUSED` ni puerto | negativo |
| C23 | JSON roto / cuerpo > 10 KB | cuerpo mal formado / 11 000 caracteres | 400 / 413 | negativo |
| C24 | Flujo de una sede | crear → consultar → actualizar → eliminar | 201 → 200 → 200 → 204 → 404 | flujo |

## 4. Resultados obtenidos

| Corrida | Resultado | Evidencia |
|---|---|---|
| `npm test` (Jest) | **333 de 333 en verde**, 12 archivos, ~5 s | [evidencias/01-jest-detalle.txt](evidencias/01-jest-detalle.txt) |
| `npm run cobertura` | 95.5 % de líneas, 78.3 % de ramas | [evidencias/02-jest-cobertura.txt](evidencias/02-jest-cobertura.txt) |
| Colección de Postman (Newman) | 47 peticiones, **218 aserciones, 0 fallos** | [evidencias/03-newman-postman.txt](evidencias/03-newman-postman.txt) |
| `npm run test:suite` | 61 de 61 | [evidencias/04-test-suite-anterior.txt](evidencias/04-test-suite-anterior.txt) |

**Alcance de la evidencia.** Jest corre sobre repositorios en memoria. La corrida de Newman guardada
se hizo contra la API real (`npm start`, puerto 4000) conectada a MySQL 8.4 en Docker (contenedor
`kodo_mysql`, base `kodo_db`): 47 peticiones y 218 aserciones sin fallos. Las capturas de Postman se
toman antes de exponer.

La cobertura se usa como mapa de lo que falta mirar, no como nota: las ramas sin cubrir están en
código compartido con otros equipos (`validarId.js`, mensajes por defecto de `AppError.js`).

### ¿Las pruebas detectan fallos? (mutaciones)

Se rompió el código a propósito y se contó cuántas pruebas lo notan. Ninguna mutación pasó inadvertida.

| Cambio hecho en `src/` | Qué simula | Pruebas que fallan |
|---|---|---|
| `>=` por `>` al comparar apertura y cierre | Sede que abre y cierra a la misma hora | 3 |
| Quitar `autenticar` de las rutas de sedes | API expuesta | 13 |
| Quitar el rol admin del `DELETE` de servicios | Cualquiera da de baja un servicio | 4 |
| El 500 devuelve `error.message` | Fuga de datos internos | 2 |
| Duración mínima 15 → 14 | Límite corrido | 2 |
| `precio <= 0` por `precio < 0` | Servicio gratis | 3 |
| No revisar citas pendientes en la baja de una sede | Citas huérfanas | 2 |
| Aceptar cualquier llave del mismo largo | Autenticación rota | 1 |
| Teléfono acepta 8 dígitos | Límite corrido | 1 |

## 5. Errores detectados y corrección

| # | Error detectado | Cómo se detectó | Causa | Corrección |
|---|---|---|---|---|
| 1 | `/api/sedes` y `/api/servicios` respondían a cualquiera, incluidas las escrituras | Revisión de rutas al diseñar los casos de seguridad | `autenticar` y `autorizar` existían, pero solo se usaban en `/api/prueba-auth` | `enrutador.use(autenticar)` en ambos recursos y `autorizar('admin')` en POST, PUT y DELETE. 55 pruebas lo protegen |
| 2 | La llave de la API estaba escrita en el código (`'kodo-api-key-2026'` como valor por defecto) y en una colección de Postman | Revisión de `auth.js` | Valor de respaldo para que funcionara sin configurar | La llave se lee solo de `API_KEY` en `.env`; sin ella la API no arranca. Una prueba confirma que la llave antigua ya no entra |
| 3 | Un 400 por regla de negocio devolvía `errores` como lista de textos, y uno de formato como `{ campo, mensaje }` | **25 pruebas en rojo**: `Expected: {"campo", "mensaje"}` · `Received: "hora_apertura debe ser menor que hora_cierre"` | Los modelos de sede y servicio armaban textos; los validadores, objetos | Los modelos emiten `{ campo, mensaje }`. Un cliente lee `errores[]` igual en todos los 400 |
| 4 | Un campo desconocido (`gerente`) respondía con otro formato de error | Caso C18 | Lo rechazaba una utilidad compartida que devuelve textos | Middleware `soloCamposPermitidos` en las rutas de sedes y servicios, con un error por campo |
| 5 | 16 pruebas de seguridad fallaban con `Received function done` y tiempo agotado | Salida de Jest | **Error de la prueba, no del código**: en `test.each`, las filas sin cuerpo tenían 2 valores y Jest pasaba su callback `done` como tercer argumento | Todas las filas llevan 3 valores (`null` cuando no hay cuerpo). Se dejó un comentario en el archivo |

Los errores 3 y 5 muestran las dos lecturas de una prueba en rojo: en el 3 tenía razón la prueba
(el contrato) y se corrigió el código; en el 5 estaba mal la prueba y se corrigió la prueba.

## 6. Limitaciones conocidas

- `x-rol` lo declara el cliente: es la simulación didáctica de la Semana 10, no autenticación real.
- Las pruebas no ejecutan SQL: un error en una consulta de `repositories/` solo lo detecta la
  colección de Postman contra MySQL.
- La unicidad del nombre también depende del índice `UNIQUE` de MySQL (dos altas simultáneas);
  el manejador traduce ese caso (`ER_DUP_ENTRY`) a 409, y eso se prueba a nivel unitario.
