// socket/socketHandler.js - Real-time Features
const jwt = require('jsonwebtoken');
const { User, Meeting } = require('../models/models');

// Active meetings ka track rakhenge
const activeRooms = new Map(); // meetingId -> { participants: Set, host: userId }
const userSockets = new Map(); // userId -> socketId

const socketHandler = (io) => {
  
  // ─── AUTHENTICATION MIDDLEWARE ───
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication zaroori hai'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User nahi mila'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.id})`);
    
    // User online mark karo
    userSockets.set(socket.user._id.toString(), socket.id);
    User.findByIdAndUpdate(socket.user._id, { isOnline: true }).exec();

    // ─── JOIN MEETING ROOM ───
    socket.on('join-room', async ({ meetingId }) => {
      try {
        const meeting = await Meeting.findOne({ meetingId });
        if (!meeting) {
          socket.emit('error', { message: 'Meeting nahi mili' });
          return;
        }

        // Room join karo
        socket.join(meetingId);

        // Room track karo
        if (!activeRooms.has(meetingId)) {
          activeRooms.set(meetingId, {
            participants: new Set(),
            host: meeting.host.toString()
          });
        }
        activeRooms.get(meetingId).participants.add(socket.user._id.toString());

        // Sab participants ko batao
        socket.to(meetingId).emit('user-joined', {
          userId: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
          message: `${socket.user.name} meeting mein join ho gaye 👋`
        });

        // Current participants list bhejo
        const room = activeRooms.get(meetingId);
        socket.emit('room-info', {
          meetingId,
          participantCount: room.participants.size,
          isHost: room.host === socket.user._id.toString()
        });

        console.log(`📹 ${socket.user.name} joined meeting ${meetingId}`);
      } catch (error) {
        socket.emit('error', { message: 'Meeting join karne mein error' });
      }
    });

    // ─── LEAVE MEETING ───
    socket.on('leave-room', ({ meetingId }) => {
      socket.leave(meetingId);
      
      if (activeRooms.has(meetingId)) {
        activeRooms.get(meetingId).participants.delete(socket.user._id.toString());
      }

      socket.to(meetingId).emit('user-left', {
        userId: socket.user._id,
        name: socket.user.name,
        message: `${socket.user.name} meeting se chale gaye`
      });
    });

    // ─── REAL-TIME CHAT ───
    socket.on('chat-message', async ({ meetingId, message }) => {
      if (!message.trim()) return;

      const msgData = {
        id: Date.now().toString(),
        sender: {
          id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        message: message.trim(),
        timestamp: new Date().toISOString(),
        meetingId
      };

      // Sab participants ko message bhejo
      io.to(meetingId).emit('chat-message', msgData);
    });

    // ─── TYPING INDICATOR ───
    socket.on('typing-start', ({ meetingId }) => {
      socket.to(meetingId).emit('user-typing', {
        userId: socket.user._id,
        name: socket.user.name
      });
    });

    socket.on('typing-stop', ({ meetingId }) => {
      socket.to(meetingId).emit('user-stop-typing', {
        userId: socket.user._id
      });
    });

    // ─── WEBRTC SIGNALING ───
    // Peer connection ke liye WebRTC signals relay karo
    socket.on('webrtc-offer', ({ targetId, offer, meetingId }) => {
      socket.to(targetId).emit('webrtc-offer', {
        fromId: socket.id,
        fromUser: { id: socket.user._id, name: socket.user.name },
        offer,
        meetingId
      });
    });

    socket.on('webrtc-answer', ({ targetId, answer }) => {
      socket.to(targetId).emit('webrtc-answer', {
        fromId: socket.id,
        answer
      });
    });

    socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
      socket.to(targetId).emit('webrtc-ice-candidate', {
        fromId: socket.id,
        candidate
      });
    });

    // ─── MIC/CAMERA STATUS ───
    socket.on('media-status-change', ({ meetingId, isMuted, isVideoOn }) => {
      socket.to(meetingId).emit('participant-media-update', {
        userId: socket.user._id,
        isMuted,
        isVideoOn
      });
    });

    // ─── SCREEN SHARE ───
    socket.on('screen-share-start', ({ meetingId }) => {
      io.to(meetingId).emit('screen-share-started', {
        userId: socket.user._id,
        name: socket.user.name
      });
    });

    socket.on('screen-share-stop', ({ meetingId }) => {
      io.to(meetingId).emit('screen-share-stopped', {
        userId: socket.user._id
      });
    });

    // ─── LIVE TRANSCRIPT ───
    socket.on('transcript-update', ({ meetingId, text, speaker }) => {
      // Sab participants ko live transcript bhejo
      socket.to(meetingId).emit('live-transcript', {
        speaker: {
          id: socket.user._id,
          name: speaker || socket.user.name
        },
        text,
        timestamp: new Date().toISOString()
      });
    });

    // ─── REACTION ───
    socket.on('send-reaction', ({ meetingId, emoji }) => {
      io.to(meetingId).emit('new-reaction', {
        userId: socket.user._id,
        name: socket.user.name,
        emoji,
        timestamp: new Date()
      });
    });

    // ─── MEETING END ───
    socket.on('end-meeting', async ({ meetingId }) => {
      const room = activeRooms.get(meetingId);
      
      if (room && room.host === socket.user._id.toString()) {
        io.to(meetingId).emit('meeting-ended', {
          endedBy: socket.user.name,
          message: 'Meeting host ne end kar di. AI summary generate ho rahi hai...'
        });
        
        activeRooms.delete(meetingId);
        
        // Meeting update karo DB mein
        try {
          await Meeting.findOneAndUpdate(
            { meetingId },
            { status: 'ended', endedAt: new Date() }
          );
        } catch (err) {
          console.error('Meeting end DB update error:', err);
        }
      } else {
        socket.emit('error', { message: 'Sirf host hi meeting end kar sakta hai' });
      }
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);
      
      userSockets.delete(socket.user._id.toString());
      User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date()
      }).exec();

      // Sabhi rooms mein se hatao
      activeRooms.forEach((room, meetingId) => {
        if (room.participants.has(socket.user._id.toString())) {
          room.participants.delete(socket.user._id.toString());
          io.to(meetingId).emit('user-left', {
            userId: socket.user._id,
            name: socket.user.name,
            message: `${socket.user.name} disconnect ho gaye`
          });
        }
      });
    });
  });

  return io;
};

module.exports = { socketHandler };
