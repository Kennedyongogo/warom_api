const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromMessage",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      conversation_id: { type: DataTypes.UUID, allowNull: false },
      sender_id: { type: DataTypes.UUID, allowNull: false },
      message_type: {
        type: DataTypes.ENUM("text", "voice", "photo", "video", "sticker", "gif", "gift"),
        allowNull: false,
        defaultValue: "text",
      },
      body: { type: DataTypes.TEXT, allowNull: true },
      media_url: { type: DataTypes.STRING, allowNull: true },
      gift_id: { type: DataTypes.UUID, allowNull: true },
      coin_cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_paid_unlock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
      moderation_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "approved",
      },
    },
    { tableName: "warom_messages", timestamps: true, underscored: true }
  );
