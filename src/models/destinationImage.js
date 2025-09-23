const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const DestinationImage = sequelize.define('DestinationImage', {
  destinationId: { type: DataTypes.INTEGER, allowNull: false },
  url: { type: DataTypes.STRING(2048), allowNull: false },
  alt: { type: DataTypes.STRING(255) },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'destination_images',
  indexes: [
    { fields: ['destinationId'] },
    { fields: ['sortOrder'] }
  ]
});

module.exports = DestinationImage;
