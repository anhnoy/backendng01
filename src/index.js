const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const sequelize = require('./sequelize');
const User = require('./models/user');

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));


// Sync DB and start server
sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('DB sync error:', err);
});
