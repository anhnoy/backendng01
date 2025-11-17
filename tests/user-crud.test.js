const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('../src/sequelize');
const userRoutes = require('../src/routes/user');
const { authenticate, authorize } = require('../src/middlewares/auth');

const app = express();
app.use(bodyParser.json());
app.use('/api/users', userRoutes);

// Mock middleware for testing (bypass JWT)
jest.mock('../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, role: 'lan' };
    next();
  },
  authorize: (...roles) => (req, res, next) => next()
}));

describe('User CRUD API', () => {
  let userId;
  let email = `crud${Date.now()}@example.com`;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email, password: '123456', role: 'op' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', email);
    userId = res.body.id;
  });

  it('should get all users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get user by id', async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('email', email);
  });

  it('should update user', async () => {
    const newEmail = `updated${Date.now()}@example.com`;
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .send({ email: newEmail });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('email', newEmail);
    email = newEmail;
  });

  it('should delete user', async () => {
    const res = await request(app).delete(`/api/users/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'User deleted');
  });
});
