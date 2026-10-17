const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        }
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    deliveryDistanceKm: {
      type: Number,
      min: 0,
    },
    stockReserved: {
      type: Boolean,
      required: true,
      default: false,
    },
    fulfillmentMethod: {
      type: String,
      enum: ['Self-Pickup', 'Delivery'],
      default: 'Self-Pickup',
      required: true,
    },
    deliveryAddress: {
      street: {
        type: String,
        trim: true,
        required: function () { return this.fulfillmentMethod === 'Delivery'; },
      },
      city: {
        type: String,
        trim: true,
        required: function () { return this.fulfillmentMethod === 'Delivery'; },
      },
      state: {
        type: String,
        trim: true,
        required: function () { return this.fulfillmentMethod === 'Delivery'; },
      },
      postalCode: {
        type: String,
        trim: true,
        match: [/^[0-9]{6}$/, 'Enter a valid PIN code'],
        required: function () { return this.fulfillmentMethod === 'Delivery'; },
      },
      phone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, 'Phone number must contain exactly 10 digits'],
        required: function () { return this.fulfillmentMethod === 'Delivery'; },
      },
      coordinates: {
        type: [Number],
        default: undefined,
        required: function () { return this.fulfillmentMethod === 'Delivery'; },
        validate: {
          validator: value => !value || (value.length === 2 && value.every(Number.isFinite)),
          message: 'Choose a delivery point on the map',
        },
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI QR', 'Cash'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
