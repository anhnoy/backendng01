const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const activityRoutes = require('../src/routes/activity');
const sequelize = require('../src/sequelize');
const Activity = require('../src/models/activity');

const app = express();
app.use(bodyParser.json());
app.use('/api/activities', activityRoutes);

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('Activity API', () => {
  let id;
  it('should create an activity', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({
        name: 'ล่องเรือเจ้าพระยา',
        country: 'TH',
        description: 'กิจกรรมยอดฮิตในกรุงเทพ',
        isPopular: true
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.activity).toHaveProperty('name', 'ล่องเรือเจ้าพระยา');
    id = res.body.activity.id;
  });

  it('should get all activities', async () => {
    const res = await request(app).get('/api/activities');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('name', 'ล่องเรือเจ้าพระยา');
  });

  it('should filter activities by country', async () => {
    const res = await request(app).get('/api/activities?country=TH');
    expect(res.statusCode).toBe(200);
    expect(res.body[0]).toHaveProperty('country', 'TH');
  });

  it('should update activity', async () => {
    const res = await request(app)
      .put(`/api/activities/${id}`)
      .send({ name: 'ล่องเรือใหม่', isPopular: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.activity).toHaveProperty('name', 'ล่องเรือใหม่');
    expect(res.body.activity).toHaveProperty('isPopular', false);
  });

  it('should delete activity', async () => {
    const res = await request(app).delete(`/api/activities/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Activity deleted');
  });
});
