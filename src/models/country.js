const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Country = sequelize.define('Country', {
  code: {
    type: DataTypes.STRING(2),
    allowNull: false,
    primaryKey: true,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'countries',
  timestamps: false
});

module.exports = Country;
