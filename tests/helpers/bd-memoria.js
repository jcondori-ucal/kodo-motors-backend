// Base de datos en memoria para las pruebas de integración.
// Reemplaza SOLO a los repositorios (lo externo: MySQL). Rutas, validadores, servicios,
// modelos y manejador de errores son los reales. Los datos son los de database/02_seed.sql.

const SEDES_SEED = [
  { id: 1, nombre: 'Kodo Surquillo', distrito: 'Surquillo', direccion: 'Av. República de Panamá 4550', telefono: '014445566', hora_apertura: '08:00:00', hora_cierre: '18:00:00', atiende_domingo: false, activa: true },
  { id: 2, nombre: 'Kodo La Molina', distrito: 'La Molina', direccion: 'Av. La Molina 1120', telefono: '013487788', hora_apertura: '08:30:00', hora_cierre: '17:30:00', atiende_domingo: true, activa: true },
  { id: 3, nombre: 'Kodo San Miguel', distrito: 'San Miguel', direccion: 'Av. La Marina 2300', telefono: '015661122', hora_apertura: '09:00:00', hora_cierre: '18:00:00', atiende_domingo: false, activa: true },
];

const SERVICIOS_SEED = [
  { id: 1, nombre: 'Mantenimiento 10 000 km', categoria: 'mantenimiento', descripcion: 'Cambio de aceite, filtros y revisión de 30 puntos', precio: 380, duracion_min: 120, activo: true },
  { id: 2, nombre: 'Diagnóstico computarizado', categoria: 'diagnostico', descripcion: 'Escaneo de fallas con equipo Mazda', precio: 150, duracion_min: 60, activo: true },
  { id: 3, nombre: 'Cambio de pastillas de freno', categoria: 'frenos', descripcion: 'Pastillas delanteras originales', precio: 290, duracion_min: 90, activo: true },
  { id: 4, nombre: 'Alineamiento y balanceo', categoria: 'neumaticos', descripcion: 'Alineamiento 3D y balanceo de 4 ruedas', precio: 120, duracion_min: 60, activo: true },
  { id: 5, nombre: 'Revisión de batería', categoria: 'electrico', descripcion: 'Prueba de carga y bornes', precio: 60, duracion_min: 30, activo: true },
];

const estado = { sedes: [], servicios: [], citasPorSede: {}, citasPorServicio: {} };

// Vuelve al seed: se llama en beforeEach para que ninguna prueba herede datos de otra
function reiniciarDatos() {
  estado.sedes = SEDES_SEED.map((fila) => ({ ...fila }));
  estado.servicios = SERVICIOS_SEED.map((fila) => ({ ...fila }));
  estado.citasPorSede = {};
  estado.citasPorServicio = {};
}

// Simula que una sede o un servicio tiene citas pendientes o confirmadas desde hoy
function ponerCitasPendientes({ sedeId, servicioId, cantidad = 1 }) {
  if (sedeId) estado.citasPorSede[sedeId] = cantidad;
  if (servicioId) estado.citasPorServicio[servicioId] = cantidad;
}

// MySQL compara los textos sin distinguir mayúsculas (collation por defecto de la tabla)
const mismoTexto = (a, b) => a.toLowerCase() === b.toLowerCase();

// Fábrica de un repositorio con la misma interfaz que los de src/repositories
function crearRepositorio(tabla, bandera, filtroDeTexto) {
  const filas = () => estado[tabla];
  return {
    async listar(filtros = {}) {
      return filas()
        .filter((fila) => filtros.incluirInactivos || fila[bandera])
        .filter((fila) => filtros[filtroDeTexto] === undefined || fila[filtroDeTexto] === filtros[filtroDeTexto])
        .map((fila) => ({ ...fila }));
    },
    async buscarPorId(id) {
      const fila = filas().find((f) => f.id === id && f[bandera]);
      return fila ? { ...fila } : undefined;
    },
    async buscarPorNombre(nombre) {
      const fila = filas().find((f) => mismoTexto(f.nombre, nombre));
      return fila ? { id: fila.id, [bandera]: fila[bandera] } : undefined;
    },
    async crear(datos) {
      const id = Math.max(0, ...filas().map((f) => f.id)) + 1;
      const fila = { id, ...datos, [bandera]: true };
      if ('atiende_domingo' in fila) fila.atiende_domingo = Boolean(fila.atiende_domingo);
      filas().push(fila);
      return id;
    },
    async actualizar(id, datos) {
      const fila = filas().find((f) => f.id === id && f[bandera]);
      if (!fila) return;
      Object.assign(fila, datos);
      if ('atiende_domingo' in fila) fila.atiende_domingo = Boolean(fila.atiende_domingo);
    },
    // Borrado lógico, igual que en MySQL: la fila se conserva con la bandera apagada
    async eliminar(id) {
      const fila = filas().find((f) => f.id === id && f[bandera]);
      if (!fila) return false;
      fila[bandera] = false;
      return true;
    },
  };
}

const sedes = crearRepositorio('sedes', 'activa', 'distrito');
const servicios = crearRepositorio('servicios', 'activo', 'categoria');

// De reservas solo se necesita lo que consultan sedes y servicios antes de una baja
const reservas = {
  async contarCitasPendientesDeSede(id) { return estado.citasPorSede[id] || 0; },
  async contarCitasPendientesDeServicio(id) { return estado.citasPorServicio[id] || 0; },
};

reiniciarDatos();

module.exports = { sedes, servicios, reservas, reiniciarDatos, ponerCitasPendientes };
