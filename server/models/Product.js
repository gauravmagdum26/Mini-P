const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    artisan: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [1, 'Price must be at least 1'],
      max: [10000000, 'Price cannot exceed 10000000'],
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
      max: [1000000, 'Stock cannot exceed 1000000'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number',
      },
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    tags: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    // Adding location directly on product helps with $geoNear aggregation
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      }
    }
  },
  { timestamps: true }
);

productSchema.path('images').validate(images => Array.isArray(images) && images.length > 0 && images.length <= 5, 'Upload between 1 and 5 product images');

module.exports = mongoose.model('Product', productSchema);

