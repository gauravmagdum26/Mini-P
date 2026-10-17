const express = require('express');
const { createProduct, getProducts, getMyProducts, deleteProduct, toggleProductAvailability, updateProductStock } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, authorize('artisan'), upload.array('images', 5), createProduct);

router.route('/me')
  .get(protect, authorize('artisan'), getMyProducts);

router.route('/:id')
  .delete(protect, authorize('artisan'), deleteProduct);

router.route('/:id/availability')
  .put(protect, authorize('artisan'), toggleProductAvailability);

router.route('/:id/stock')
  .put(protect, authorize('artisan'), updateProductStock);

module.exports = router;

