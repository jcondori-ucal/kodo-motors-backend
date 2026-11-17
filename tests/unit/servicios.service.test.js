// Unitarias del servicio de servicios: la lógica de negocio aislada de MySQL con jest.mock (Semana 11, Slide 34)
jest.mock('../../src/repositories/servicios.repository');
jest.mock('../../src/repositories/reserva.repository');

const repo = require('../../src/repositories/servicios.repository');
const repoReservas = require('../../src/repositories/reserva.repository');
const servicio = require('../../src/services/servicios.service');
const {
  NotFoundError, ConflictError, BadRequestError, ValidationError,
} = require('../../src/middlewares/errors/AppError');

const mantenimiento = {
  id: 1, nombre: 'Mantenimiento 10 000 km', categoria: 'mantenimiento',
  descripcion: 'Cambio de aceite, filtros y revisión de 30 puntos', precio: 380, duracion_min: 120, activo: true,
};

const servicioNuevo = { nombre: 'Cambio de aceite', categoria: 'mantenimiento', precio: 180, duracion_min: 45 };

beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.useRealTimers());

describe('buscarServicioPorId', () => {
  test('devuelve el servicio cuando existe', async () => {
    repo.buscarPorId.mockResolvedValue(mantenimiento);

    await expect(servicio.buscarServicioPorId(1)).resolves.toMatchObject({ id: 1, precio: 380 });
  });

  test('servicio inexistente o dado de baja → NotFoundError', async () => {
    repo.buscarPorId.mockResolvedValue(undefined);

    await expect(servicio.buscarServicioPorId(99)).rejects.toThrow(NotFoundError);
  });
});

describe('crearServicio', () => {
  test('guarda el precio redondeado y la descripción ausente como null', async () => {
    repo.buscarPorNombre.mockResolvedValue(undefined);
    repo.crear.mockResolvedValue(6);
    repo.buscarPorId.mockResolvedValue({ id: 6, ...servicioNuevo });

    const creado = await servicio.crearServicio({ ...servicioNuevo, precio: 180.456 });

    expect(repo.crear).toHaveBeenCalledWith({ ...servicioNuevo, precio: 180.46, descripcion: null });
    expect(creado.id).toBe(6);
  });

  test('nombre repetido → ConflictError y NO guarda', async () => {
    repo.buscarPorNombre.mockResolvedValue({ id: 1, activo: true });

    await expect(servicio.crearServicio(servicioNuevo)).rejects.toThrow(ConflictError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  test('nombre de un servicio dado de baja → ConflictError que lo aclara', async () => {
    repo.buscarPorNombre.mockResolvedValue({ id: 9, activo: false });

    await expect(servicio.crearServicio(servicioNuevo)).rejects.toThrow(/dado de baja \(id 9\)/);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  test('precio 0 → ValidationError antes de consultar la base', async () => {
    await expect(servicio.crearServicio({ ...servicioNuevo, precio: 0 })).rejects.toThrow(ValidationError);
    expect(repo.buscarPorNombre).not.toHaveBeenCalled();
  });
});

describe('actualizarServicio', () => {
  test('cambia solo el precio y conserva lo demás', async () => {
    repo.buscarPorId.mockResolvedValue(mantenimiento);
    repo.buscarPorNombre.mockResolvedValue({ id: 1, activo: true }); // es él mismo: no hay conflicto

    await servicio.actualizarServicio(1, { precio: 399.9 });

    expect(repo.actualizar).toHaveBeenCalledWith(1, {
      nombre: 'Mantenimiento 10 000 km', categoria: 'mantenimiento',
      descripcion: 'Cambio de aceite, filtros y revisión de 30 puntos', precio: 399.9, duracion_min: 120,
    });
  });

  test('renombrarlo como otro servicio → ConflictError y NO actualiza', async () => {
    repo.buscarPorId.mockResolvedValue(mantenimiento);
    repo.buscarPorNombre.mockResolvedValue({ id: 2, activo: true });

    await expect(servicio.actualizarServicio(1, { nombre: 'Diagnóstico computarizado' }))
      .rejects.toThrow(ConflictError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  test('sin campos → BadRequestError', async () => {
    await expect(servicio.actualizarServicio(1, {})).rejects.toThrow(BadRequestError);
  });

  test('servicio inexistente → NotFoundError', async () => {
    repo.buscarPorId.mockResolvedValue(undefined);

    await expect(servicio.actualizarServicio(99, { precio: 100 })).rejects.toThrow(NotFoundError);
  });
});

describe('eliminarServicio (borrado lógico)', () => {
  test('sin citas pendientes: da de baja', async () => {
    repoReservas.contarCitasPendientesDeServicio.mockResolvedValue(0);
    repo.eliminar.mockResolvedValue(true);

    await expect(servicio.eliminarServicio(5)).resolves.toBeUndefined();
    expect(repo.eliminar).toHaveBeenCalledWith(5);
  });

  test('con citas pendientes → ConflictError y NO da de baja', async () => {
    repoReservas.contarCitasPendientesDeServicio.mockResolvedValue(2);

    await expect(servicio.eliminarServicio(1)).rejects.toThrow(ConflictError);
    expect(repo.eliminar).not.toHaveBeenCalled();
  });

  test('servicio inexistente o ya dado de baja → NotFoundError', async () => {
    repoReservas.contarCitasPendientesDeServicio.mockResolvedValue(0);
    repo.eliminar.mockResolvedValue(false);

    await expect(servicio.eliminarServicio(99)).rejects.toThrow(NotFoundError);
  });

  test('cuenta las citas desde HOY (reloj congelado en 2026-12-31)', async () => {
    jest.useFakeTimers({ now: new Date('2026-12-31T23:30:00') });
    repoReservas.contarCitasPendientesDeServicio.mockResolvedValue(0);
    repo.eliminar.mockResolvedValue(true);

    await servicio.eliminarServicio(1);

    expect(repoReservas.contarCitasPendientesDeServicio).toHaveBeenCalledWith(1, '2026-12-31');
  });
});

describe('listarServicios', () => {
  test('filtra por una categoría válida', async () => {
    repo.listar.mockResolvedValue([]);

    await servicio.listarServicios({ categoria: 'frenos' });

    expect(repo.listar).toHaveBeenCalledWith({ categoria: 'frenos' });
  });

  test('categoría inexistente → BadRequestError y no consulta', async () => {
    await expect(servicio.listarServicios({ categoria: 'lavado' })).rejects.toThrow(BadRequestError);
    expect(repo.listar).not.toHaveBeenCalled();
  });
});
