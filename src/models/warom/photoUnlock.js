const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromPhotoUnlock",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      photo_id: { type: DataTypes.UUID, allowNull: false },
      buyer_id: { type: DataTypes.UUID, allowNull: false },
      owner_id: { type: DataTypes.UUID, allowNull: false },
      coin_cost: { type: DataTypes.INTEGER, allowNull: false },
      chatter_share_coins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      platform_share_coins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ledger_entry_id: { type: DataTypes.UUID, allowNull: true },
      available_at: { type: DataTypes.DATE, allowNull: true },
      released_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "warom_photo_unlocks",
      timestamps: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ["photo_id", "buyer_id"] },
      ],
    }
  );
