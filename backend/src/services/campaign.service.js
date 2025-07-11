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

  // Process each group
  for (const groupId of groupIds) {
    try {
      const group = await client.getChatById(groupId);

      if (!group || !group.isGroup) {
        results.push({
          groupId,
          success: false,
          error: 'Group not found or invalid'
        });
        continue;
      }

      // Process each contact number for this group
      for (const contactNumber of contactNumbers) {
        try {
          // Clean and format the phone number
          const cleanNumber = contactNumber.replace(/[^\d+]/g, '');
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
          try {
            const contact = await client.getContactById(contactId);
            if (!contact) {
              results.push({
                groupId,
                contactId: contactNumber,
                success: false,
                error: 'Contact not found'
              });
              continue;
            }
          } catch (contactError) {
            results.push({
              groupId,
              contactId: contactNumber,
              success: false,
              error: 'Contact not found or invalid number'
            });
            continue;
          }

          // Perform the action
          if (action === 'add') {
            await group.addParticipants([contactId]);
          } else if (action === 'remove') {
            await group.removeParticipants([contactId]);
          }

          results.push({
            groupId,
            contactId: contactNumber,
            success: true,
            message: `Successfully ${action === 'add' ? 'added to' : 'removed from'} group`
          });

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
          console.error(`Error ${action}ing contact ${contactNumber} to/from group ${groupId}:`, error);

          let errorMessage = error.message;

          // Provide more specific error messages
          if (error.message.includes('not authorized')) {
            errorMessage = 'Not authorized to modify this group';
          } else if (error.message.includes('participant')) {
            errorMessage = action === 'add' ? 'Contact is already in the group' : 'Contact is not in the group';
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate limited. Please try again later';
          }

          results.push({
            groupId,
            contactId: contactNumber,
            success: false,
            error: errorMessage
          });
        }
      }
    } catch (error) {
      console.error(`Error accessing group ${groupId}:`, error);

      // Add error for all contacts for this group
      for (const contactNumber of contactNumbers) {
        results.push({
          groupId,
          contactId: contactNumber,
          success: false,
          error: `Group error: ${error.message}`
        });
      }
    }
  }

  return results;
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
