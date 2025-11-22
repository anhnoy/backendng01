"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // เพิ่มฟิลด์ที่ขาดใน users
    // name, status, lastLogin, phone columns already exist, skip adding
    await queryInterface.addColumn("users", "profileImage", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn("users", "note", {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("users", "languages", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "name");
    await queryInterface.removeColumn("users", "status");
    await queryInterface.removeColumn("users", "lastLogin");
    await queryInterface.removeColumn("users", "phone");
    await queryInterface.removeColumn("users", "profileImage");
    await queryInterface.removeColumn("users", "note");
    await queryInterface.removeColumn("users", "languages");
  }
};
