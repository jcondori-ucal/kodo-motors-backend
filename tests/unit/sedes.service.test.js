// Unitarias del servicio de sedes: la lógica de negocio aislada de MySQL con jest.mock (Semana 11, Slide 34)
// Se simula lo externo (los repositorios); el servicio y el modelo son los reales.
jest.mock('../../src/repositories/sedes.repository');
jest.mock('../../src/repositories/reserva.repository');

const repo = require('../../src/repositories/sedes.repository');
const repoReservas = require('../../src/repositories/reserva.repository');
const servicio = require('../../src/services/sedes.service');
const {
  NotFoundError, ConflictError, BadRequestError, ValidationError,
} = require('../../src/middlewares/errors/AppError');

const surquillo = {
  id: 1, nombre: 'Kodo Surquillo', distrito: 'Surquillo', direccion: 'Av. República de Panamá 4550',
  telefono: '014445566', hora_apertura: '08:00:00', hora_cierre: '18:00:00', atiende_domingo: false, activa: true,
};

const sedeNueva = {
  nombre: 'Kodo San Isidro', distrito: 'San Isidro', direccion: 'Av. Javier Prado Este 1234',
  telefono: '014447788', hora_apertura: '08:00', hora_cierre: '18:00',
};

beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.useRealTimers());

describe('buscarSedePorId', () => {
  test('devuelve la sede cuando existe', async () => {
    repo.buscarPorId.mockResolvedValue(surquillo);

    await expect(servicio.buscarSedePorId(1)).resolves.toMatchObject({ id: 1, nombre: 'Kodo Surquillo' });
  });

  test('sede inexistente o dada de baja → NotFoundError', async () => {
    repo.buscarPorId.mockResolvedValue(undefined);

    await expect(servicio.buscarSedePorId(99)).rejects.toThrow(NotFoundError);
  });
});

describe('crearSede', () => {
  test('guarda los datos ya limpios y devuelve la sede creada', async () => {
    repo.buscarPorNombre.mockResolvedValue(undefined);
    repo.crear.mockResolvedValue(4);
    repo.buscarPorId.mockResolvedValue({ id: 4, ...sedeNueva });

    const creada = await servicio.crearSede(sedeNueva);

    expect(repo.crear).toHaveBeenCalledWith({
      ...sedeNueva, hora_apertura: '08:00:00', hora_cierre: '18:00:00', atiende_domingo: 0,
    });
    expect(creada.id).toBe(4);
  });

  test('nombre repetido → ConflictError y NO guarda', async () => {
    repo.buscarPorNombre.mockResolvedValue({ id: 1, activa: true });

    await expect(servicio.crearSede({ ...sedeNueva, nombre: 'Kodo Surquillo' })).rejects.toThrow(ConflictError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  test('nombre de una sede dada de baja → ConflictError que lo aclara', async () => {
    repo.buscarPorNombre.mockResolvedValue({ id: 7, activa: false });

    await expect(servicio.crearSede(sedeNueva)).rejects.toThrow(/dada de baja \(id 7\)/);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  test('datos inválidos → ValidationError antes de consultar la base', async () => {
    await expect(servicio.crearSede({ ...sedeNueva, hora_cierre: '07:00' })).rejects.toThrow(ValidationError);
    expect(repo.buscarPorNombre).not.toHaveBeenCalled();
  });
});

describe('actualizarSede', () => {
  test('combina el cambio con los datos guardados', async () => {
    repo.buscarPorId.mockResolvedValue(surquillo);
    repo.buscarPorNombre.mockResolvedValue({ id: 1, activa: true }); // es ella misma: no hay conflicto

    await servicio.actualizarSede(1, { telefono: '987654321' });

    expect(repo.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
      nombre: 'Kodo Surquillo', telefono: '987654321', hora_cierre: '18:00:00',
    }));
  });

  test('un cierre anterior a la apertura YA GUARDADA → ValidationError y NO actualiza', async () => {
    repo.buscarPorId.mockResolvedValue(surquillo); // abre 08:00

    await expect(servicio.actualizarSede(1, { hora_cierre: '07:30' })).rejects.toThrow(ValidationError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  test('renombrarla como otra sede → ConflictError y NO actualiza', async () => {
    repo.buscarPorId.mockResolvedValue(surquillo);
    repo.buscarPorNombre.mockResolvedValue({ id: 2, activa: true });

    await expect(servicio.actualizarSede(1, { nombre: 'Kodo La Molina' })).rejects.toThrow(ConflictError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  test('sin campos → BadRequestError', async () => {
    await expect(servicio.actualizarSede(1, {})).rejects.toThrow(BadRequestError);
  });

  test('sede inexistente → NotFoundError', async () => {
    repo.buscarPorId.mockResolvedValue(undefined);

    await expect(servicio.actualizarSede(99, { telefono: '987654321' })).rejects.toThrow(NotFoundError);
  });
});

describe('eliminarSede (borrado lógico)', () => {
  test('sin citas pendientes: da de baja', async () => {
    repoReservas.contarCitasPendientesDeSede.mockResolvedValue(0);
    repo.eliminar.mockResolvedValue(true);

    await expect(servicio.eliminarSede(2)).resolves.toBeUndefined();
    expect(repo.eliminar).toHaveBeenCalledWith(2);
  });

  test('con citas pendientes → ConflictError y NO da de baja', async () => {
    repoReservas.contarCitasPendientesDeSede.mockResolvedValue(3);

    await expect(servicio.eliminarSede(1)).rejects.toThrow(ConflictError);
    await expect(servicio.eliminarSede(1)).rejects.toThrow(/\(3\)/);
    expect(repo.eliminar).not.toHaveBeenCalled();
  });

  test('sede inexistente o ya dada de baja → NotFoundError', async () => {
    repoReservas.contarCitasPendientesDeSede.mockResolvedValue(0);
    repo.eliminar.mockResolvedValue(false);

    await expect(servicio.eliminarSede(99)).rejects.toThrow(NotFoundError);
  });

  test('cuenta las citas desde HOY (reloj congelado en 2026-11-20)', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-20T12:00:00') });
    repoReservas.contarCitasPendientesDeSede.mockResolvedValue(0);
    repo.eliminar.mockResolvedValue(true);

    await servicio.eliminarSede(1);

    expect(repoReservas.contarCitasPendientesDeSede).toHaveBeenCalledWith(1, '2026-11-20');
  });
});

describe('listarSedes', () => {
  test('pasa al repositorio los filtros ya validados', async () => {
    repo.listar.mockResolvedValue([surquillo]);

    await servicio.listarSedes({ distrito: ' Surquillo ', incluir_inactivos: 'true' });

    expect(repo.listar).toHaveBeenCalledWith({ distrito: 'Surquillo', incluirInactivos: true });
  });

  test('un filtro inválido → BadRequestError y no consulta', async () => {
    await expect(servicio.listarSedes({ distrito: '' })).rejects.toThrow(BadRequestError);
    expect(repo.listar).not.toHaveBeenCalled();
  });
});
