const { Client, LocalAuth } = require('whatsapp-web.js');

const createWhatsAppClient = () => {
  return new Client({
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-campaign',
      dataPath: './whatsapp-auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--disable-default-apps',
        '--window-size=1280,720'
      ],
      defaultViewport: {
        width: 1280,
        height: 720
      },
      handleSIGINT: true,
      handleSIGTERM: true,
      handleSIGHUP: true
    },
    qrMaxRetries: 3,
    authTimeoutMs: 120000,
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 120000
  });
};

module.exports = { createWhatsAppClient };
