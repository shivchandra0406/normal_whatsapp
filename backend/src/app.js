const express = require('express');
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsapp.routes');
const campaignRoutes = require('./routes/campaign.routes');
const templateRoutes = require('./routes/template.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const config = require('./config/env');

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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
