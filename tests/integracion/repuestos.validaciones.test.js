// Pruebas de las validaciones de Repuestos (Semana 9): casos válidos, inválidos y límite.
// El repositorio se simula: aquí se prueba que un dato inválido NUNCA llegue a guardarse.
jest.mock('../../src/repositories/repuestos.repository');

const repo = require('../../src/repositories/repuestos.repository');
const { request, app, esperarError, camposConError } = require('../helpers/api');

// Un repuesto correcto: cada prueba cambia solo el campo que quiere revisar.
const repuestoValido = {
  codigo: 'PE01-14-302',
  nombre: 'Filtro de aceite',
  modelo_compatible: 'CX-5',
  precio: 45.5,
  stock: 10,
  stock_minimo: 5,
  ubicacion: 'A-01',
};

// Lo que devuelve el repositorio al buscar un repuesto ya guardado.
const repuestoGuardado = {
  id: 1,
  codigo: 'PE01-14-302',
  nombre: 'Filtro de aceite',
  modeloCompatible: 'CX-5',
  stock: 10,
  stockMinimo: 5,
  precio: 45.5,
  ubicacion: 'A-01',
};

const crear = (cambios) => request(app).post('/api/repuestos').send({ ...repuestoValido, ...cambios });

beforeEach(() => {
  jest.resetAllMocks();
  repo.findByCodigo.mockResolvedValue(null); // el código está libre
  repo.create.mockImplementation(async (datos) => ({ id: 5, ...datos }));
});

describe('POST /api/repuestos · casos válidos', () => {
  test('201 · repuesto completo y correcto', async () => {
    const res = await crear({});

    expect(res.status).toBe(201);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('201 · solo los campos obligatorios', async () => {
    const res = await request(app).post('/api/repuestos').send({
      codigo: 'KD1Y-33-28Z', nombre: 'Pastillas delanteras', modelo_compatible: 'Todos', precio: 260,
    });

    expect(res.status).toBe(201);
  });

  test('limpia y transforma: código en mayúsculas, sin espacios, y precio numérico', async () => {
    await crear({ codigo: '  pe01-14-302  ', nombre: '  Filtro   de aceite ', precio: '45.50' });

    expect(repo.create.mock.calls[0][0]).toMatchObject({
      codigo: 'PE01-14-302',
      nombre: 'Filtro de aceite',
      precio: 45.5,
    });
  });
});

describe('POST /api/repuestos · campos obligatorios', () => {
  test.each([
    ['codigo'],
    ['nombre'],
    ['modelo_compatible'],
    ['precio'],
  ])('400 · falta %s', async (campoFaltante) => {
    const res = await crear({ [campoFaltante]: undefined });

    esperarError(res, 400, 'VALIDACION');
    expect(camposConError(res)).toEqual([campoFaltante]);
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('400 · cuerpo vacío: avisa de los 4 obligatorios a la vez', async () => {
    const res = await request(app).post('/api/repuestos').send({});

    esperarError(res, 400, 'VALIDACION');
    expect(camposConError(res)).toEqual(['codigo', 'modelo_compatible', 'nombre', 'precio']);
  });
});

describe('POST /api/repuestos · formatos y tipos', () => {
  test.each([
    ['código con símbolos', { codigo: 'PE01#14' }, 'codigo'],
    ['código que es un número', { codigo: 12345 }, 'codigo'],
    ['nombre de solo espacios', { nombre: '   ' }, 'nombre'],
    ['modelo que no es Mazda', { modelo_compatible: 'Corolla' }, 'modelo_compatible'],
    ['precio con texto', { precio: 'gratis' }, 'precio'],
    ['precio con 3 decimales', { precio: 45.555 }, 'precio'],
    ['precio negativo', { precio: -20 }, 'precio'],
    ['precio booleano', { precio: true }, 'precio'],
    ['stock decimal', { stock: 2.5 }, 'stock'],
    ['stock con texto', { stock: 'muchos' }, 'stock'],
    ['stock mínimo negativo', { stock_minimo: -1 }, 'stock_minimo'],
    ['ubicación con etiquetas HTML', { ubicacion: '<b>A-01</b>' }, 'ubicacion'],
    ['enviar el id', { id: 99 }, 'id'],
    ['enviar activo', { activo: 0 }, 'activo'],
  ])('400 · %s', async (_nombre, cambios, campoEsperado) => {
    const res = await crear(cambios);

    esperarError(res, 400, 'VALIDACION');
    expect(camposConError(res)).toEqual([campoEsperado]);
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('cada error trae campo y mensaje en español', async () => {
    const res = await crear({ precio: -20 });

    expect(res.body.errores[0]).toEqual({
      campo: 'precio',
      mensaje: 'El precio debe ser mayor a 0 y máximo 999999.99',
    });
  });
});

describe('POST /api/repuestos · condiciones límite', () => {
  test.each([
    ['precio 0.01 (mínimo)', { precio: 0.01 }, 201],
    ['precio 0 (justo afuera)', { precio: 0 }, 400],
    ['precio 999999.99 (máximo)', { precio: 999999.99 }, 201],
    ['precio 1000000 (justo afuera)', { precio: 1000000 }, 400],
    ['stock 0 (mínimo)', { stock: 0 }, 201],
    ['stock -1 (justo afuera)', { stock: -1 }, 400],
    ['código de 3 caracteres (mínimo)', { codigo: 'AB1' }, 201],
    ['código de 2 caracteres (justo afuera)', { codigo: 'AB' }, 400],
    ['código de 20 caracteres (máximo)', { codigo: 'A'.repeat(20) }, 201],
    ['código de 21 caracteres (justo afuera)', { codigo: 'A'.repeat(21) }, 400],
    ['nombre de 100 caracteres (máximo)', { nombre: 'x'.repeat(100) }, 201],
    ['nombre de 101 caracteres (justo afuera)', { nombre: 'x'.repeat(101) }, 400],
    ['ubicación de 20 caracteres (máximo)', { ubicacion: 'A'.repeat(20) }, 201],
    ['ubicación de 21 caracteres (justo afuera)', { ubicacion: 'A'.repeat(21) }, 400],
  ])('%s → %i', async (_nombre, cambios, estadoEsperado) => {
    const res = await crear(cambios);

    expect(res.status).toBe(estadoEsperado);
  });
});

describe('PUT /api/repuestos/:id · actualización parcial', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(repuestoGuardado);
    repo.update.mockImplementation(async (id, datos) => ({ id, ...datos }));
  });

  test('200 · se puede enviar solo el stock', async () => {
    const res = await request(app).put('/api/repuestos/1').send({ stock: 25 });

    expect(res.status).toBe(200);
    expect(repo.update.mock.calls[0][1]).toMatchObject({ stock: 25, nombre: 'Filtro de aceite' });
  });

  test.each([
    ['stock negativo', { stock: -1 }, 'stock'],
    ['precio 0', { precio: 0 }, 'precio'],
    ['nombre vacío', { nombre: '' }, 'nombre'],
    ['enviar activo', { activo: 1 }, 'activo'],
  ])('400 · %s: si el campo viene, se valida', async (_nombre, cambios, campoEsperado) => {
    const res = await request(app).put('/api/repuestos/1').send(cambios);

    esperarError(res, 400, 'VALIDACION');
    expect(camposConError(res)).toEqual([campoEsperado]);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('GET /api/repuestos · filtros', () => {
  beforeEach(() => repo.findAll.mockResolvedValue([]));

  test('200 · filtros correctos', async () => {
    const res = await request(app).get('/api/repuestos?modelo_compatible=CX-5&bajo_stock=true');

    expect(res.status).toBe(200);
  });

  test.each([
    ['modelo que no existe', 'modelo_compatible=Corolla', 'modelo_compatible'],
    ['bajo_stock que no es true/false', 'bajo_stock=quizas', 'bajo_stock'],
    ['incluir_inactivos que no es true/false', 'incluir_inactivos=1', 'incluir_inactivos'],
  ])('400 · %s', async (_nombre, consulta, campoEsperado) => {
    const res = await request(app).get(`/api/repuestos?${consulta}`);

    esperarError(res, 400, 'VALIDACION');
    expect(camposConError(res)).toEqual([campoEsperado]);
    expect(repo.findAll).not.toHaveBeenCalled();
  });
});
