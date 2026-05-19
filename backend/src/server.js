const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const skillRoutes = require('./routes/skillRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const contractRoutes = require('./routes/contractRoutes');
const walletRoutes = require('./routes/walletRoutes');
const aiInterviewRoutes = require('./modules/ai-interview/interview.routes');
const connectDB = require('./config/database');
const { ensureDirectory, getUploadsRoot } = require('./utils/storagePaths');
const { metricsMiddleware, metricsHandler } = require('./monitoring/metrics');

// Load environment variables from .env file
dotenv.config();

// Create an instance of the Express application
const app = express();

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(metricsMiddleware);

// Health check for Docker/K8s
app.get('/health', (req, res) => {
    res.status(200).send('ok');
});

app.get('/metrics', metricsHandler);

// Basic request logger for debugging API calls
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
    });
    next();
});

// Connect to MongoDB
connectDB();
ensureDirectory(getUploadsRoot());

// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/interview', aiInterviewRoutes);
app.use('/api/interviews', aiInterviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/wallet', walletRoutes);
const eventRoutes = require('./routes/eventRoutes');
app.use('/api/events', eventRoutes);
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);
app.use('/uploads', express.static(getUploadsRoot()));
app.get('/', (req, res) => {
    console.log("server is working");
    res.status(200).send('ok');
});

// Start the server
const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5000);
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
});
