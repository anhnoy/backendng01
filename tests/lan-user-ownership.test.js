const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('../src/routes/user');

const app = express();
app.use(bodyParser.json());
app.use('/api/users', userRoutes);

// Mock middleware for testing (simulate lan login)
jest.mock('../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 999, role: 'lan' }; // สมมุติ lan id 999
    next();
  },
  authorize: (...roles) => (req, res, next) => next()
}));

describe('User Ownership by lan', () => {
  let opId;
  let gnId;
  let opEmail = `op${Date.now()}@example.com`;
  let gnEmail = `gn${Date.now()}@example.com`;

  it('lan should create op and gn with lanId', async () => {
    let res = await request(app)
      .post('/api/users')
      .send({ email: opEmail, password: '123456', role: 'op' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('lanId', 999);
    opId = res.body.id;

    res = await request(app)
      .post('/api/users')
      .send({ email: gnEmail, password: '123456', role: 'gn' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('lanId', 999);
    gnId = res.body.id;
  });

  it('lan should get only op/gn of itself', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(res.body.find(u => u.id === opId)).toBeTruthy();
    expect(res.body.find(u => u.id === gnId)).toBeTruthy();
    // ไม่ควรเห็น user ที่ lanId ไม่ตรง
    expect(res.body.every(u => u.lanId === 999)).toBe(true);
  });
});
