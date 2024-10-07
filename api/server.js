// api/server.js (serverless function for backend)

const { Server } = require('socket.io');

module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Starting Socket.io server...');
    
    // Create HTTP Server
    const io = new Server(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // Relay offer or answer between peers
      socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', data);
      });

      socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', data);
      });

      // Relay ICE candidates between peers
      socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', data);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};
