jest.mock('../../../src/repositories/reserva.repository', () => ({
  obtenerPorId: jest.fn(), crear: jest.fn(), actualizar: jest.fn(), eliminar: jest.fn(),
  existeChoque: jest.fn(), existeChoqueVehiculo: jest.fn(),
}));
jest.mock('../../../src/repositories/lookups.repository', () => ({
  existeSede: jest.fn(), existeServicio: jest.fn(), existeVehiculo: jest.fn(),
}));
jest.mock('../../../src/repositories/sedes.repository', () => ({ buscarPorId: jest.fn() }));
jest.mock('../../../src/repositories/servicios.repository', () => ({ buscarPorId: jest.fn() }));

const repo = require('../../../src/repositories/reserva.repository');
const lookups = require('../../../src/repositories/lookups.repository');
const repoSedes = require('../../../src/repositories/sedes.repository');
const repoServicios = require('../../../src/repositories/servicios.repository');
const service = require('../../../src/services/reserva.service');
const {
  FECHAS, congelarReloj, cuerpoValido, sedeSurquillo, servicioDe60Min, reservaGuardada, esperarError,
} = require('../../helpers/reservas');

// Cada prueba parte de un caso exitoso y cambia solo lo que quiere probar
beforeEach(() => {
  jest.resetAllMocks();
  congelarReloj();
  lookups.existeSede.mockResolvedValue(true);
  lookups.existeServicio.mockResolvedValue(true);
  lookups.existeVehiculo.mockResolvedValue(true);
  repoSedes.buscarPorId.mockResolvedValue(sedeSurquillo());
  repoServicios.buscarPorId.mockResolvedValue(servicioDe60Min());
  repo.existeChoque.mockResolvedValue(false);
  repo.existeChoqueVehiculo.mockResolvedValue(false);
  repo.crear.mockImplementation(async (datos) => ({ id: 100, ...datos }));
});

afterEach(() => jest.useRealTimers());

describe('crear', () => {
  test('reserva válida → se guarda', async () => {
    const reserva = await service.crear(cuerpoValido());

    expect(repo.crear).toHaveBeenCalledTimes(1);
    expect(reserva).toMatchObject({ id: 100, fecha: FECHAS.manana });
  });

  test('datos inválidos → 400 y no se guarda', async () => {
    await esperarError(service.crear({}), 400);

    expect(repo.crear).not.toHaveBeenCalled();
  });

  test('sede inexistente → 404', async () => {
    lookups.existeSede.mockResolvedValue(false);

    await esperarError(service.crear(cuerpoValido()), 404);
  });

  test('fecha pasada → 400', async () => {
    await esperarError(service.crear(cuerpoValido({ fecha: FECHAS.ayer })), 400);
  });

  test('domingo en una sede que no atiende ese día → 400', async () => {
    await esperarError(service.crear(cuerpoValido({ fecha: FECHAS.domingo })), 400);
  });

  test.each([
    ['08:00, justo a la apertura', '08:00', true],
    ['17:00, el servicio termina justo al cierre (18:00)', '17:00', true],
    ['17:01, el servicio termina después del cierre', '17:01', false],
  ])('horario de la sede (08:00–18:00, servicio de 60 min): %s', async (_nombre, hora, valida) => {
    const resultado = service.crear(cuerpoValido({ hora }));

    if (valida) await expect(resultado).resolves.toBeDefined();
    else await esperarError(resultado, 400);
  });

  test('otra reserva en la misma sede, fecha y hora → 409', async () => {
    repo.existeChoque.mockResolvedValue(true);

    await esperarError(service.crear(cuerpoValido()), 409);
  });
});

describe('actualizar', () => {
  test('reserva inexistente → 404', async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await esperarError(service.actualizar(99, { observacion: 'x' }), 404);
  });

  test('cambio de estado no permitido (pendiente → atendida) → 409', async () => {
    repo.obtenerPorId.mockResolvedValue(reservaGuardada({ estado: 'pendiente' }));

    await esperarError(service.actualizar(8, { estado: 'atendida' }), 409);
  });

  test('una reserva cancelada ya no se puede editar → 409', async () => {
    repo.obtenerPorId.mockResolvedValue(reservaGuardada({ estado: 'cancelada' }));

    await esperarError(service.actualizar(8, { observacion: 'nota' }), 409);
  });
});

describe('eliminar', () => {
  test('reserva existente → se da de baja', async () => {
    repo.eliminar.mockResolvedValue(true);

    await service.eliminar(8);

    expect(repo.eliminar).toHaveBeenCalledWith(8);
  });

  test('reserva inexistente → 404', async () => {
    repo.eliminar.mockResolvedValue(false);

    await esperarError(service.eliminar(8), 404);
  });
});
