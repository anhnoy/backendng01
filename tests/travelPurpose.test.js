const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const travelPurposeRoutes = require('../src/routes/travelPurpose');
const sequelize = require('../src/sequelize');
const TravelPurpose = require('../src/models/travelPurpose');

const app = express();
app.use(bodyParser.json());
app.use('/api/travel-purposes', travelPurposeRoutes);

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('TravelPurpose API', () => {
  let id;
  it('should create a travel purpose', async () => {
    const res = await request(app)
      .post('/api/travel-purposes')
      .send({ name: 'ท่องเที่ยว', description: 'เดินทางเพื่อพักผ่อน' });
    expect(res.statusCode).toBe(201);
    expect(res.body.purpose).toHaveProperty('name', 'ท่องเที่ยว');
    id = res.body.purpose.id;
  });

  it('should not allow duplicate name', async () => {
    const res = await request(app)
      .post('/api/travel-purposes')
      .send({ name: 'ท่องเที่ยว', description: 'ซ้ำ' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/ซ้ำ/);
  });

  it('should get all travel purposes', async () => {
    const res = await request(app).get('/api/travel-purposes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('name', 'ท่องเที่ยว');
  });

  it('should update travel purpose', async () => {
    const res = await request(app)
      .put(`/api/travel-purposes/${id}`)
      .send({ name: 'ธุรกิจ', description: 'เดินทางเพื่อทำงาน' });
    expect(res.statusCode).toBe(200);
    expect(res.body.purpose).toHaveProperty('name', 'ธุรกิจ');
  });

  it('should delete travel purpose', async () => {
    const res = await request(app).delete(`/api/travel-purposes/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'TravelPurpose deleted');
  });
});
