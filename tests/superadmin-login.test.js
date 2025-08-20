const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('Superadmin Login API', () => {
  it('should login superadmin with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@example.com', password: '99747127aA@' });// <-- เปลี่ยนเป็นรหัสผ่านจริง
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'superadmin');
  });
});
