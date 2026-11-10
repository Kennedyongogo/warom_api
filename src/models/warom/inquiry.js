const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromInquiry",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      subject: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM("new", "read", "replied", "closed"),
        allowNull: false,
        defaultValue: "new",
      },
      handled_by: { type: DataTypes.UUID, allowNull: true },
      admin_notes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: "warom_inquiries", timestamps: true, underscored: true }
  );
