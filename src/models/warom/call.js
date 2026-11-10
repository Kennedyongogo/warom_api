const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromCall",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      caller_id: { type: DataTypes.UUID, allowNull: false },
      callee_id: { type: DataTypes.UUID, allowNull: false },
      call_type: { type: DataTypes.ENUM("voice", "video"), allowNull: false },
      status: {
        type: DataTypes.ENUM("ringing", "answered", "missed", "rejected", "ended", "failed"),
        allowNull: false,
        defaultValue: "ringing",
      },
      started_at: { type: DataTypes.DATE, allowNull: true },
      ended_at: { type: DataTypes.DATE, allowNull: true },
      duration_seconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      coin_cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      signalling_payload: { type: DataTypes.JSONB, allowNull: true },
    },
    { tableName: "warom_calls", timestamps: true, underscored: true }
  );
