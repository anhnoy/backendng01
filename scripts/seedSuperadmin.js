const sequelize = require('../src/sequelize');
const User = require('../src/models/user');
const bcrypt = require('bcrypt');

async function seedSuperadmin() {
  await sequelize.sync();
  const email = 'superadmin@example.com';
  const password = '99747127aA@';
  const hash = await bcrypt.hash(password, 10);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      password: hash,
      role: 'superadmin',
      lanId: null
    }
  });
  if (created) {
    console.log('Superadmin created:', email);
  } else {
    console.log('Superadmin already exists:', email);
  }
  await sequelize.close();
}

seedSuperadmin();
