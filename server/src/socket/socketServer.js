import { Server } from 'socket.io';
import logger from '../config/logger.js';
import { SOCKET_EVENTS } from './socketEvents.js';

let io = null;

export const initSocket = (server, clientUrl) => {
  io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: process.env.NODE_ENV === 'development'
        ? (origin, callback) => callback(null, true)
        : (clientUrl || '*'),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join branch channel
    socket.on(SOCKET_EVENTS.JOIN_BRANCH, (branchId) => {
      socket.join(branchId);
      logger.info(`Socket ${socket.id} joined branch channel: ${branchId}`);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

export default { initSocket, getIO };
