const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromLedgerAccount",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      owner_type: {
        type: DataTypes.ENUM("user", "chatter", "platform", "escrow"),
        allowNull: false,
      },
      owner_id: { type: DataTypes.UUID, allowNull: true },
      account_code: {
        type: DataTypes.ENUM(
          "wallet_spendable",
          "pending_earnings",
          "available_earnings",
          "platform_revenue",
          "escrow_holding"
        ),
        allowNull: false,
      },
      currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: "COIN" },
      balance: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "warom_ledger_accounts", timestamps: true, underscored: true,
      indexes: [{ unique: true, fields: ["owner_type", "owner_id", "account_code", "currency"] }] }
  );
