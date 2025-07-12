const express = require('express');
const whatsappController = require('../controllers/whatsapp.controller');

const router = express.Router();

router.get('/qr-code', whatsappController.getQRCode);
router.post('/connect', whatsappController.connect);
router.get('/status', whatsappController.getStatus);
router.post('/disconnect', whatsappController.disconnect);
router.post('/logout', whatsappController.logout);
router.post('/force-logout', whatsappController.forceLogout);
router.get('/contacts', whatsappController.getContacts);
router.get('/groups', whatsappController.getGroups);
router.get('/groups/search', whatsappController.searchGroups);
router.get('/contact/:phoneNumber', whatsappController.getContactByNumber);
router.post('/send-message', whatsappController.sendMessage);
router.post('/keep-alive', whatsappController.keepAlive);
router.post('/force-reset', whatsappController.forceReset);

module.exports = router;
