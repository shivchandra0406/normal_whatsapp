const DatabaseFactory = require('../database/DatabaseFactory');
const TemplateRepository = require('./TemplateRepository');
const CampaignRepository = require('./CampaignRepository');

// Get database instance
const database = DatabaseFactory.getInstance('json', {
  dataDir: process.env.DATA_DIR || require('path').join(__dirname, '../data')
});

// Create repository instances
const templateRepository = new TemplateRepository(database);
const campaignRepository = new CampaignRepository(database);

module.exports = {
  database,
  templateRepository,
  campaignRepository
};
