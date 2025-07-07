// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const fileRoutes = require('./routes/fileRoutes');
const aiRoutes = require('./routes/aiRoutes'); // Fix: This line might have a typo, should be 'require'
const commentRoutes = require('./routes/commentRoutes');
const contractRoutes = require('./routes/contractRoutes');
const authRoutes = require('./routes/authRoutes'); // ADD THIS LINE

// Import services
const firestoreService = require('./services/firestoreService');

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Express app
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Database Connection (MongoDB - existing) ---
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI && MONGODB_URI !== 'your_mongodb_connection_string_here') {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('✅ MongoDB connected successfully'))
        .catch(err => console.error('❌ MongoDB connection error:', err));
} else {
    console.warn('⚠️  MongoDB URI not configured yet - database connection skipped');
    console.warn('💡 We\'ll set up the database in the next step');
}


// --- Create HTTP server and integrate Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`⚡️ User connected: ${socket.id}`);

    socket.on('newComment', async (commentData) => {
        console.log(`Received new comment for contract ${commentData.contractId}: ${commentData.text}`);
        try {
            // Placeholder userId for now. Will be updated with authenticated user's UID.
            // If the client sends a userId with the comment, use that. Otherwise, default.
            const userId = commentData.userId || socket.id;
            const userName = commentData.userName || `User_${userId.substring(0, 4)}`;

            const savedComment = await firestoreService.addComment(
                commentData.contractId,
                userId, // Use the user's ID
                userName, // Use the user's name
                commentData.text,
                commentData.highlightedText,
                commentData.selectionRange
            );
            io.emit('commentAdded', savedComment);
            console.log('Comment saved and broadcasted:', savedComment.id);
        } catch (error) {
            console.error('Error saving or broadcasting comment:', error);
            socket.emit('commentError', { message: 'Failed to add comment.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🚫 User disconnected: ${socket.id}`);
    });
});


// --- Routes ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Server is healthy', timestamp: new Date() });
});

app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'API test successful!' });
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the AI Contract Analyzer API!' });
});

// File routes
app.use('/api/files', fileRoutes);

// AI routes
app.use('/api/ai', aiRoutes);

// Comment routes
app.use('/api/comments', commentRoutes);

// Contract routes
app.use('/api/contracts', contractRoutes);

// Auth routes (ADD THIS LINE)
app.use('/api/auth', authRoutes);


// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('   AI Contract Analyzer Server');
    console.log('🚀 ================================');
    console.log(`📍 HTTP Server: http://localhost:${PORT}`);
    console.log(`💬 Socket.IO: ws://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test:   http://localhost:${PORT}/api/test`);
    console.log(`⬆️  Upload: http://localhost:${PORT}/api/files/upload (POST)`);
    console.log(`🧠 AI Analyze: http://localhost:${PORT}/api/ai/analyze (POST)`);
    console.log(`💬 Comments: http://localhost:${PORT}/api/comments/:contractId (GET)`);
    console.log(`📄 Contracts: http://localhost:${PORT}/api/contracts (GET)`);
    console.log(`📄 Contract By ID: http://localhost:${PORT}/api/contracts/:id (GET)`);
    console.log(`🔑 Auth Register: http://localhost:${PORT}/api/auth/register (POST)`); // ADD THIS
    console.log(`🔑 Auth Login: http://localhost:${PORT}/api/auth/login (POST)`);     // ADD THIS
    console.log('🚀 ================================\n');
});
