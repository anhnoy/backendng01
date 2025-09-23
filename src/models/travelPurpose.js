const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const TravelPurpose = sequelize.define('TravelPurpose', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'travel_purposes'
});

module.exports = TravelPurpose;
