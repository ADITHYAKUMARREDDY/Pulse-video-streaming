import { protectSocket } from '../middleware/socketAuth.js';

export const initializeSocket = (io) => {
  // Socket.io authentication middleware
  io.use(protectSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user-specific room
    socket.join(`user-${socket.userId}`);
    
    // Join tenant-specific room
    socket.join(`tenant-${socket.tenantId}`);

    // Handle video room joins for specific video updates
    socket.on('video:join', (videoId) => {
      socket.join(`video-${videoId}`);
      console.log(`User ${socket.userId} joined video room: ${videoId}`);
    });

    socket.on('video:leave', (videoId) => {
      socket.leave(`video-${videoId}`);
      console.log(`User ${socket.userId} left video room: ${videoId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

