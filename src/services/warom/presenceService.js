const { User } = require("../../models");

/** userId -> Set of socket ids */
const socketsByUser = new Map();
/** socketId -> userId */
const userBySocket = new Map();

const markOnline = async (userId, socketId) => {
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId).add(socketId);
  userBySocket.set(socketId, userId);
  await User.update(
    { is_online: true, last_active_at: new Date() },
    { where: { id: userId } }
  );
  return isOnline(userId);
};

const markOfflineSocket = async (socketId) => {
  const userId = userBySocket.get(socketId);
  if (!userId) return null;
  userBySocket.delete(socketId);
  const set = socketsByUser.get(userId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) {
      socketsByUser.delete(userId);
      await User.update(
        { is_online: false, last_active_at: new Date() },
        { where: { id: userId } }
      );
      return { userId, online: false };
    }
  }
  return { userId, online: true };
};

const heartbeat = async (userId) => {
  await User.update(
    { is_online: true, last_active_at: new Date() },
    { where: { id: userId } }
  );
};

const isOnline = (userId) =>
  Boolean(socketsByUser.get(userId) && socketsByUser.get(userId).size > 0);

const socketIdsFor = (userId) => [...(socketsByUser.get(userId) || [])];

module.exports = {
  markOnline,
  markOfflineSocket,
  heartbeat,
  isOnline,
  socketIdsFor,
  socketsByUser,
};
