import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { initSocket } from './src/socket/socketServer.js';
import logger from './src/config/logger.js';

// 1. Establish Database Connection
connectDB();

// 2. Setup Server instance
const server = http.createServer(app);

// 3. Initialize Socket.io integration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
initSocket(server, clientUrl);

// 4. Run HTTP listener
const port = process.env.PORT || 5000;
server.listen(port, () => {
  logger.info(`Vyavastha Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});

// Process Error Listeners
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down server gracefully...', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server immediately...', err);
  process.exit(1);
});
