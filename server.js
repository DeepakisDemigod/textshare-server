const express = require('express');
const cors = require('cors'); 
const mongoose = require('mongoose');
const http = require('http'); // Import HTTP to work with Socket.IO
const { Server } = require('socket.io'); // Import Socket.IO

const app = express();
const PORT = 5000;

// Set up an HTTP server for both Express and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (adjust this in production)
    methods: ['GET', 'POST'],
  },
});

app.use(cors()); 
app.use(express.json()); 

mongoose
  .connect(
    'mongodb+srv://deepakthapa1423:genuinecalibre12345@cluster0.pw2bc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    {
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    }
  )
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const Note = require('./models/Note');

app.get("/api/", (req, res) => {
  res.send("This is textshare server")
})

// REST API: Fetch a note by URL
app.get('/api/notes/:url', async (req, res) => {
  const { url } = req.params;
  try {
    let note = await Note.findOne({ url });
    if (!note) {
      note = new Note({ url });
      await note.save();
      console.log('✨ Note URL created  /', url);
    }
    console.log('☄️ Note URL fetched  /', url);
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching note', error });
  }
});

// REST API: Save or update a note
app.post('/api/notes/:url', async (req, res) => {
  const { url } = req.params;
  const { content } = req.body;
  try {
    const note = await Note.findOneAndUpdate(
      { url },
      { content },
      { new: true, upsert: true }
    );
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Error saving note', error });
  }
});

// WebSocket: Add real-time collaboration
let notesCache = {}; // Temporary in-memory cache for notes

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle joining a specific room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);

    // Send existing content to the new user
    if (notesCache[roomId]) {
      socket.emit('receive-update', notesCache[roomId]);
    }
  });

  // Handle receiving updates from a client
  socket.on('update-note', async ({ roomId, content }) => {
    notesCache[roomId] = content;

    // Broadcast changes to other users in the same room
    socket.to(roomId).emit('receive-update', content);

    // Optional: Save updates to the database
    try {
      await Note.findOneAndUpdate({ url: roomId }, { content }, { upsert: true });
      console.log(`Note updated in DB: ${roomId}`);
    } catch (error) {
      console.error('Error saving note to DB:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
