const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromUser",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      account_type: {
        type: DataTypes.ENUM("user", "chatter"),
        allowNull: false,
        defaultValue: "user",
      },
      email: { type: DataTypes.STRING, allowNull: true, unique: true, validate: { isEmail: true } },
      phone: { type: DataTypes.STRING, allowNull: true },
      password: { type: DataTypes.STRING, allowNull: true },
      auth_provider: {
        type: DataTypes.ENUM("email", "google", "apple"),
        allowNull: false,
        defaultValue: "email",
      },
      google_id: { type: DataTypes.STRING, allowNull: true, unique: true },
      apple_id: { type: DataTypes.STRING, allowNull: true, unique: true },
      username: { type: DataTypes.STRING, allowNull: false, unique: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.STRING, allowNull: true },
      hobbies: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      country: { type: DataTypes.STRING, allowNull: true },
      city: { type: DataTypes.STRING, allowNull: true },
      bio: { type: DataTypes.TEXT, allowNull: true },
      profile_picture: { type: DataTypes.STRING, allowNull: true },
      cover_photos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      photos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      is_online: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      last_active_at: { type: DataTypes.DATE, allowNull: true },
      is_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verification_status: {
        type: DataTypes.ENUM("none", "pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "none",
      },
      is_vip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      vip_expires_at: { type: DataTypes.DATE, allowNull: true },
      profile_visibility: {
        type: DataTypes.ENUM("public", "matches", "private"),
        allowNull: false,
        defaultValue: "public",
      },
      status: {
        type: DataTypes.ENUM("active", "suspended", "terminated", "deleted"),
        allowNull: false,
        defaultValue: "active",
      },
      onboarding_completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      privacy_settings: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      device_tokens: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { tableName: "warom_users", timestamps: true, underscored: true }
  );
