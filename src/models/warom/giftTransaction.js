const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromGiftTransaction",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      gift_id: { type: DataTypes.UUID, allowNull: false },
      sender_id: { type: DataTypes.UUID, allowNull: false },
      receiver_id: { type: DataTypes.UUID, allowNull: false },
      coin_value: { type: DataTypes.INTEGER, allowNull: false },
      chatter_share_coins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      platform_share_coins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      conversation_id: { type: DataTypes.UUID, allowNull: true },
      message_id: { type: DataTypes.UUID, allowNull: true },
      ledger_entry_id: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: "warom_gift_transactions", timestamps: true, underscored: true }
  );
