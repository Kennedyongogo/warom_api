const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromPolicy",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      title: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      version: { type: DataTypes.STRING, allowNull: false, defaultValue: "1.0" },
      is_published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      published_at: { type: DataTypes.DATE, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: "warom_policies", timestamps: true, underscored: true }
  );
