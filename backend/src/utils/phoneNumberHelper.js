// Common country codes and their validation rules
const COUNTRY_CODES = {
  '1': {    // US/Canada
    name: 'US/Canada',
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9][0-9]{9}$/
  },
  '91': {   // India
    name: 'India',
    minLength: 10,
    maxLength: 10,
    pattern: /^[6-9][0-9]{9}$/
  },
  '971': {  // UAE
    name: 'UAE',
    minLength: 9,
    maxLength: 9,
    pattern: /^5[0-9]{8}$/
  }
};

function detectCountryFromNumber(number) {
  // Remove any formatting
  const clean = number.replace(/[^0-9]/g, '');
  
  // Check if number already has a country code
  for (const [code, rules] of Object.entries(COUNTRY_CODES)) {
    if (clean.startsWith(code)) {
      const localNumber = clean.substring(code.length);
      if (rules.pattern.test(localNumber)) {
        return code;
      }
    }
  }

  // If no country code, try to detect from pattern
  if (clean.length === 10) {
    if (/^[6-9]/.test(clean)) return '91';   // India
    if (/^5/.test(clean)) return '971';       // UAE
    if (/^[2-9]/.test(clean)) return '1';     // US/Canada
  }

  return null;
}

function formatPhoneNumber(number, countryCode = null) {
  // Remove all non-numeric characters
  let cleaned = number.replace(/[^0-9]/g, '');
  
  // Remove leading '+' if present
  if (number.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If country code is provided, ensure number doesn't already have it
  if (countryCode) {
    const cleanCountryCode = countryCode.replace(/[^0-9]/g, '');
    if (!cleaned.startsWith(cleanCountryCode)) {
      cleaned = cleanCountryCode + cleaned;
    }
  } else {
    // Try to detect country code
    const detectedCode = detectCountryFromNumber(cleaned);
    if (detectedCode && !cleaned.startsWith(detectedCode)) {
      cleaned = detectedCode + cleaned;
    }
  }

  return cleaned;
}

function validatePhoneNumber(number) {
  const cleaned = number.replace(/[^0-9]/g, '');
  
  // Check against known country codes
  for (const [code, rules] of Object.entries(COUNTRY_CODES)) {
    if (cleaned.startsWith(code)) {
      const localNumber = cleaned.substring(code.length);
      if (rules.pattern.test(localNumber)) {
        return true;
      }
    }
  }

  return false;
}

module.exports = {
  formatPhoneNumber,
  validatePhoneNumber,
  detectCountryFromNumber,
  COUNTRY_CODES
};
