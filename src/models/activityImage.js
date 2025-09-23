const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ActivityImage = sequelize.define('ActivityImage', {
  activityId: { type: DataTypes.INTEGER, allowNull: false },
  url: { type: DataTypes.STRING(2048), allowNull: false },
  alt: { type: DataTypes.STRING(255) },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'activity_images',
  indexes: [
    { fields: ['activityId'] },
    { fields: ['sortOrder'] }
  ]
});

module.exports = ActivityImage;
