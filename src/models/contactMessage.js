const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactMessage = sequelize.define('ContactMessage', {
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(32), allowNull: true },
  subject: { type: DataTypes.STRING(120), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  meta: {
    type: DataTypes.TEXT, // JSON text
    allowNull: true,
    get() {
      const raw = this.getDataValue('meta');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    set(val) {
      if (val == null) return this.setDataValue('meta', null);
      try { this.setDataValue('meta', JSON.stringify(val)); } catch { this.setDataValue('meta', null); }
    }
  }
}, { tableName: 'contact_messages' });

module.exports = ContactMessage;
