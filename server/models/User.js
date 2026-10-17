const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      maxlength: 128,
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ['buyer', 'artisan'],
      default: 'buyer',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        index: '2dsphere' // Create a special geospatial index
      }
    },
    artisanData: {
      shopName: String,
      bio: String,
      story: String,
      upiId: String,
      deliveryBaseFee: {
        type: Number,
        min: 0,
        max: 100000,
        default: 15,
      },
      deliveryPerKmRate: {
        type: Number,
        min: 0,
        max: 10000,
        default: 2,
      },
    }
  },
  { timestamps: true }
);

// Encrypt password using bcryptjs
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
