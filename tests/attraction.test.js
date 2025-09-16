const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const attractionRoutes = require('../src/routes/attraction');
const sequelize = require('../src/sequelize');
const Attraction = require('../src/models/attraction');

const app = express();
app.use(bodyParser.json());
app.use('/api/attractions', attractionRoutes);

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('Attraction API', () => {
  let id;
  it('should create an attraction', async () => {
    const res = await request(app)
      .post('/api/attractions')
      .send({
        name: 'วัดพระแก้ว',
        country: 'TH',
        images: ['https://example.com/img1.jpg'],
        vehicles: ['car', 'bus']
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.attraction).toHaveProperty('name', 'วัดพระแก้ว');
    id = res.body.attraction.id;
  });

  it('should not allow duplicate name in same country', async () => {
    const res = await request(app)
      .post('/api/attractions')
      .send({
        name: 'วัดพระแก้ว',
        country: 'TH',
        images: ['https://example.com/img2.jpg'],
        vehicles: ['car']
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/ชื่อซ้ำ/);
  });

  it('should get all attractions', async () => {
    const res = await request(app).get('/api/attractions');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('name', 'วัดพระแก้ว');
  });

  it('should get attraction by id', async () => {
    const res = await request(app).get(`/api/attractions/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'วัดพระแก้ว');
  });

  it('should update attraction', async () => {
    const res = await request(app)
      .put(`/api/attractions/${id}`)
      .send({ name: 'วัดใหม่', images: ['https://example.com/img1.jpg'] });
    expect(res.statusCode).toBe(200);
    expect(res.body.attraction).toHaveProperty('name', 'วัดใหม่');
  });

  it('should add image', async () => {
    const res = await request(app)
      .post(`/api/attractions/${id}/images`)
      .send({ image: 'https://example.com/img2.jpg' });
    expect(res.statusCode).toBe(200);
    expect(res.body.images.length).toBe(2);
  });

  it('should delete image', async () => {
    // ลบรูปที่ index 0
    const res = await request(app).delete(`/api/attractions/${id}/images/0`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.images)).toBe(true);
  });

  it('should delete attraction', async () => {
    const res = await request(app).delete(`/api/attractions/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Attraction deleted');
  });
});
