const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { calculateDeliveryFee, getDistanceKm } = require('../utils/deliveryPricing');

test('artisan accounts default to a ₹15 base fee and ₹2 per kilometre', () => {
  const artisan = new User({
    name: 'Local Maker',
    email: 'maker@example.com',
    password: 'password123',
    role: 'artisan',
    artisanData: { shopName: 'Maker Shop' },
  });

  assert.equal(artisan.artisanData.deliveryBaseFee, 15);
  assert.equal(artisan.artisanData.deliveryPerKmRate, 2);
});

test('straight-line distance uses longitude/latitude and returns kilometres', () => {
  assert.equal(getDistanceKm([77.5946, 12.9716], [77.5946, 12.9716]), 0);
  assert.ok(Math.abs(getDistanceKm([0, 0], [0, 1]) - 111.195) < 0.1);
  assert.ok(Number.isFinite(getDistanceKm([0, 0], [180, 0])));
});

test('delivery charge is base fee plus the per-kilometre amount, rounded to paise', () => {
  assert.equal(calculateDeliveryFee(15, 2, 0), 15);
  assert.equal(calculateDeliveryFee(15, 2, 4.25), 23.5);
  assert.equal(calculateDeliveryFee(10, 1.337, 1.5), 12.01);
});
