const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromBlock",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      blocker_id: { type: DataTypes.UUID, allowNull: false },
      blocked_id: { type: DataTypes.UUID, allowNull: false },
      reason: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "warom_blocks", timestamps: true, underscored: true,
      indexes: [{ unique: true, fields: ["blocker_id", "blocked_id"] }] }
  );
