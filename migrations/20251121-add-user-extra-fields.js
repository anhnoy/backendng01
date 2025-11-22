"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "name", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: ""
    });
    // status column already exists, skip adding
    // lastLogin column already exists, skip adding
    await queryInterface.addColumn("users", "languages", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn("users", "profileImage", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "name");
    await queryInterface.removeColumn("users", "status");
    await queryInterface.removeColumn("users", "languages");
    // DROP TYPE is not supported in MySQL/MariaDB
  }
};
