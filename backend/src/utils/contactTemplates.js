const templates = {
  basic: {
    headers: ['name', 'phone', 'countryCode'],
    sample: [
      { name: 'John Doe', phone: '9876543210', countryCode: '91' },
      { name: 'Jane Smith', phone: '2345678901', countryCode: '1' },
      { name: 'Ahmed Ali', phone: '501234567', countryCode: '971' }
    ],
    description: 'Basic template with name and phone number'
  },
  detailed: {
    headers: ['name', 'phone', 'countryCode', 'email', 'group', 'notes'],
    sample: [
      { 
        name: 'John Doe',
        phone: '9876543210',
        countryCode: '91',
        email: 'john@example.com',
        group: 'VIP',
        notes: 'Preferred time: Evening'
      },
      {
        name: 'Jane Smith',
        phone: '2345678901',
        countryCode: '1',
        email: 'jane@example.com',
        group: 'Business',
        notes: 'Preferred time: Morning'
      }
    ],
    description: 'Detailed template with additional contact information'
  },
  bulk: {
    headers: ['name', 'phone', 'countryCode', 'group'],
    sample: [
      { name: 'John Doe', phone: '9876543210', countryCode: '91', group: 'Group A' },
      { name: 'Jane Smith', phone: '2345678901', countryCode: '1', group: 'Group B' },
      { name: 'Ahmed Ali', phone: '501234567', countryCode: '971', group: 'Group A' }
    ],
    description: 'Template for bulk import with grouping'
  }
};

function generateSampleFile(templateName, format = 'xlsx') {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  return {
    headers: template.headers,
    data: template.sample,
    description: template.description
  };
}

function getTemplateDescription(templateName) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  return {
    name: templateName,
    headers: template.headers,
    description: template.description,
    requiredFields: ['name', 'phone'],
    format: {
      name: 'Text, any length',
      phone: 'Numbers only, will be formatted based on country code',
      countryCode: 'Country code without + (e.g., 91 for India, 1 for US)',
      email: 'Valid email address (optional)',
      group: 'Text, for organizing contacts (optional)',
      notes: 'Any additional information (optional)'
    }
  };
}

function validateContactData(data, templateName = 'basic') {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  const errors = [];
  const requiredFields = ['name', 'phone'];

  data.forEach((row, index) => {
    // Check required fields
    for (const field of requiredFields) {
      if (!row[field]) {
        errors.push(`Row ${index + 1}: Missing required field "${field}"`);
      }
    }

    // Check for valid fields
    const validFields = new Set(template.headers);
    Object.keys(row).forEach(field => {
      if (!validFields.has(field)) {
        errors.push(`Row ${index + 1}: Invalid field "${field}"`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  templates,
  generateSampleFile,
  getTemplateDescription,
  validateContactData
};
