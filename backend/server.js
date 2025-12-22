// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const skillRoutes = require('./routes/skills');
const categoryRoutes = require('./routes/categories');
const userSkillRoutes = require('./routes/userSkills');
const sessionRoutes = require('./routes/sessions');
const mentorRoutes = require('./routes/mentors');
const uploadRoutes = require('./routes/upload');
const videoRoutes = require('./routes/videoRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

// ----------------------------------------------
// CONNECT TO DATABASE
// ----------------------------------------------
connectDB(process.env.MONGO_URI).catch((err) => {
  console.error('Failed to connect to DB, exiting.', err.message || err);
  process.exit(1);
});

// ----------------------------------------------
// MIDDLEWARE
// ----------------------------------------------
app.use(express.json());
app.use(cookieParser());

// CORS for frontend
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"], // Frontend URLs (dev ports)
    credentials: true,
  })
);

// Passport OAuth
const setupPassport = require('./config/passport');
setupPassport();
app.use(passport.initialize());

// ----------------------------------------------
// ROUTES
// ----------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/categories', categoryRoutes);

// ⭐ HERE IS THE USER SKILL ROUTES YOU ASKED FOR ⭐
app.use('/api/user-skills', userSkillRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/videos', videoRoutes); // For POST /api/videos/upload
app.use('/api/user/demo-videos', videoRoutes); // For GET/DELETE /api/user/demo-videos
app.use('/api/user', userRoutes); // For /api/user/profile

// ----------------------------------------------
// SOCKET.IO (simple chat for sessions)
// ----------------------------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173", "http://localhost:5174"], methods: ["GET","POST"], credentials: true }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (sessionId) => {
    if (sessionId) {
      socket.join(sessionId);
      console.log(`socket ${socket.id} joined ${sessionId}`);
    }
  });

  socket.on('message', async (payload) => {
    try {
      const Session = require('./models/Session');
      const User = require('./models/user');
      const { sessionId, text, from } = payload || {};
      if (!sessionId || !text || !from) return;
      const session = await Session.findById(sessionId);
      if (!session) return;
      const user = await User.findById(from);
      const fromName = user ? user.name : 'Unknown';
      const msg = { from, fromName, text, createdAt: new Date() };
      session.messages.push(msg);
      await session.save();
      io.to(sessionId).emit('message', msg);
    } catch (err) { console.error('socket message error', err); }
  });

  socket.on('sendMessage', (message) => {
    console.log('Message received:', message);
    socket.broadcast.emit('receiveMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// ----------------------------------------------
// HEALTH CHECK
// ----------------------------------------------
app.get('/', (req, res) => {
  res.send('SkillSwap API is running...');
});

// ----------------------------------------------
// ERROR HANDLER
// ----------------------------------------------
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ----------------------------------------------
// START SERVER
// ----------------------------------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server (with sockets) running at http://localhost:${PORT}`);
});
