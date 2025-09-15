
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const sequelize = require('./sequelize');
const User = require('./models/user');

// Allow CORS for frontend on port 8080
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://192.168.201.13:8080'
  ],
  credentials: true
}));

app.use(express.json());

// Routes


app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/countries', require('./routes/country'));


// Sync DB and start server
sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('DB sync error:', err);
});
