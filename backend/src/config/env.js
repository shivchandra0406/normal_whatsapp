const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envConfig = dotenv.config({
  path: `.env.${env}`
});
dotenvExpand.expand(envConfig);

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || './uploads'
};
