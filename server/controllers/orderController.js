const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const { calculateDeliveryFee, getDistanceKm } = require('../utils/deliveryPricing');

const DEFAULT_DELIVERY_BASE_FEE = 15;
const DEFAULT_DELIVERY_PER_KM_RATE = 2;

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Buyer
exports.createOrder = asyncHandler(async (req, res, next) => {
  const {
    artisan,
    products,
    fulfillmentMethod = 'Self-Pickup',
    deliveryAddress,
    paymentMethod,
    expectedDeliveryFee,
  } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ success: false, message: 'No order items' });
  }

  if (!['Self-Pickup', 'Delivery'].includes(fulfillmentMethod)) {
    return res.status(400).json({ success: false, message: 'Invalid fulfillment method' });
  }

  if (!['UPI QR', 'Cash'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

  if (!mongoose.isValidObjectId(artisan)) {
    return res.status(400).json({ success: false, message: 'Invalid artisan' });
  }
  if (expectedDeliveryFee !== undefined && (!Number.isFinite(expectedDeliveryFee) || expectedDeliveryFee < 0)) {
    return res.status(400).json({ success: false, message: 'Invalid expected delivery fee' });
  }
  let normalizedAddress;
  if (fulfillmentMethod === 'Delivery') {
    const fields = ['street', 'city', 'state', 'postalCode', 'phone'];
    if (!deliveryAddress || fields.some(field => typeof deliveryAddress[field] !== 'string' || !deliveryAddress[field].trim())) {
      return res.status(400).json({ success: false, message: 'Complete delivery address and phone are required' });
    }

    normalizedAddress = Object.fromEntries(fields.map(field => [field, deliveryAddress[field].trim()]));
    if (normalizedAddress.street.length < 5 || normalizedAddress.street.length > 160 ||
        normalizedAddress.city.length < 2 || normalizedAddress.city.length > 80 ||
        normalizedAddress.state.length < 2 || normalizedAddress.state.length > 80) {
      return res.status(400).json({ success: false, message: 'Check the street, city, and state lengths' });
    }
    if (!/^[0-9]{10}$/.test(normalizedAddress.phone)) {
      return res.status(400).json({ success: false, message: 'Delivery phone number must contain exactly 10 digits' });
    }
    if (!/^[0-9]{6}$/.test(normalizedAddress.postalCode)) {
      return res.status(400).json({ success: false, message: 'Enter a valid six-digit PIN code' });
    }

    const coordinates = deliveryAddress.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'Choose a delivery point on the map' });
    }
    const [longitude, latitude] = coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({ success: false, message: 'The selected map location is invalid' });
    }
    normalizedAddress.coordinates = coordinates;
  }

  const invalidItem = products.some(item =>
    !item || !mongoose.isValidObjectId(item.product) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10
  );
  if (invalidItem) {
    return res.status(400).json({ success: false, message: 'Order items or quantities are invalid' });
  }

  const quantitiesByProduct = new Map();
  for (const item of products) {
    const productId = item.product.toString();
    const totalQuantity = (quantitiesByProduct.get(productId) || 0) + item.quantity;
    if (totalQuantity > 10) {
      return res.status(400).json({ success: false, message: 'Combined quantity for a product cannot exceed 10' });
    }
    quantitiesByProduct.set(productId, totalQuantity);
  }

  let deliveryFee = 0;
  let deliveryDistanceKm;
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      if (fulfillmentMethod === 'Delivery') {
        const artisanRecord = await User.findOne({ _id: artisan, role: 'artisan' }).session(session);
        const shopCoordinates = artisanRecord?.location?.coordinates;
        if (!Array.isArray(shopCoordinates) || shopCoordinates.length !== 2 || !shopCoordinates.every(Number.isFinite)) {
          const error = new Error('This artisan does not have a valid shop location for delivery');
          error.statusCode = 400;
          throw error;
        }

        const baseFee = Number.isFinite(artisanRecord.artisanData?.deliveryBaseFee)
          ? artisanRecord.artisanData.deliveryBaseFee
          : DEFAULT_DELIVERY_BASE_FEE;
        const perKmRate = Number.isFinite(artisanRecord.artisanData?.deliveryPerKmRate)
          ? artisanRecord.artisanData.deliveryPerKmRate
          : DEFAULT_DELIVERY_PER_KM_RATE;
        deliveryDistanceKm = getDistanceKm(shopCoordinates, normalizedAddress.coordinates);
        deliveryFee = calculateDeliveryFee(baseFee, perKmRate, deliveryDistanceKm);

        if (expectedDeliveryFee !== undefined && expectedDeliveryFee !== deliveryFee) {
          const error = new Error(`Delivery fee changed to ₹${deliveryFee.toFixed(2)}. Review the total before placing your order.`);
          error.statusCode = 409;
          throw error;
        }
      }

      const productRecords = await Product.find({ _id: { $in: [...quantitiesByProduct.keys()] } }).session(session);
      const productById = new Map(productRecords.map(product => [product._id.toString(), product]));
      if (productById.size !== quantitiesByProduct.size) {
        const error = new Error('One or more products were not found');
        error.statusCode = 400;
        throw error;
      }

      const orderProducts = [];
      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productById.get(productId);
        if (!product || product.isAvailable === false || product.artisan.toString() !== artisan) {
          const error = new Error('A product is unavailable or does not belong to this artisan');
          error.statusCode = 400;
          throw error;
        }
        const result = await Product.updateOne(
          { _id: product._id, isAvailable: { $ne: false }, stockQuantity: { $gte: quantity } },
          { $inc: { stockQuantity: -quantity } },
          { session }
        );
        if (result.modifiedCount !== 1) {
          const error = new Error(`${product.name} does not have enough stock`);
          error.statusCode = 409;
          throw error;
        }
        orderProducts.push({ product: product._id, quantity, price: product.price });
      }

      const subtotal = orderProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
      [order] = await Order.create([{
        buyer: req.user.id,
        artisan,
        products: orderProducts,
        totalAmount: subtotal + deliveryFee,
        deliveryFee,
        ...(fulfillmentMethod === 'Delivery' && { deliveryDistanceKm }),
        stockReserved: true,
        paymentMethod,
        fulfillmentMethod,
        deliveryAddress: normalizedAddress,
        status: 'Pending',
        paymentStatus: 'Pending'
      }], { session });
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.code === 20 || error.codeName === 'IllegalOperation') {
      return res.status(503).json({ success: false, message: 'Stock reservation requires a transaction-capable MongoDB deployment' });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  res.status(201).json({ success: true, data: order });
});

// @desc    Get logged in user orders (Buyer)
// @route   GET /api/orders/myorders
// @access  Private/Buyer
exports.getMyOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ buyer: req.user.id }).populate('artisan', 'name artisanData location').populate('products.product', 'name images price');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Get orders for artisan shop
// @route   GET /api/orders/shop
// @access  Private/Artisan
exports.getShopOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ artisan: req.user.id }).populate('buyer', 'name email').populate('products.product', 'name images price');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Cancel an owned pending order
// @route   PUT /api/orders/:id/cancel
// @access  Private/Buyer
exports.cancelOrder = asyncHandler(async (req, res) => {
  const eligibleOrder = {
    _id: req.params.id,
    buyer: req.user.id,
    status: 'Pending',
    paymentMethod: 'Cash',
    fulfillmentMethod: 'Delivery',
  };
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const orderToCancel = await Order.findOne(eligibleOrder).session(session);
      if (!orderToCancel) return;

      const reservationFilter = orderToCancel.stockReserved
        ? { stockReserved: true }
        : { $or: [{ stockReserved: false }, { stockReserved: { $exists: false } }] };
      order = await Order.findOneAndUpdate(
        { ...eligibleOrder, ...reservationFilter },
        { $set: { status: 'Cancelled', stockReserved: false } },
        { new: true, runValidators: true, session }
      );
      if (!order) return;

      if (orderToCancel.stockReserved) {
        for (const item of orderToCancel.products) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stockQuantity: item.quantity } },
            { session }
          );
        }
      }
    });
  } catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') {
      return res.status(503).json({ success: false, message: 'Cancellation stock restoration requires a transaction-capable MongoDB deployment' });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (order) {
    return res.status(200).json({ success: true, data: order });
  }

  const ownedOrder = await Order.findOne({ _id: req.params.id, buyer: req.user.id }).select('status paymentMethod fulfillmentMethod');
  if (!ownedOrder) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  if (ownedOrder.paymentMethod !== 'Cash' || ownedOrder.fulfillmentMethod !== 'Delivery') {
    return res.status(403).json({ success: false, message: 'Only Cash on Delivery orders can be cancelled' });
  }
  if (ownedOrder.status !== 'Pending') {
    return res.status(409).json({ success: false, message: 'Only pending orders can be cancelled' });
  }
  return res.status(409).json({ success: false, message: 'The order changed before it could be cancelled' });
});

// @desc    Advance order status for its fulfillment method
// @route   PUT /api/orders/:id/status
// @access  Private/Artisan
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Make sure user owns this shop
  if (order.artisan.toString() !== req.user.id) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const nextStatuses = order.fulfillmentMethod === 'Delivery'
    ? { Pending: 'Out for Delivery', 'Out for Delivery': 'Delivered' }
    : { Pending: 'Ready for Pickup', 'Ready for Pickup': 'Completed' };
  if (req.body.status !== nextStatuses[order.status]) {
    return res.status(400).json({ success: false, message: 'Invalid order status transition' });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      artisan: req.user.id,
      status: order.status,
    },
    { $set: { status: req.body.status } },
    { new: true, runValidators: true }
  );
  if (!updatedOrder) {
    return res.status(409).json({ success: false, message: 'The order changed before its status could be updated' });
  }

  res.status(200).json({ success: true, data: updatedOrder });
});


// @desc    Delete completed order
// @route   DELETE /api/orders/:id
// @access  Private/Artisan
exports.deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Make sure user owns this shop
  if (order.artisan.toString() !== req.user.id) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  // Make sure order is terminal
  if (!['Completed', 'Delivered'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Only completed or delivered orders can be deleted' });
  }

  await order.deleteOne();

  res.status(200).json({ success: true, data: {} });
});
