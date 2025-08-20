const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'done'),
    defaultValue: 'pending'
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'tasks'
});

module.exports = Task;
