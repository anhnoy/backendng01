const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Tour = sequelize.define('Tour', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(240), allowNull: true, unique: true },
  status: { type: DataTypes.ENUM('draft','published'), allowNull: false, defaultValue: 'draft' },

  country: { type: DataTypes.STRING(60), allowNull: true }, // e.g., 'lao'
  countryCode: { type: DataTypes.STRING(3), allowNull: false }, // ISO-2
  attractions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  purpose: { type: DataTypes.STRING(120), allowNull: true },

  dateStart: { type: DataTypes.DATEONLY, allowNull: false },
  dateEnd: { type: DataTypes.DATEONLY, allowNull: false },

  // Accommodation
  accommodationName: { type: DataTypes.STRING(120), allowNull: true },
  roomType: { type: DataTypes.STRING(80), allowNull: true },
  childRoomType: { type: DataTypes.STRING(80), allowNull: true },

  // Program
  dayPlans: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },

  // Lists
  includedItems: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  excludedItems: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },

  // Pricing helpers
  packagePrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  discountPercent: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0 },
  additionalCost: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Duration - computed from dateStart/dateEnd
  days: { 
    type: DataTypes.VIRTUAL,
    get() {
      const start = this.dateStart;
      const end = this.dateEnd;
      if (!start || !end) return 0;
      const diffTime = new Date(end) - new Date(start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays + 1);
    }
  },
  nights: { 
    type: DataTypes.VIRTUAL,
    get() {
      const start = this.dateStart;
      const end = this.dateEnd;
      if (!start || !end) return 0;
      const diffTime = new Date(end) - new Date(start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
  },

  gallery: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true },
  maxGuests: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 10 },
}, {
  tableName: 'tours',
  paranoid: true,
  indexes: [
    { fields: ['countryCode'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
    { unique: true, fields: ['slug'] },
  ]
});

module.exports = Tour;
