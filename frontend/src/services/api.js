export const campaignService = {
  uploadContacts: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/campaign/upload-contacts', {
      method: 'POST',
      body: formData
    });

    return response.json();
  },

  sendCampaign: async (name, message, contacts, file) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('message', message);

    if (contacts && contacts.length > 0) {
      formData.append('contacts', JSON.stringify(contacts));
    }

    if (file) {
      formData.append('file', file);
    }

    const response = await fetch('/api/campaign/send', {
      method: 'POST',
      body: formData
    });

    return response.json();
  }
};
