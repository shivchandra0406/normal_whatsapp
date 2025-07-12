const xlsx = require('xlsx');
const fs = require('fs');
const whatsappService = require('./whatsapp.service');

const processContactsFile = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const contacts = data
    .map((row, index) => {
      // Get the phone number from any of the possible column names
      const phoneNumber = (row.phone || row.Phone || row.number || row.Number || '').toString().trim();
      const countryCode = (row.countryCode || row.CountryCode || '').toString().trim();
      
      // Remove any special characters and spaces from the phone number
      let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      // Handle country code
      if (cleanNumber.startsWith('+')) {
        cleanNumber = cleanNumber.substring(1);
      }
      
      // If country code is provided in separate column, use it
      if (countryCode) {
        const cleanCountryCode = countryCode.replace(/[^0-9]/g, '');
        if (!cleanNumber.startsWith(cleanCountryCode)) {
          cleanNumber = cleanCountryCode + cleanNumber;
        }
      } else {
        // Try to detect country code from the number itself
        // Common country codes: India (91), US (1), UAE (971)
        const commonCodes = ['91', '1', '971'];
        let hasCountryCode = false;
        
        for (const code of commonCodes) {
          if (cleanNumber.startsWith(code)) {
            hasCountryCode = true;
            break;
          }
        }
        
        // If no country code detected and number length is correct for a local number
        if (!hasCountryCode) {
          if (cleanNumber.length === 10) { // Typical length for local numbers
            // Default to India (91) if the number starts with 6-9
            if (/^[6-9]/.test(cleanNumber)) {
              cleanNumber = '91' + cleanNumber;
            }
            // Default to UAE (971) if the number starts with 5
            else if (/^5/.test(cleanNumber)) {
              cleanNumber = '971' + cleanNumber;
            }
            // Default to US (1) if the number starts with anything else
            else {
              cleanNumber = '1' + cleanNumber;
            }
          }
        }
      }
      
      // Validate the phone number length (must be at least 10 digits plus country code)
      if (cleanNumber.length < 11) return null;
      
      return {
        id: cleanNumber + '@c.us',  // WhatsApp Web expects ID in this format
        name: row.name || row.Name || `Contact ${cleanNumber}`,
        number: cleanNumber,
        isGroup: false,
        originalNumber: phoneNumber // Keep original for reference
      };
    })
    .filter(contact => contact !== null);

  // Clean up uploaded file
  fs.unlinkSync(filePath);

  return contacts;
};

const sendCampaign = async (name, message, contacts, file) => {
  if (!whatsappService.isConnected()) {
    throw new Error('WhatsApp not connected');
  }

  if (!name || !message) {
    throw new Error('Name and message are required');
  }

  // If a file is provided, process it and use those contacts
  let contactsToUse = contacts;
  if (file) {
    const fileContacts = await processContactsFile(file.path);
    if (!fileContacts || fileContacts.length === 0) {
      throw new Error('No valid contacts found in the uploaded file');
    }
    contactsToUse = fileContacts.map(c => c.id);
  } else if (!contacts || contacts.length === 0) {
    throw new Error('Either contacts or a file must be provided');
  }

  const results = [];
  for (const contactId of contactsToUse) {
    try {
      await whatsappService.sendMessage(contactId, message);
      results.push({ contactId, success: true });

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({ contactId, success: false, error: error.message });
    }
  }

  return results;
};

const bulkManageMembers = async (action, contactNumbers, groupIds) => {
  if (!whatsappService.isConnected()) {
    throw new Error('WhatsApp not connected');
  }

  if (!action || !contactNumbers || !groupIds) {
    throw new Error('Action, contact numbers, and group IDs are required');
  }

  if (!Array.isArray(contactNumbers) || !Array.isArray(groupIds)) {
    throw new Error('Contact numbers and group IDs must be arrays');
  }

  if (!['add', 'remove'].includes(action)) {
    throw new Error('Action must be either "add" or "remove"');
  }

  const results = [];
  const client = whatsappService.client();

  if (!client) {
    throw new Error('WhatsApp client not available');
  }

  // Get current user info for permission checking
  let currentUser;
  try {
    currentUser = await client.getContactById(client.info.wid._serialized);
  } catch (error) {
    console.warn('Could not get current user info:', error.message);
  }

  // Process each group
  for (const groupId of groupIds) {
    let groupInfo = null;
    let userPermissions = null;

    try {
      const group = await client.getChatById(groupId);

      if (!group || !group.isGroup) {
        // Add error for all contacts for this group
        for (const contactNumber of contactNumbers) {
          results.push({
            groupId,
            groupName: 'Unknown Group',
            contactId: contactNumber,
            success: false,
            error: 'Group not found or invalid',
            errorCategory: 'GROUP_NOT_FOUND'
          });
        }
        continue;
      }

      groupInfo = {
        id: groupId,
        name: group.name || 'Unnamed Group'
      };

      // Check user permissions in this group
      try {
        const participants = await group.participants;
        const currentUserParticipant = participants.find(p =>
          p.id._serialized === client.info.wid._serialized
        );

        if (!currentUserParticipant) {
          // User is not in the group
          for (const contactNumber of contactNumbers) {
            results.push({
              groupId,
              groupName: groupInfo.name,
              contactId: contactNumber,
              success: false,
              error: 'You are not a member of this group',
              errorCategory: 'NOT_A_MEMBER'
            });
          }
          continue;
        }

        userPermissions = {
          isAdmin: currentUserParticipant.isAdmin,
          isSuperAdmin: currentUserParticipant.isSuperAdmin,
          canAddMembers: currentUserParticipant.isAdmin || currentUserParticipant.isSuperAdmin
        };

        // Note: Permission check will be done per contact to handle self-addition cases

      } catch (permError) {
        console.error(`Error checking permissions for group ${groupId}:`, permError);
        for (const contactNumber of contactNumbers) {
          results.push({
            groupId,
            groupName: groupInfo.name,
            contactId: contactNumber,
            success: false,
            error: 'Could not verify group permissions',
            errorCategory: 'PERMISSION_CHECK_FAILED'
          });
        }
        continue;
      }

      // Process each contact number for this group
      for (const contactNumber of contactNumbers) {
        try {
          // Validate phone number format first
          const cleanNumber = contactNumber.replace(/[^\d+]/g, '');

          if (!cleanNumber || cleanNumber.length < 10) {
            results.push({
              groupId,
              groupName: groupInfo.name,
              contactId: contactNumber,
              success: false,
              error: 'Invalid phone number format (too short)',
              errorCategory: 'INVALID_PHONE_FORMAT'
            });
            continue;
          }

          if (cleanNumber.length > 15) {
            results.push({
              groupId,
              groupName: groupInfo.name,
              contactId: contactNumber,
              success: false,
              error: 'Invalid phone number format (too long)',
              errorCategory: 'INVALID_PHONE_FORMAT'
            });
            continue;
          }

          let contactId;
          // Try different formats for the contact ID
          if (cleanNumber.includes('@')) {
            contactId = cleanNumber;
          } else if (cleanNumber.startsWith('+')) {
            contactId = `${cleanNumber.substring(1)}@c.us`;
          } else {
            contactId = `${cleanNumber}@c.us`;
          }

          // Verify contact exists
          let contact;
          try {
            contact = await client.getContactById(contactId);
            if (!contact) {
              results.push({
                groupId,
                groupName: groupInfo.name,
                contactId: contactNumber,
                success: false,
                error: 'Contact not found on WhatsApp',
                errorCategory: 'CONTACT_NOT_FOUND'
              });
              continue;
            }
          } catch (contactError) {
            results.push({
              groupId,
              groupName: groupInfo.name,
              contactId: contactNumber,
              success: false,
              error: 'Contact not found or invalid number',
              errorCategory: 'CONTACT_NOT_FOUND'
            });
            continue;
          }

          // Check if this is a self-addition/removal attempt
          const isSelfOperation = contactId === client.info.wid._serialized;

          console.log(`Processing contact ${contactNumber} (${contactId}) for group ${groupInfo.name}:`);
          console.log(`- Is self operation: ${isSelfOperation}`);
          console.log(`- User has admin permissions: ${userPermissions.canAddMembers}`);
          console.log(`- Action: ${action}`);

          // For self-operations, check if user is already in the group
          if (isSelfOperation) {
            if (action === 'add') {
              // User is trying to add themselves, but they're already in the group (we verified this earlier)
              console.log(`- Self-addition detected: User is already a member`);
              results.push({
                groupId,
                groupName: groupInfo.name,
                contactId: contactNumber,
                success: false,
                error: 'You are already a member of this group',
                errorCategory: 'ALREADY_MEMBER'
              });
              continue;
            } else if (action === 'remove') {
              // User is trying to remove themselves - this is allowed regardless of admin status
              console.log(`- Self-removal detected: Allowing operation`);
              // Continue with the operation
            }
          } else {
            // For operations on other users, check admin permissions
            if (!userPermissions.canAddMembers) {
              console.log(`- Non-self operation without admin permissions: Blocking`);
              results.push({
                groupId,
                groupName: groupInfo.name,
                contactId: contactNumber,
                success: false,
                error: 'You do not have admin permissions in this group',
                errorCategory: 'INSUFFICIENT_PERMISSIONS'
              });
              continue;
            }
            console.log(`- Non-self operation with admin permissions: Proceeding`);
          }

          // Check if contact is already in group (for add operation on others)
          if (action === 'add' && !isSelfOperation) {
            try {
              const participants = await group.participants;
              const isAlreadyMember = participants.some(p => p.id._serialized === contactId);
              console.log(`- Checking if contact is already in group: ${isAlreadyMember}, Contact ID: ${JSON.stringify(participants)}`);

              if (isAlreadyMember) {
                results.push({
                  groupId,
                  groupName: groupInfo.name,
                  contactId: contactNumber,
                  success: false,
                  error: 'Contact is already a member of this group',
                  errorCategory: 'ALREADY_MEMBER'
                });
                continue;
              }
            } catch (participantError) {
              console.warn(`Could not check if contact is already in group: ${participantError.message}`);
            }
          }

          // Check if contact is NOT in group (for remove operation)
          if (action === 'remove' && !isSelfOperation) {
            try {
              const participants = await group.participants;
              const isMember = participants.some(p => p.id._serialized === contactId);

              if (!isMember) {
                results.push({
                  groupId,
                  groupName: groupInfo.name,
                  contactId: contactNumber,
                  success: false,
                  error: 'Contact is not a member of this group',
                  errorCategory: 'NOT_A_MEMBER'
                });
                continue;
              }
            } catch (participantError) {
              console.warn(`Could not check if contact is in group: ${participantError.message}`);
            }
          }

          // Perform the action
          try {
            let operationResult;

            if (action === 'add') {
              operationResult = await group.addParticipants([contactId]);
            } else if (action === 'remove') {
              operationResult = await group.removeParticipants([contactId]);
            }

            // Verify the operation actually succeeded by checking group membership
            try {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for WhatsApp to update
              const updatedParticipants = await group.participants;
              const isNowMember = updatedParticipants.some(p => p.id._serialized === contactId);

              const operationSucceeded = action === 'add' ? isNowMember : !isNowMember;

              if (!operationSucceeded) {
                // The API didn't throw an error, but the operation didn't actually work
                let errorMessage, errorCategory;

                if (action === 'add' && !isNowMember) {
                  if (isSelfOperation) {
                    errorMessage = 'You are already a member of this group';
                    errorCategory = 'ALREADY_MEMBER';
                  } else {
                    errorMessage = 'Failed to add contact to group (may already be a member or have privacy restrictions)';
                    errorCategory = 'OPERATION_FAILED';
                  }
                } else if (action === 'remove' && isNowMember) {
                  errorMessage = 'Failed to remove contact from group';
                  errorCategory = 'OPERATION_FAILED';
                }

                results.push({
                  groupId,
                  groupName: groupInfo.name,
                  contactId: contactNumber,
                  success: false,
                  error: errorMessage,
                  errorCategory
                });
                continue;
              }
            } catch (verificationError) {
              console.warn(`Could not verify operation result: ${verificationError.message}`);
              // Continue with success assumption if verification fails
            }

            results.push({
              groupId,
              groupName: groupInfo.name,
              contactId: contactNumber,
              success: true,
              message: `Successfully ${action === 'add' ? 'added to' : 'removed from'} ${groupInfo.name}`,
              errorCategory: null
            });

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));

          } catch (operationError) {
            console.error(`Error ${action}ing contact ${contactNumber} to/from group ${groupId}:`, operationError);

            let errorMessage = operationError.message;
            let errorCategory = 'OPERATION_FAILED';

            // Provide more specific error messages and categories
            if (operationError.message.includes('not authorized') || operationError.message.includes('forbidden')) {
              errorMessage = 'Not authorized to modify this group';
              errorCategory = 'INSUFFICIENT_PERMISSIONS';
            } else if (operationError.message.includes('participant')) {
              if (action === 'add') {
                errorMessage = 'Contact is already in the group';
                errorCategory = 'ALREADY_MEMBER';
              } else {
                errorMessage = 'Contact is not in the group';
                errorCategory = 'NOT_A_MEMBER';
              }
            } else if (operationError.message.includes('rate limit') || operationError.message.includes('too many requests')) {
              errorMessage = 'Rate limited. Please try again later';
              errorCategory = 'RATE_LIMITED';
            } else if (operationError.message.includes('network') || operationError.message.includes('timeout')) {
              errorMessage = 'Network error. Please check your connection';
              errorCategory = 'NETWORK_ERROR';
            } else if (operationError.message.includes('privacy')) {
              errorMessage = 'Contact privacy settings prevent adding to groups';
              errorCategory = 'PRIVACY_SETTINGS';
            }

            results.push({
              groupId,
              groupName: groupInfo.name,
              contactId: contactNumber,
              success: false,
              error: errorMessage,
              errorCategory
            });
          }

        } catch (error) {
          console.error(`Unexpected error processing contact ${contactNumber} for group ${groupId}:`, error);

          results.push({
            groupId,
            groupName: groupInfo.name,
            contactId: contactNumber,
            success: false,
            error: `Unexpected error: ${error.message}`,
            errorCategory: 'UNEXPECTED_ERROR'
          });
        }
      }
    } catch (error) {
      console.error(`Error accessing group ${groupId}:`, error);

      let errorMessage = `Group error: ${error.message}`;
      let errorCategory = 'GROUP_ACCESS_ERROR';

      if (error.message.includes('not found')) {
        errorMessage = 'Group not found or no longer accessible';
        errorCategory = 'GROUP_NOT_FOUND';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error accessing group';
        errorCategory = 'NETWORK_ERROR';
      }

      // Add error for all contacts for this group
      for (const contactNumber of contactNumbers) {
        results.push({
          groupId,
          groupName: groupInfo ? groupInfo.name : 'Unknown Group',
          contactId: contactNumber,
          success: false,
          error: errorMessage,
          errorCategory
        });
      }
    }
  }

  // Add timestamps to all results
  const timestamp = new Date().toISOString();
  results.forEach(result => {
    result.timestamp = timestamp;
    result.operation = action;
  });

  // Calculate comprehensive summary statistics
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const summary = {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    operation: action,
    timestamp: timestamp,
    byCategory: {},
    successfulByGroup: {},
    failedByGroup: {}
  };

  // Group successful operations by group
  successful.forEach(success => {
    const groupName = success.groupName || 'Unknown Group';
    if (!summary.successfulByGroup[groupName]) {
      summary.successfulByGroup[groupName] = {
        groupId: success.groupId,
        groupName: groupName,
        count: 0,
        contacts: []
      };
    }
    summary.successfulByGroup[groupName].count++;
    summary.successfulByGroup[groupName].contacts.push({
      contactId: success.contactId,
      message: success.message,
      timestamp: success.timestamp
    });
  });

  // Group failures by category with detailed breakdown
  failed.forEach(failure => {
    const category = failure.errorCategory || 'UNKNOWN';
    if (!summary.byCategory[category]) {
      summary.byCategory[category] = {
        count: 0,
        description: getCategoryDescription(category),
        actionableAdvice: getCategoryAdvice(category),
        contacts: []
      };
    }
    summary.byCategory[category].count++;
    summary.byCategory[category].contacts.push({
      contactId: failure.contactId,
      groupName: failure.groupName,
      groupId: failure.groupId,
      error: failure.error,
      timestamp: failure.timestamp
    });
  });

  // Group failures by group for easier understanding
  failed.forEach(failure => {
    const groupName = failure.groupName || 'Unknown Group';
    if (!summary.failedByGroup[groupName]) {
      summary.failedByGroup[groupName] = {
        groupId: failure.groupId,
        groupName: groupName,
        count: 0,
        contacts: []
      };
    }
    summary.failedByGroup[groupName].count++;
    summary.failedByGroup[groupName].contacts.push({
      contactId: failure.contactId,
      error: failure.error,
      errorCategory: failure.errorCategory,
      timestamp: failure.timestamp
    });
  });

  // Create detailed history for frontend display
  const detailedHistory = {
    operationSummary: {
      operation: action,
      timestamp: timestamp,
      totalProcessed: results.length,
      totalSuccessful: successful.length,
      totalFailed: failed.length,
      successRate: results.length > 0 ? Math.round((successful.length / results.length) * 100) : 0
    },
    resultsByContact: results.map(result => ({
      contactId: result.contactId,
      groupName: result.groupName,
      groupId: result.groupId,
      success: result.success,
      message: result.success ? result.message : result.error,
      category: result.errorCategory,
      timestamp: result.timestamp,
      operation: result.operation
    })),
    categoryBreakdown: summary.byCategory,
    groupBreakdown: {
      successful: summary.successfulByGroup,
      failed: summary.failedByGroup
    }
  };

  return {
    results,
    summary,
    detailedHistory
  };
};

// Helper function to get user-friendly descriptions for error categories
const getCategoryDescription = (category) => {
  const descriptions = {
    'INSUFFICIENT_PERMISSIONS': 'You do not have admin permissions in these groups',
    'GROUP_NOT_FOUND': 'Groups not found or no longer accessible',
    'CONTACT_NOT_FOUND': 'Phone numbers not found on WhatsApp',
    'INVALID_PHONE_FORMAT': 'Invalid phone number format',
    'ALREADY_MEMBER': 'Contacts already members of these groups',
    'NOT_A_MEMBER': 'You are not a member of these groups',
    'RATE_LIMITED': 'Too many requests - rate limited by WhatsApp',
    'NETWORK_ERROR': 'Network connection issues',
    'PRIVACY_SETTINGS': 'Contact privacy settings prevent group operations',
    'PERMISSION_CHECK_FAILED': 'Could not verify group permissions',
    'GROUP_ACCESS_ERROR': 'Error accessing group information',
    'OPERATION_FAILED': 'Operation failed for unknown reasons',
    'UNEXPECTED_ERROR': 'Unexpected system errors'
  };

  return descriptions[category] || 'Unknown error category';
};

// Helper function to provide actionable advice for error categories
const getCategoryAdvice = (category) => {
  const advice = {
    'INSUFFICIENT_PERMISSIONS': 'Ask a group admin to make you an admin, or ask them to add these members for you.',
    'GROUP_NOT_FOUND': 'Verify the group still exists and you have access to it. Try refreshing the group list.',
    'CONTACT_NOT_FOUND': 'Verify the phone numbers are correct and the contacts are using WhatsApp.',
    'INVALID_PHONE_FORMAT': 'Use proper phone number format with country code (e.g., +1234567890).',
    'ALREADY_MEMBER': 'These contacts are already in the group. No action needed.',
    'NOT_A_MEMBER': 'You need to be a member of the group to perform this operation.',
    'RATE_LIMITED': 'Wait a few minutes before trying again. WhatsApp limits how fast you can add members.',
    'NETWORK_ERROR': 'Check your internet connection and try again.',
    'PRIVACY_SETTINGS': 'The contact\'s privacy settings prevent them from being added to groups.',
    'PERMISSION_CHECK_FAILED': 'Try refreshing the page and attempting the operation again.',
    'GROUP_ACCESS_ERROR': 'Try refreshing the group list and selecting the group again.',
    'OPERATION_FAILED': 'Try the operation again. If it continues to fail, contact support.',
    'UNEXPECTED_ERROR': 'An unexpected error occurred. Try refreshing the page and attempting again.'
  };

  return advice[category] || 'Please try the operation again or contact support if the issue persists.';
};

// In-memory storage for campaign history
let campaignHistory = [];

const saveCampaignToHistory = (campaign) => {
  // Add to the beginning of the array to show newest first
  campaignHistory.unshift(campaign);
  
  // Keep only the last 100 campaigns to prevent memory issues
  if (campaignHistory.length > 100) {
    campaignHistory = campaignHistory.slice(0, 100);
  }
  
  return campaign;
};

const getCampaignHistory = () => {
  // Return a copy to prevent external modifications
  return [...campaignHistory];
};

module.exports = {
  processContactsFile,
  sendCampaign,
  getCampaignHistory,
  bulkManageMembers,
  saveCampaignToHistory
};
