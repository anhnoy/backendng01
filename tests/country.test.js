const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const countryRoutes = require('../src/routes/country');
const sequelize = require('../src/sequelize');
const Country = require('../src/models/country');

const app = express();
app.use(bodyParser.json());
app.use('/api/countries', countryRoutes);

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('Country API', () => {
  it('should create a country', async () => {
    const res = await request(app)
      .post('/api/countries')
      .send({ code: 'JP', name: 'Japan' });
    expect(res.statusCode).toBe(201);
    expect(res.body.country).toHaveProperty('code', 'JP');
  });

  it('should get all countries', async () => {
    const res = await request(app).get('/api/countries');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find(c => c.code === 'JP')).toBeTruthy();
  });

  it('should update a country', async () => {
    const res = await request(app)
      .put('/api/countries/JP')
      .send({ name: 'ประเทศญี่ปุ่น' });
    expect(res.statusCode).toBe(200);
    expect(res.body.country).toHaveProperty('name', 'ประเทศญี่ปุ่น');
  });

  it('should delete a country', async () => {
    const res = await request(app).delete('/api/countries/JP');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Country deleted');
  });
});
