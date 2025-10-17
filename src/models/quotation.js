const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Quotation = sequelize.define('Quotation', {
  quotationNumber: { type: DataTypes.STRING(32), allowNull: true, unique: true },
  status: { type: DataTypes.ENUM('waiting','writing','quotation','check'), allowNull: false, defaultValue: 'quotation' },

  // Basic
  countryCode: { type: DataTypes.STRING(3), allowNull: false },
  attractions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  purpose: { type: DataTypes.STRING(100), allowNull: true },
  dateStart: { type: DataTypes.DATEONLY, allowNull: false },
  dateEnd: { type: DataTypes.DATEONLY, allowNull: false },

  // Customer
  customerName: { type: DataTypes.STRING(120), allowNull: false },
  customerEmail: { type: DataTypes.STRING(160), allowNull: false },
  customerPhone: { type: DataTypes.STRING(40), allowNull: false },
  customerCallTime: { type: DataTypes.STRING(40), allowNull: true },

  // Travelers & Prices
  adults: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  children: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  infants: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  pricePerAdult: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  pricePerChild: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  pricePerInfant: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Accommodation
  accommodation: { type: DataTypes.STRING(120), allowNull: true },
  roomType: { type: DataTypes.STRING(80), allowNull: true },
  childRoomType: { type: DataTypes.STRING(80), allowNull: true },
  adultRooms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  childRooms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  adultRoomPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  childRoomPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Flight
  flightIncluded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  flightAdultPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  flightChildPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  flightInfantType: { type: DataTypes.ENUM('seat','lap',''), allowNull: false, defaultValue: '' },
  flightInfantSeatPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  flightInfantLapPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Food
  mealOptions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  breakfastTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  lunchTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  dinnerTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  totalFoodPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Activities (optional payload from FE)
  activities: { type: DataTypes.JSON, allowNull: true, defaultValue: null },

  // Package
  packagePrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  discountPercent: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0 },
  additionalCost: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Lists
  includedItems: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  excludedItems: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },

  // Notes
  additional: { type: DataTypes.TEXT, allowNull: true },

  // Calculated
  travelerTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  roomTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  flightTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  activityTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  discountAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  finalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'THB' },
}, {
  tableName: 'quotations',
  paranoid: true,
  indexes: [
    { fields: ['countryCode'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Quotation;
