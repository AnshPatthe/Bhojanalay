import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from './socketEvents';

let socket = null;

export const getSocket = (branchId) => {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    
    socket.on('connect', () => {
      console.log('[Socket Connected] ID:', socket.id);
      if (branchId) {
        console.log('[Room Joined] Branch Room:', branchId);
        socket.emit(SOCKET_EVENTS.JOIN_BRANCH, branchId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket Disconnected] Reason:', reason);
    });

    socket.io.on('reconnect', (attempt) => {
      console.log('[Reconnect Successful] Reconnected after', attempt, 'attempts');
      if (branchId) {
        socket.emit(SOCKET_EVENTS.JOIN_BRANCH, branchId);
      }
    });
  } else if (branchId) {
    // If socket already exists, ensure room is joined
    socket.emit(SOCKET_EVENTS.JOIN_BRANCH, branchId);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected and cleared.');
  }
};

export default { getSocket, disconnectSocket };
