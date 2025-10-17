const { DataTypes } = require('sequelize');
const sequelize = require('./src/sequelize');

async function addMaxGuestsColumn() {
  try {
    console.log('Adding maxGuests column to tours table...');
    
    await sequelize.getQueryInterface().addColumn('tours', 'maxGuests', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10
    });
    
    console.log('maxGuests column added successfully!');
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('maxGuests column already exists');
    } else {
      console.error('Error adding column:', error.message);
    }
  } finally {
    await sequelize.close();
  }
}

addMaxGuestsColumn();