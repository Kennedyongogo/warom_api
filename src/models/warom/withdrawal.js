const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromWithdrawal",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      chatter_id: { type: DataTypes.UUID, allowNull: false },
      amount_coins: { type: DataTypes.INTEGER, allowNull: false },
      amount_fiat: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "KES" },
      payout_method: { type: DataTypes.STRING, allowNull: false },
      payout_details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: {
        type: DataTypes.ENUM("pending", "processing", "paid", "rejected", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      reviewed_by: { type: DataTypes.UUID, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ledger_entry_id: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: "warom_withdrawals", timestamps: true, underscored: true }
  );
