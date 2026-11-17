const request = require('supertest');
const app = require('../src/app');
const catalogoRepo = require('../src/repositories/catalogo.repository');
const catalogoServi = require('../src/services/catalogo.service');
const { AppError } = require('../src/errors/AppError');

jest.mock('../src/repositories/catalogo.repository'); // reemplaza TODAS sus funciones por jest.fn()

const catalogoMock = [
    {
        "id": 1,
        "modelo": "Mazda2",
        "version": "1.5 Core MT",
        "anio": 2026,
        "precio_usd": 17990.00,
        "stock": 6,
        "combustible": "gasolina",
        "transmision": "mecanica",
        "destacado": 0
    }
]

const catalogoMockPost = [
    {
        "modelo": "Mazda2",
        "version": "1.5 Core MT",
        "anio": 2026,
        "precio_usd": 17990.00,
        "stock": 6,
        "combustible": "gasolina",
        "transmision": "mecanica",
        "destacado": true
    }
]




beforeEach(() => jest.resetAllMocks()); // cada prueba empieza con los mocks limpios

describe('obtenerTodos', () => {
    test('Debe de devolver todo el catalogo', async () => {
        catalogoRepo.findAll.mockReturnValue([
            {
                "id": 1,
                "modelo": "Mazda2",
                "version": "1.5 Core MT",
                "anio": 2026,
                "precio_usd": 17990.00,
                "stock": 6,
                "combustible": "gasolina",
                "transmision": "mecanica",
                "destacado": 0
            }
        ]);
        const resultado = await catalogoServi.listar();
        expect(resultado.length).toBeGreaterThan(0);
    });
});

describe('obtenerPorId', () => {
    test('Debe devolver el catalogo cuando el id existe', async () => {
        catalogoRepo.findById.mockReturnValue({
            id: 1,
            modelo: 'Mazda2'
        });
        const resultado = await catalogoServi.obtenerPorId(1);
        expect(resultado).toEqual({
            id: 1,
            modelo: 'Mazda2'
        });
    });
    test('Debe lanzar HttpError 404 cuando el id no existe', async () => {
        catalogoRepo.findById.mockReturnValue(null);
        await expect(
            catalogoServi.obtenerPorId(999)
        ).rejects.toThrow();
    });
});

describe('Debe rechazar un modelo vacio', () => {
    test('El modelo no puede estar vacio', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                modelo: ''
            })
        expect(response.status).toBe(400);
    })
    test('El modelo debe rechazar un modelo inexistente', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                modelo: 'Toyota'
            })
        expect(response.status).toBe(400);
    })
    test('El modelo debe aceptar un modelo existente', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                modelo: 'Mazda2'
            })
        expect(response.status).toBe(201);
    })
});

describe('Validar version', () => {
    test('la version no puede estar vacia', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                version: ''
            })
        expect(response.status).toBe(400);
    })
    test('Debe de rechazar una version mayor a 60 caracteres', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                version: 'a'.repeat(61)
            })
        expect(response.status).toBe(400);
    })
});

describe('Validar anio', () => {
    test('Debe de rechazar un año menor a 1900', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                anio: 1989
            })
        expect(response.status).toBe(400);
    })
    test('Debe de aceptar un año de 2026 como maximo ', async() => {
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMockPost[0],
                anio: 2026
            })
        expect(response.status).toBe(201);
    })
});

describe('validar stock', () => {
    test('El stock debe de ser un numero positivo', async () =>{

        const response = await request(app)
            .post('/api/catalogo')
            .send(catalogoMockPost[0]);

        expect(response.status).toBe(201);
    })
    test('El stock no debe de ser un numero negativo', async () =>{
        const response = await request(app)
            .post('/api/catalogo')
            .send({
                ...catalogoMock,
                stock: -1
            });
        expect(response.status).toBe(400);
    })
});

describe('Modificar el catalogo', () => {
    test('Modificar el catalogo', async() => {
        
        catalogoRepo.update.mockReturnValue([
            {
                ...catalogoMockPost[0],
                stock: 5
            }
        ]);
        const resultado = await catalogoServi.actualizar(
            1,
            {
                ...catalogoMockPost[0],
                stock: 5
            }
        );
        expect(resultado[0].stock).toBe(5)
        
    })
});


describe('Eliminar el catalogo', () => {
    test('Modificar el catalogo con id 1', async() => {
        
        catalogoRepo.remove.mockReturnValue(true);
        const resultado = await catalogoServi.eliminar(1);
        
        expect(catalogoRepo.remove).toHaveBeenCalledWith(1);
    })
})


test('Debe lanzar 409 cuando el vehiculo ya existe', async () => {
    catalogoRepo.findByModeloVersionAnio.mockResolvedValue({
        id: 1
    });
    await expect(catalogoServi.crear(catalogoMockPost[0]))
    .rejects.toThrow();
})