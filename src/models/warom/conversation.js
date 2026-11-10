const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromConversation",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      participant_a_id: { type: DataTypes.UUID, allowNull: false },
      participant_b_id: { type: DataTypes.UUID, allowNull: false },
      last_message_at: { type: DataTypes.DATE, allowNull: true },
      last_message_preview: { type: DataTypes.STRING, allowNull: true },
      is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      unlock_cost_coins: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "warom_conversations", timestamps: true, underscored: true,
      indexes: [{ unique: true, fields: ["participant_a_id", "participant_b_id"] }] }
  );
