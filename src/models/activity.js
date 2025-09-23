const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Activity = sequelize.define('Activity', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true // ไม่บังคับส่ง
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  attraction: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isPopular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'activities'
});

module.exports = Activity;
