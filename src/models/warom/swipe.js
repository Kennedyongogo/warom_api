const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromSwipe",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      swiper_id: { type: DataTypes.UUID, allowNull: false },
      target_id: { type: DataTypes.UUID, allowNull: false },
      action: { type: DataTypes.ENUM("like", "pass"), allowNull: false },
    },
    { tableName: "warom_swipes", timestamps: true, underscored: true,
      indexes: [{ unique: true, fields: ["swiper_id", "target_id"] }] }
  );
