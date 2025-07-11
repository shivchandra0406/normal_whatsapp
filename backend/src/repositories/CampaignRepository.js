const BaseRepository = require('./BaseRepository');

/**
 * Campaign repository for managing campaigns
 */
class CampaignRepository extends BaseRepository {
  constructor(database) {
    super(database, 'campaigns');
  }

  /**
   * Find campaigns by status
   * @param {string} status - Campaign status
   * @returns {Promise<Array>} Array of campaigns
   */
  async findByStatus(status) {
    return await this.findBy({ status });
  }

  /**
   * Find recent campaigns
   * @param {number} limit - Number of campaigns to return
   * @returns {Promise<Array>} Array of recent campaigns
   */
  async findRecent(limit = 10) {
    const campaigns = await this.findAll();
    return campaigns
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Find campaigns within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of campaigns
   */
  async findByDateRange(startDate, endDate) {
    const campaigns = await this.findAll();
    return campaigns.filter(campaign => {
      const campaignDate = new Date(campaign.createdAt);
      return campaignDate >= startDate && campaignDate <= endDate;
    });
  }

  /**
   * Update campaign status
   * @param {string} id - Campaign ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated campaign
   */
  async updateStatus(id, status) {
    return await this.updateById(id, { 
      status,
      ...(status === 'completed' && { completedAt: new Date().toISOString() })
    });
  }

  /**
   * Increment sent count
   * @param {string} id - Campaign ID
   * @param {number} increment - Number to increment by (default: 1)
   * @returns {Promise<Object|null>} Updated campaign
   */
  async incrementSentCount(id, increment = 1) {
    const campaign = await this.findById(id);
    if (!campaign) return null;

    return await this.updateById(id, {
      sentCount: (campaign.sentCount || 0) + increment
    });
  }

  /**
   * Increment failed count
   * @param {string} id - Campaign ID
   * @param {number} increment - Number to increment by (default: 1)
   * @returns {Promise<Object|null>} Updated campaign
   */
  async incrementFailedCount(id, increment = 1) {
    const campaign = await this.findById(id);
    if (!campaign) return null;

    return await this.updateById(id, {
      failedCount: (campaign.failedCount || 0) + increment
    });
  }

  /**
   * Get campaign statistics
   * @returns {Promise<Object>} Campaign statistics
   */
  async getStatistics() {
    const campaigns = await this.findAll();
    const stats = {
      total: campaigns.length,
      byStatus: {},
      totalSent: 0,
      totalFailed: 0,
      successRate: 0
    };

    let totalAttempts = 0;
    let totalSuccessful = 0;

    campaigns.forEach(campaign => {
      // Count by status
      stats.byStatus[campaign.status] = (stats.byStatus[campaign.status] || 0) + 1;
      
      // Sum totals
      stats.totalSent += campaign.sentCount || 0;
      stats.totalFailed += campaign.failedCount || 0;
      
      totalAttempts += (campaign.sentCount || 0) + (campaign.failedCount || 0);
      totalSuccessful += campaign.sentCount || 0;
    });

    // Calculate success rate
    if (totalAttempts > 0) {
      stats.successRate = Math.round((totalSuccessful / totalAttempts) * 100);
    }

    return stats;
  }

  /**
   * Validate campaign data
   * @param {Object} data - Campaign data
   * @returns {Object} Validation result
   */
  validate(data) {
    const errors = [];

    // Required fields
    if (!data.name || !data.name.trim()) {
      errors.push('Campaign name is required');
    }

    if (!data.message || !data.message.trim()) {
      errors.push('Campaign message is required');
    }

    if (!data.totalCount || data.totalCount < 1) {
      errors.push('Campaign must have at least one recipient');
    }

    // Validate status
    const validStatuses = ['pending', 'sending', 'completed', 'failed', 'paused'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push('Invalid campaign status');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform data before saving
   * @param {Object} data - Campaign data
   * @returns {Object} Transformed data
   */
  beforeSave(data) {
    return {
      ...data,
      name: data.name?.trim(),
      message: data.message?.trim(),
      status: data.status || 'pending',
      sentCount: data.sentCount || 0,
      failedCount: data.failedCount || 0,
      totalCount: data.totalCount || 0
    };
  }

  /**
   * Get campaigns with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated campaigns
   */
  async findPaginated(page = 1, limit = 10) {
    const campaigns = await this.findAll();
    const total = campaigns.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    const sortedCampaigns = campaigns
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + limit);

    return {
      campaigns: sortedCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}

module.exports = CampaignRepository;
