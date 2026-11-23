// Pruebas de integración del CRUD de Repuestos por HTTP (Semana 11).
// Cada petición recorre ruta → validador → controlador → servicio. Solo se simula
// el repositorio (MySQL), y el modelo Repuesto es el real.
jest.mock('../../src/repositories/repuestos.repository');

const repo = require('../../src/repositories/repuestos.repository');
const Repuesto = require('../../src/models/repuesto.model');
const { request, app, esperarError } = require('../helpers/api');

// Filas como las del seed (database/02_seed.sql)
const filtroAceite = {
  id: 1, codigo: 'PE01-14-302', nombre: 'Filtro de aceite', modelo_compatible: 'Todos',
  stock: 2, stock_minimo: 10, precio: 45, ubicacion: 'A-01',
};
const pastillas = {
  id: 2, codigo: 'KD1Y-33-28Z', nombre: 'Pastillas delanteras', modelo_compatible: 'CX-5',
  stock: 8, stock_minimo: 4, precio: 260, ubicacion: 'B-03',
};
const nuevo = {
  codigo: 'PY8W-13-Z40', nombre: 'Filtro de aire', modelo_compatible: 'CX-5', precio: 85, stock: 12,
};

// Convierte una fila en lo que devuelve el repositorio real
const guardado = (fila) => Repuesto.fromRow(fila);

beforeEach(() => jest.resetAllMocks()); // cada prueba prepara su propio estado

describe('GET /api/repuestos · listar', () => {
  test('200 · devuelve todos los repuestos', async () => {
    repo.findAll.mockResolvedValue([guardado(filtroAceite), guardado(pastillas)]);

    const res = await request(app).get('/api/repuestos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ id: 1, codigo: 'PE01-14-302', precio: 45 });
  });

  test('200 · sin repuestos responde una lista vacía', async () => {
    repo.findAll.mockResolvedValue([]);

    const res = await request(app).get('/api/repuestos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('los filtros de la URL llegan al repositorio', async () => {
    repo.findAll.mockResolvedValue([]);

    await request(app).get('/api/repuestos?modelo_compatible=CX-5&bajo_stock=true');

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ modelo_compatible: 'CX-5', bajo_stock: 'true' })
    );
  });

  test('regla de negocio: avisa cuando el stock está en el mínimo o por debajo', async () => {
    repo.findAll.mockResolvedValue([guardado(filtroAceite), guardado(pastillas)]);

    const res = await request(app).get('/api/repuestos');

    expect(res.body[0].alertaBajoStock).toBe(true); // stock 2, mínimo 10
    expect(res.body[1].alertaBajoStock).toBe(false); // stock 8, mínimo 4
  });
});

describe('GET /api/repuestos/:id · consultar', () => {
  test('200 · devuelve el repuesto', async () => {
    repo.findById.mockResolvedValue(guardado(pastillas));

    const res = await request(app).get('/api/repuestos/2');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, nombre: 'Pastillas delanteras', modeloCompatible: 'CX-5' });
    expect(repo.findById).toHaveBeenCalledWith(2); // el id llega como número
  });

  test('404 · el repuesto no existe', async () => {
    repo.findById.mockResolvedValue(null);

    const res = await request(app).get('/api/repuestos/999');

    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(res.body.mensaje).toMatch(/999/);
  });
});

describe('POST /api/repuestos · registrar', () => {
  test('201 · crea el repuesto y lo devuelve con su id', async () => {
    repo.findByCodigo.mockResolvedValue(null);
    repo.create.mockResolvedValue(guardado({ id: 5, stock_minimo: 5, ...nuevo }));

    const res = await request(app).post('/api/repuestos').send(nuevo);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 5, codigo: 'PY8W-13-Z40', stock: 12 });
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('409 · el código ya pertenece a otro repuesto', async () => {
    repo.findByCodigo.mockResolvedValue(guardado(pastillas));

    const res = await request(app).post('/api/repuestos').send({ ...nuevo, codigo: 'KD1Y-33-28Z' });

    esperarError(res, 409, 'CONFLICTO');
    expect(repo.create).not.toHaveBeenCalled(); // no se guarda el duplicado
  });

  test('409 · el código es de un repuesto dado de baja', async () => {
    repo.findByCodigo.mockResolvedValue(guardado({ ...pastillas, activo: 0 }));

    const res = await request(app).post('/api/repuestos').send({ ...nuevo, codigo: 'KD1Y-33-28Z' });

    esperarError(res, 409, 'CONFLICTO');
    expect(res.body.mensaje).toMatch(/dado de baja/);
  });

  test('400 · datos inválidos no llegan al repositorio', async () => {
    const res = await request(app).post('/api/repuestos').send({ ...nuevo, precio: -5 });

    esperarError(res, 400, 'VALIDACION');
    expect(repo.findByCodigo).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/repuestos/:id · actualizar', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(guardado(filtroAceite));
    repo.update.mockImplementation(async (id, datos) => guardado({ id, ...datos }));
  });

  test('200 · cambia solo lo enviado y conserva el resto', async () => {
    const res = await request(app).put('/api/repuestos/1').send({ precio: 49.9, stock: 30 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ precio: 49.9, stock: 30, nombre: 'Filtro de aceite' });
  });

  test('200 · reenviar su mismo código no cuenta como duplicado', async () => {
    const res = await request(app).put('/api/repuestos/1').send({ codigo: 'pe01-14-302' });

    expect(res.status).toBe(200);
    expect(repo.findByCodigo).not.toHaveBeenCalled();
  });

  test('409 · el código nuevo ya es de otro repuesto', async () => {
    repo.findByCodigo.mockResolvedValue(guardado(pastillas));

    const res = await request(app).put('/api/repuestos/1').send({ codigo: 'KD1Y-33-28Z' });

    esperarError(res, 409, 'CONFLICTO');
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('404 · el repuesto no existe', async () => {
    repo.findById.mockResolvedValue(null);

    const res = await request(app).put('/api/repuestos/999').send({ stock: 1 });

    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/repuestos/:id · dar de baja', () => {
  // Regla de negocio del almacén: no se da de baja un repuesto que todavía tiene stock.
  test.each([
    ['stock 0 (límite válido)', 0, 204],
    ['stock 1 (justo afuera)', 1, 400],
    ['stock 8', 8, 400],
  ])('%s → %i', async (_nombre, stock, estadoEsperado) => {
    repo.findById.mockResolvedValue(guardado({ ...pastillas, stock }));
    repo.remove.mockResolvedValue(true);

    const res = await request(app).delete('/api/repuestos/2');

    expect(res.status).toBe(estadoEsperado);
    expect(repo.remove).toHaveBeenCalledTimes(estadoEsperado === 204 ? 1 : 0);
  });

  test('204 · responde sin cuerpo', async () => {
    repo.findById.mockResolvedValue(guardado({ ...pastillas, stock: 0 }));

    const res = await request(app).delete('/api/repuestos/2');

    expect(res.body).toEqual({});
  });

  test('400 · el mensaje explica por qué no se puede dar de baja', async () => {
    repo.findById.mockResolvedValue(guardado(pastillas));

    const res = await request(app).delete('/api/repuestos/2');

    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.mensaje).toMatch(/stock disponible \(8 unidades\)/);
  });

  test('404 · el repuesto no existe', async () => {
    repo.findById.mockResolvedValue(null);

    esperarError(await request(app).delete('/api/repuestos/999'), 404, 'NO_ENCONTRADO');
  });
});

describe('flujo completo de un repuesto', () => {
  // Repositorio en memoria: guarda las filas en un Map para encadenar las peticiones.
  beforeEach(() => {
    const filas = new Map();
    let siguienteId = 1;
    const activos = () => [...filas.values()].filter((f) => f.activo);

    repo.findByCodigo.mockImplementation(async (codigo) =>
      guardado([...filas.values()].find((f) => f.codigo === codigo)));
    repo.findById.mockImplementation(async (id) => guardado(activos().find((f) => f.id === id)));
    repo.create.mockImplementation(async (datos) => {
      const fila = { stock: 0, stock_minimo: 5, ...datos, id: siguienteId++, activo: 1 };
      filas.set(fila.id, fila);
      return guardado(fila);
    });
    repo.update.mockImplementation(async (id, datos) => {
      filas.set(id, { ...filas.get(id), ...datos });
      return guardado(filas.get(id));
    });
    repo.remove.mockImplementation(async (id) => {
      filas.get(id).activo = 0;
      return true;
    });
  });

  test('crear → consultar → vaciar stock → dar de baja → ya no existe', async () => {
    const creado = await request(app).post('/api/repuestos').send(nuevo);
    expect(creado.status).toBe(201);
    const { id } = creado.body;

    const consultado = await request(app).get(`/api/repuestos/${id}`);
    expect(consultado.body.nombre).toBe('Filtro de aire');

    // Con stock 12 todavía no se puede dar de baja
    expect((await request(app).delete(`/api/repuestos/${id}`)).status).toBe(400);

    const actualizado = await request(app).put(`/api/repuestos/${id}`).send({ stock: 0 });
    expect(actualizado.body.stock).toBe(0);

    expect((await request(app).delete(`/api/repuestos/${id}`)).status).toBe(204);

    esperarError(await request(app).get(`/api/repuestos/${id}`), 404, 'NO_ENCONTRADO');
  });

  test('el código de un repuesto dado de baja no se puede reutilizar', async () => {
    const creado = await request(app).post('/api/repuestos').send({ ...nuevo, stock: 0 });
    await request(app).delete(`/api/repuestos/${creado.body.id}`);

    const repetido = await request(app).post('/api/repuestos').send(nuevo);

    esperarError(repetido, 409, 'CONFLICTO');
  });
});
