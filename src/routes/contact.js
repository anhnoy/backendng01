const express = require('express');
const router = express.Router();
const c = require('../controllers/contactController');

// Aggregate content (legacy)
router.get('/content', c.getContent);
router.put('/content', c.updateContent);

// Settings aggregate (FE contract)
router.get('/settings', c.getSettings);
router.patch('/settings', c.patchSettings);

// Hero
router.get('/hero', c.getHero);
router.put('/hero', c.putHero);

// Phones
router.get('/phones', c.listPhones);
router.post('/phones', c.createPhone);
router.patch('/phones/:id', c.updatePhone);
router.delete('/phones/:id', c.deletePhone);
router.patch('/phones/reorder', c.reorderPhones);

// Emails
router.get('/emails', c.listEmails);
router.post('/emails', c.createEmail);
router.patch('/emails/:id', c.updateEmail);
router.delete('/emails/:id', c.deleteEmail);
router.patch('/emails/reorder', c.reorderEmails);

// Hours
router.get('/hours', c.listHours);
router.post('/hours', c.createHour);
router.patch('/hours/:id', c.updateHour);
router.delete('/hours/:id', c.deleteHour);
router.patch('/hours/reorder', c.reorderHours);

// Socials
router.get('/socials', c.listSocials);
router.post('/socials', c.createSocial);
router.patch('/socials/:id', c.updateSocial);
router.delete('/socials/:id', c.deleteSocial);
router.patch('/socials/reorder', c.reorderSocials);
// Aliases for FE naming
router.get('/social-links', c.listSocials);
router.post('/social-links', c.createSocial);
router.patch('/social-links/:id', c.updateSocial);
router.delete('/social-links/:id', c.deleteSocial);
router.patch('/social-links/reorder', c.reorderSocials);

// Offices
router.get('/offices', c.listOffices);
router.post('/offices', c.createOffice);
router.patch('/offices/:id', c.updateOffice);
router.delete('/offices/:id', c.deleteOffice);
router.patch('/offices/reorder', c.reorderOffices);

// Copyright
router.get('/copyright', c.getCopyright);
router.put('/copyright', c.putCopyright);

// Quick FAQ
router.get('/quick-faq', c.listQuickFaq);
router.post('/quick-faq', c.createQuickFaq);
router.patch('/quick-faq/:id', c.updateQuickFaq);
router.delete('/quick-faq/:id', c.deleteQuickFaq);
router.patch('/quick-faq/reorder', c.reorderQuickFaq);
// Aliases for FE naming
router.get('/faq-quick', c.listQuickFaq);
router.post('/faq-quick', c.createQuickFaq);
router.patch('/faq-quick/:id', c.updateQuickFaq);
router.delete('/faq-quick/:id', c.deleteQuickFaq);
router.patch('/faq-quick/reorder', c.reorderQuickFaq);

// Messages
router.post('/messages', c.createMessage);

module.exports = router;
