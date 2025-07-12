const express = require('express');
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsapp.routes');
const campaignRoutes = require('./routes/campaign.routes');
const templateRoutes = require('./routes/template.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const config = require('./config/env');

const app = express();

// Middleware - Production-grade CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://localhost:3001',
  config.corsOrigin
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/templates', templateRoutes);

// Error handling middleware
app.use(errorHandler);

// Export the app for use in index.js

module.exports = app;
