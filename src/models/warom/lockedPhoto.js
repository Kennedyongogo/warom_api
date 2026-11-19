const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromLockedPhoto",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      owner_id: { type: DataTypes.UUID, allowNull: false },
      media_url: { type: DataTypes.STRING, allowNull: false },
      thumbnail_url: { type: DataTypes.STRING, allowNull: true },
      caption: { type: DataTypes.STRING, allowNull: true },
      coin_price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "warom_locked_photos", timestamps: true, underscored: true }
  );
