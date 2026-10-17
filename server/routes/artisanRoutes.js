const express = require('express');
const { getDeliveryRates, updateDeliveryRates, updateProfile } = require('../controllers/artisanController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/:id/fulfillment', getDeliveryRates);
router.put('/me/profile', protect, authorize('artisan'), updateProfile);
router.put('/me/delivery-rates', protect, authorize('artisan'), updateDeliveryRates);

module.exports = router;
