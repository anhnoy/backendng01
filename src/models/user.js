const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('superadmin', 'lan', 'op', 'gn'),
    allowNull: false
  },
  lanId: {
    type: DataTypes.INTEGER,
    allowNull: true, // null สำหรับ superadmin/lan, มีค่าเมื่อเป็น op/gn
  }
}, {
  tableName: 'users'
});

module.exports = User;
