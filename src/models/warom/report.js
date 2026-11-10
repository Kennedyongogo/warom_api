const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromReport",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      reporter_id: { type: DataTypes.UUID, allowNull: false },
      reported_user_id: { type: DataTypes.UUID, allowNull: true },
      target_type: {
        type: DataTypes.ENUM("user", "message", "call", "photo", "live_stream"),
        allowNull: false,
        defaultValue: "user",
      },
      target_id: { type: DataTypes.UUID, allowNull: true },
      reason: { type: DataTypes.STRING, allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: true },
      evidence_urls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      status: {
        type: DataTypes.ENUM("open", "reviewing", "resolved", "dismissed", "escalated"),
        allowNull: false,
        defaultValue: "open",
      },
      handled_by: { type: DataTypes.UUID, allowNull: true },
      handled_at: { type: DataTypes.DATE, allowNull: true },
      resolution_notes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: "warom_reports", timestamps: true, underscored: true }
  );
