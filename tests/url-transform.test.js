process.env.NODE_ENV = 'test';
process.env.PUBLIC_BASE_URL = 'https://api.example.com';

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('../src/sequelize');
const destinationRoutes = require('../src/routes/destination');
const activityRoutes = require('../src/routes/activity');

const app = express();
app.use(bodyParser.json());
app.use('/api/destinations', destinationRoutes);
app.use('/api/activities', activityRoutes);

describe('Absolute URL transformation', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });
  afterAll(async () => {
    await sequelize.close();
  });

  let destId;
  it('creates destination and returns absolute image URLs & coverImage', async () => {
    const res = await request(app)
      .post('/api/destinations')
      .send({
        name: 'Test Dest',
        countryCode: 'TH',
        description: 'Desc',
        images: [
          { url: '/uploads/a1.jpg', alt: 'A1', sortOrder: 0 },
          { url: '/uploads/a2.jpg', alt: 'A2', sortOrder: 1 }
        ]
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.destination.coverImage).toBe('https://api.example.com/uploads/a1.jpg');
    expect(res.body.destination.images[0].url).toBe('https://api.example.com/uploads/a1.jpg');
    destId = res.body.destination.id;
  });

  it('lists destinations with absolute URLs', async () => {
    const res = await request(app).get('/api/destinations');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].coverImage).toMatch(/^https:\/\/api\.example\.com\/uploads\//);
  });

  it('creates activity and returns imageAbsolute', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ name: 'Act1', country: 'TH', image: '/uploads/z1.jpg' });
    expect(res.statusCode).toBe(201);
    expect(res.body.activity.imageAbsolute).toBe('https://api.example.com/uploads/z1.jpg');
  });

  it('lists activities with imageAbsolute', async () => {
    const res = await request(app).get('/api/activities');
    expect(res.statusCode).toBe(200);
    expect(res.body[0].imageAbsolute).toMatch('https://api.example.com/uploads/');
  });
});
