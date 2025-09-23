const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Destination = sequelize.define('Destination', {
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  article: { type: DataTypes.TEXT('long') },
  countryCode: { type: DataTypes.STRING(3), allowNull: false },
  countryName: { type: DataTypes.STRING(100) },
  highlights: { type: DataTypes.JSON, defaultValue: [] },
}, {
  tableName: 'destinations',
  paranoid: true,
  // Ensure only one active destination exists per (name, countryCode)
  // Note: Because MySQL allows multiple NULLs, this composite unique index
  // permits duplicates only when records are soft-deleted (deletedAt IS NOT NULL)
  indexes: [
    { unique: true, fields: ['name', 'countryCode', 'deletedAt'] }
  ]
});

module.exports = Destination;
