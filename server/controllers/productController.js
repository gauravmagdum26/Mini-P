const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Artisan
exports.createProduct = asyncHandler(async (req, res, next) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const price = Number(req.body.price);
  const stockQuantity = req.body.stockQuantity === undefined ? 0 : Number(req.body.stockQuantity);
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ success: false, message: 'Product name must be between 2 and 100 characters' });
  }
  if (description.length < 10 || description.length > 2000) {
    return res.status(400).json({ success: false, message: 'Description must be between 10 and 2000 characters' });
  }
  if (!Number.isFinite(price) || price < 1 || price > 10000000 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-8) {
    return res.status(400).json({ success: false, message: 'Price must be between ₹1 and ₹10000000 with up to 2 decimal places' });
  }
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1000000) {
    return res.status(400).json({ success: false, message: 'Stock must be a whole number between 0 and 1000000' });
  }
  if (!Array.isArray(req.files) || req.files.length < 1 || req.files.length > 5) {
    return res.status(400).json({ success: false, message: 'Upload between 1 and 5 product images' });
  }

  const rawTags = req.body['tags[]'] ?? req.body.tags ?? [];
  const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
  if (tags.length > 10 || tags.some(tag => typeof tag !== 'string' || tag.trim().length > 30)) {
    return res.status(400).json({ success: false, message: 'Use at most 10 tags, each no longer than 30 characters' });
  }

  const productData = {
    artisan: req.user.id,
    name,
    description,
    price,
    stockQuantity,
    tags: tags.map(tag => tag.trim()).filter(Boolean),
    location: req.user.location,
    images: req.files.map(file => ({ url: file.path, public_id: file.filename })),
  };

  const product = await Product.create(productData);
  res.status(201).json({ success: true, data: product });
});

// @desc    Get all products (with optional geospatial search)
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
  const { lng, lat } = req.query;

  if (lng && lat) {
    // Geospatial search using $geoNear aggregation
    const products = await Product.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: 'distance',
          maxDistance: 50000,
          spherical: true,
          query: { isAvailable: { $ne: false } } // Handle both missing and true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanDetails'
        }
      },
      {
        $unwind: '$artisanDetails'
      }
    ]);
    return res.status(200).json({ success: true, count: products.length, data: products });
  }

  // Standard fetch if no coordinates
  const products = await Product.find({ isAvailable: { $ne: false } }).populate({
    path: 'artisan',
    select: 'name artisanData location'
  });
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Get products by current artisan
// @route   GET /api/products/me
// @access  Private/Artisan
exports.getMyProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ artisan: req.user.id });
  res.status(200).json({ success: true, count: products.length, data: products });
});


// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Artisan
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Make sure user is product owner
  if (product.artisan.toString() !== req.user.id) {
    return res.status(401).json({ success: false, message: 'Not authorized to delete this product' });
  }

  await product.deleteOne();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Toggle product availability
// @route   PUT /api/products/:id/availability
// @access  Private/Artisan
exports.toggleProductAvailability = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Make sure user is product owner
  if (product.artisan.toString() !== req.user.id) {
    return res.status(401).json({ success: false, message: 'Not authorized to update this product' });
  }

  product.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : !product.isAvailable;
  await product.save();

  res.status(200).json({ success: true, data: product });
});

// @desc    Update product stock
// @route   PUT /api/products/:id/stock
// @access  Private/Artisan
exports.updateProductStock = asyncHandler(async (req, res) => {
  const stockQuantity = Number(req.body.stockQuantity);
  if (req.body.stockQuantity === '' || !Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1000000) {
    return res.status(400).json({ success: false, message: 'Stock must be a whole number between 0 and 1000000' });
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, artisan: req.user.id },
    { $set: { stockQuantity } },
    { new: true, runValidators: true }
  );
  if (!product) {
    const exists = await Product.exists({ _id: req.params.id });
    return res.status(exists ? 403 : 404).json({ success: false, message: exists ? 'Not authorized to update this product' : 'Product not found' });
  }

  res.status(200).json({ success: true, data: product });
});
