const { Notification } = require("../../models");

const createNotification = async ({
  userId,
  type,
  title,
  body = null,
  data = {},
}) =>
  Notification.create({
    user_id: userId,
    type,
    title,
    body,
    data,
  });

const listForUser = async (userId, { unreadOnly = false, limit = 50 } = {}) => {
  const where = { user_id: userId };
  if (unreadOnly) where.is_read = false;
  return Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
  });
};

const markRead = async (userId, notificationId) => {
  const row = await Notification.findOne({
    where: { id: notificationId, user_id: userId },
  });
  if (!row) return null;
  await row.update({ is_read: true, read_at: new Date() });
  return row;
};

module.exports = { createNotification, listForUser, markRead };
