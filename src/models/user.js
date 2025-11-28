const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const User = sequelize.define('User', {
        experience: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0
        },
        workArea: {
          type: DataTypes.STRING(255), // comma-separated
          allowNull: true
        },
        rating: {
          type: DataTypes.FLOAT,
          allowNull: true
        },
        availability: {
          type: DataTypes.ENUM('available', 'busy', 'offline', 'Available', 'Unavailable', 'Offline'),
          allowNull: true,
          defaultValue: 'offline'
        },
        completedTrips: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0
        },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'Available', 'Unavailable', 'Offline'),
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
      type: DataTypes.STRING(255), // comma-separated
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
  type: DataTypes.ENUM('superadmin', 'admin', 'staff', 'guide'),
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
