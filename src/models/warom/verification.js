const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromVerification",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      kind: { type: DataTypes.ENUM("age", "identity", "chatter_kyc"), allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      document_urls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      liveness_payload: { type: DataTypes.JSONB, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      reviewed_by: { type: DataTypes.UUID, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "warom_verifications", timestamps: true, underscored: true }
  );
