const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    profileImage: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    languages: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
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
