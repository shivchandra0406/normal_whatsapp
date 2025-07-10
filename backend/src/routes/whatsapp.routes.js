const express = require('express');
const whatsappController = require('../controllers/whatsapp.controller');

const router = express.Router();

router.get('/qr-code', whatsappController.getQRCode);
router.post('/connect', whatsappController.connect);
router.get('/status', whatsappController.getStatus);
router.post('/disconnect', whatsappController.disconnect);
router.get('/contacts', whatsappController.getContacts);
router.get('/groups', whatsappController.getGroups);
router.post('/send-message', whatsappController.sendMessage);

module.exports = router;
