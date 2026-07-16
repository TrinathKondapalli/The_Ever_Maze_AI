const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { registerHandlers } = require('./src/networking/socketHandler.js');
const { RoomManager } = require('./src/rooms/roomManager.js');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: CLIENT_ORIGIN }));
const DEBUG = process.env.DEBUG !== 'false';

const roomManager = new RoomManager();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ...roomManager.getStats(),
    timestamp: Date.now()
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

registerHandlers(io, roomManager);

if (process.env.NODE_ENV !== 'production') {
  import('vite').then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
      configFile: path.resolve(__dirname, '../client/vite.config.js'),
      root: path.resolve(__dirname, '../client')
    }).then(vite => {
      app.use(vite.middlewares);
      server.listen(PORT, '0.0.0.0', () => {
        if (DEBUG) console.log(`[Dev] Server & Vite listening on port ${PORT}`);
      });
    });
  });
} else {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  server.listen(PORT, '0.0.0.0', () => {
    if (DEBUG) console.log(`[Prod] Server listening on port ${PORT}`);
  });
}

process.on('SIGTERM', () => {
  if (DEBUG) console.log('SIGTERM received. Shutting down gracefully.');
  server.close(() => process.exit(0));
});
