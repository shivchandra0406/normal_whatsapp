const BaseEventHandler = require('./BaseEventHandler');
const { campaignRepository } = require('../../repositories');

/**
 * Campaign event handler for real-time campaign operations
 */
class CampaignEventHandler extends BaseEventHandler {
  constructor(socket, io) {
    super(socket, io);
    this.activeCampaigns = new Map(); // Track active campaigns
  }

  /**
   * Handle start campaign request
   */
  async handleStartCampaign(data) {
    this.log('Start campaign requested', { name: data.name });
    
    const validation = this.validateRequired(data, ['name', 'message', 'recipients']);
    if (!validation.isValid) {
      return this.sendError('campaign:start-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      // Create campaign record
      const campaign = await campaignRepository.create({
        name: data.name,
        message: data.message,
        totalCount: data.recipients.length,
        status: 'pending',
        sendMode: data.sendMode || 'individual',
        recipients: data.recipients
      });

      this.sendSuccess('campaign:started', { 
        campaignId: campaign.id,
        campaign 
      });

      // Start campaign processing
      this.processCampaign(campaign);
      
      // Broadcast campaign started
      this.broadcastExcept('campaign:status-update', {
        campaignId: campaign.id,
        status: 'started',
        campaign
      });
    } catch (error) {
      this.sendError('campaign:start-error', error);
    }
  }

  /**
   * Handle pause campaign request
   */
  async handlePauseCampaign(data) {
    this.log('Pause campaign requested', { campaignId: data.campaignId });
    
    const validation = this.validateRequired(data, ['campaignId']);
    if (!validation.isValid) {
      return this.sendError('campaign:pause-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const campaign = await campaignRepository.updateStatus(data.campaignId, 'paused');
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Stop processing if active
      if (this.activeCampaigns.has(data.campaignId)) {
        this.activeCampaigns.get(data.campaignId).paused = true;
      }

      this.sendSuccess('campaign:paused', { campaign });
      
      // Broadcast campaign paused
      this.broadcast('campaign:status-update', {
        campaignId: data.campaignId,
        status: 'paused',
        campaign
      });
    } catch (error) {
      this.sendError('campaign:pause-error', error);
    }
  }

  /**
   * Handle resume campaign request
   */
  async handleResumeCampaign(data) {
    this.log('Resume campaign requested', { campaignId: data.campaignId });
    
    const validation = this.validateRequired(data, ['campaignId']);
    if (!validation.isValid) {
      return this.sendError('campaign:resume-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const campaign = await campaignRepository.updateStatus(data.campaignId, 'sending');
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Resume processing
      if (this.activeCampaigns.has(data.campaignId)) {
        this.activeCampaigns.get(data.campaignId).paused = false;
      } else {
        this.processCampaign(campaign);
      }

      this.sendSuccess('campaign:resumed', { campaign });
      
      // Broadcast campaign resumed
      this.broadcast('campaign:status-update', {
        campaignId: data.campaignId,
        status: 'resumed',
        campaign
      });
    } catch (error) {
      this.sendError('campaign:resume-error', error);
    }
  }

  /**
   * Handle stop campaign request
   */
  async handleStopCampaign(data) {
    this.log('Stop campaign requested', { campaignId: data.campaignId });
    
    const validation = this.validateRequired(data, ['campaignId']);
    if (!validation.isValid) {
      return this.sendError('campaign:stop-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const campaign = await campaignRepository.updateStatus(data.campaignId, 'stopped');
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Stop processing
      if (this.activeCampaigns.has(data.campaignId)) {
        this.activeCampaigns.get(data.campaignId).stopped = true;
      }

      this.sendSuccess('campaign:stopped', { campaign });
      
      // Broadcast campaign stopped
      this.broadcast('campaign:status-update', {
        campaignId: data.campaignId,
        status: 'stopped',
        campaign
      });
    } catch (error) {
      this.sendError('campaign:stop-error', error);
    }
  }

  /**
   * Handle get campaign status request
   */
  async handleGetStatus(data) {
    this.log('Get campaign status requested', { campaignId: data.campaignId });
    
    const validation = this.validateRequired(data, ['campaignId']);
    if (!validation.isValid) {
      return this.sendError('campaign:status-error', 
        new Error(`Missing required fields: ${validation.missing.join(', ')}`));
    }

    try {
      const campaign = await campaignRepository.findById(data.campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      this.sendSuccess('campaign:status', { campaign });
    } catch (error) {
      this.sendError('campaign:status-error', error);
    }
  }

  /**
   * Process campaign (send messages)
   */
  async processCampaign(campaign) {
    this.log('Processing campaign', { campaignId: campaign.id });
    
    const campaignState = {
      paused: false,
      stopped: false,
      currentIndex: 0
    };
    
    this.activeCampaigns.set(campaign.id, campaignState);

    try {
      // Update status to sending
      await campaignRepository.updateStatus(campaign.id, 'sending');
      
      // Process recipients
      for (let i = 0; i < campaign.recipients.length; i++) {
        // Check if campaign is paused or stopped
        if (campaignState.paused || campaignState.stopped) {
          break;
        }

        const recipient = campaign.recipients[i];
        campaignState.currentIndex = i;

        try {
          // Send message (implement actual sending logic)
          await this.sendMessage(recipient, campaign.message);
          
          // Update sent count
          await campaignRepository.incrementSentCount(campaign.id);
          
          // Broadcast progress
          this.broadcast('campaign:progress', {
            campaignId: campaign.id,
            progress: {
              current: i + 1,
              total: campaign.recipients.length,
              percentage: Math.round(((i + 1) / campaign.recipients.length) * 100)
            }
          });
          
        } catch (error) {
          this.logError(`Failed to send to ${recipient}`, error);
          await campaignRepository.incrementFailedCount(campaign.id);
        }

        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Mark campaign as completed if not stopped
      if (!campaignState.stopped) {
        await campaignRepository.updateStatus(campaign.id, 'completed');
        
        this.broadcast('campaign:completed', {
          campaignId: campaign.id
        });
      }

    } catch (error) {
      this.logError('Campaign processing failed', error);
      await campaignRepository.updateStatus(campaign.id, 'failed');
      
      this.broadcast('campaign:failed', {
        campaignId: campaign.id,
        error: error.message
      });
    } finally {
      this.activeCampaigns.delete(campaign.id);
    }
  }

  /**
   * Send message to recipient (placeholder - implement actual sending)
   */
  async sendMessage(recipient, message) {
    // This should integrate with WhatsApp service
    // For now, just simulate sending
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
}

module.exports = CampaignEventHandler;
