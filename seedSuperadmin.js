const { hashPassword } = require('./src/utils/hash');
const User = require('./src/models/user');
const sequelize = require('./src/sequelize');

async function seedSuperadmin() {
  await sequelize.authenticate();
  const password = 'superadmin123'; // เปลี่ยนรหัสผ่านตามต้องการ
  const hashed = await hashPassword(password);
  const [user, created] = await User.findOrCreate({
    where: { email: 'superadmin@email.com' },
    defaults: {
      name: 'Super Admin',
      email: 'superadmin@email.com',
      password: hashed,
      role: 'superadmin',
      status: 'active'
    }
  });
  if (created) {
    console.log('Superadmin created!');
  } else {
    console.log('Superadmin already exists!');
  }
  await sequelize.close();
}

seedSuperadmin().catch(e => {
  console.error(e);
  process.exit(1);
});
