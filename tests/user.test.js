const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
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

describe('User API', () => {
  it('should create a user', async () => {
    const email = `test${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/users')
      .send({ email, password: '123456', role: 'op' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', email);
  });
});
