const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactSetting = sequelize.define('ContactSetting', {
  key: { type: DataTypes.STRING(100), allowNull: false, primaryKey: true },
  value: { type: DataTypes.STRING(300), allowNull: true }
}, { tableName: 'contact_settings', timestamps: false });

module.exports = ContactSetting;
