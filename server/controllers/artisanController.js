const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

const DEFAULT_DELIVERY_BASE_FEE = 15;
const DEFAULT_DELIVERY_PER_KM_RATE = 2;

const getDeliveryRates = artisanData => ({
  deliveryBaseFee: Number.isFinite(artisanData?.deliveryBaseFee)
    ? artisanData.deliveryBaseFee
    : DEFAULT_DELIVERY_BASE_FEE,
  deliveryPerKmRate: Number.isFinite(artisanData?.deliveryPerKmRate)
    ? artisanData.deliveryPerKmRate
    : DEFAULT_DELIVERY_PER_KM_RATE,
});

exports.getDeliveryRates = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid artisan' });
  }

  const artisan = await User.findOne({ _id: req.params.id, role: 'artisan' })
    .select('artisanData.deliveryBaseFee artisanData.deliveryPerKmRate');
  if (!artisan) {
    return res.status(404).json({ success: false, message: 'Artisan not found' });
  }

  res.status(200).json({ success: true, data: getDeliveryRates(artisan.artisanData) });
});

exports.updateDeliveryRates = asyncHandler(async (req, res) => {
  const deliveryBaseFee = Number(req.body.deliveryBaseFee);
  const deliveryPerKmRate = Number(req.body.deliveryPerKmRate);

  if (
    typeof req.body.deliveryBaseFee !== 'number' ||
    req.body.deliveryBaseFee === undefined ||
    !Number.isFinite(deliveryBaseFee) ||
    deliveryBaseFee < 0 ||
    deliveryBaseFee > 100000 ||
    Math.abs(deliveryBaseFee * 100 - Math.round(deliveryBaseFee * 100)) > 1e-8
  ) {
    return res.status(400).json({ success: false, message: 'Base delivery fee must be from ₹0 to ₹100000 with up to 2 decimal places' });
  }
  if (
    typeof req.body.deliveryPerKmRate !== 'number' ||
    req.body.deliveryPerKmRate === undefined ||
    !Number.isFinite(deliveryPerKmRate) ||
    deliveryPerKmRate < 0 ||
    deliveryPerKmRate > 10000 ||
    Math.abs(deliveryPerKmRate * 100 - Math.round(deliveryPerKmRate * 100)) > 1e-8
  ) {
    return res.status(400).json({ success: false, message: 'Per-kilometre rate must be from ₹0 to ₹10000 with up to 2 decimal places' });
  }

  const artisan = await User.findOne({ _id: req.user.id, role: 'artisan' });
  if (!artisan) {
    return res.status(404).json({ success: false, message: 'Artisan account not found' });
  }

  artisan.set({
    'artisanData.deliveryBaseFee': deliveryBaseFee,
    'artisanData.deliveryPerKmRate': deliveryPerKmRate,
  });
  await artisan.save();

  res.status(200).json({ success: true, data: getDeliveryRates(artisan.artisanData) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, shopName, bio, upiId, coordinates } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedShopName = typeof shopName === 'string' ? shopName.trim() : '';
  const normalizedBio = typeof bio === 'string' ? bio.trim() : null;
  const normalizedUpiId = typeof upiId === 'string' ? upiId.trim() : '';

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters' });
  }
  if (normalizedShopName.length < 2 || normalizedShopName.length > 100) {
    return res.status(400).json({ success: false, message: 'Shop name must be between 2 and 100 characters' });
  }
  if (normalizedBio === null || (normalizedBio.length > 0 && normalizedBio.length < 10) || normalizedBio.length > 500) {
    return res.status(400).json({ success: false, message: 'Shop story must be empty or between 10 and 500 characters' });
  }
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9][A-Za-z0-9.-]*$/.test(normalizedUpiId) || normalizedUpiId.length > 100) {
    return res.status(400).json({ success: false, message: 'Enter a valid UPI ID' });
  }
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite) ||
    coordinates[0] < -180 ||
    coordinates[0] > 180 ||
    coordinates[1] < -90 ||
    coordinates[1] > 90
  ) {
    return res.status(400).json({ success: false, message: 'Set a valid shop location' });
  }

  const artisan = await User.findOne({ _id: req.user.id, role: 'artisan' });
  if (!artisan) {
    return res.status(404).json({ success: false, message: 'Artisan account not found' });
  }

  artisan.name = normalizedName;
  artisan.artisanData = artisan.artisanData || {};
  artisan.artisanData.shopName = normalizedShopName;
  artisan.artisanData.bio = normalizedBio;
  artisan.artisanData.upiId = normalizedUpiId;
  artisan.location = { type: 'Point', coordinates };
  await artisan.save();

  res.status(200).json({
    success: true,
    data: {
      id: artisan._id,
      _id: artisan._id,
      name: artisan.name,
      email: artisan.email,
      role: artisan.role,
      artisanData: artisan.artisanData,
      location: artisan.location,
    },
  });
});
