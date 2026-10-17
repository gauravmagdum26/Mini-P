const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

const artisans = [
  {
    name: 'Sophia Miller',
    email: 'sophia@example.com',
    password: 'password123',
    role: 'artisan',
    location: {
      type: 'Point',
      coordinates: [74.2433, 16.7050] // [lng, lat] for Kolhapur area
    },
    artisanData: {
      shopName: "Sophia's Ceramics",
      bio: "Local potter crafting small-batch stoneware.",
      story: "I started pottery 5 years ago in my garage...",
      upiId: "sophia@upi"
    }
  },
  {
    name: 'Rahul Tailors',
    email: 'rahul@example.com',
    password: 'password123',
    role: 'artisan',
    location: {
      type: 'Point',
      coordinates: [74.2255, 16.7112]
    },
    artisanData: {
      shopName: "Noble Thread Tailors",
      bio: "Bespoke tailoring and fabric arts.",
      story: "Third-generation tailor serving the community.",
      upiId: "rahultailors@upi"
    }
  },
  {
    name: 'Greenery Co',
    email: 'greenery@example.com',
    password: 'password123',
    role: 'artisan',
    location: {
      type: 'Point',
      coordinates: [74.2550, 16.6850]
    },
    artisanData: {
      shopName: "The Greenery Flower Co.",
      bio: "Eco-friendly, seasonally sourced wildflower bouquets.",
      story: "We grow everything locally using organic compost.",
      upiId: "greeneryco@upi"
    }
  }
];

const seedData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();

    console.log('Old Data Destroyed...');

    const createdArtisans = await User.create(artisans);
    console.log('Artisans Created...');

    const products = [
      {
        artisan: createdArtisans[0]._id, // Sophia
        name: "Handcrafted Ceramic Mug",
        description: "A beautiful, sturdy mug for your morning coffee.",
        price: 450,
        stockQuantity: 20,
        stockQuantity: 20,
        images: [{ url: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c", public_id: "placeholder" }],
        tags: ["Ceramic", "Mug", "Handmade"],
        location: createdArtisans[0].location
      },
      {
        artisan: createdArtisans[0]._id, // Sophia
        name: "Stoneware Dinner Plate",
        description: "Minimalist grey dinner plate.",
        price: 800,
        stockQuantity: 12,
        stockQuantity: 12,
        images: [{ url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa", public_id: "placeholder" }],
        tags: ["Ceramic", "Plate", "Dining"],
        location: createdArtisans[0].location
      },
      {
        artisan: createdArtisans[1]._id, // Rahul
        name: "Custom Cotton Shirt",
        description: "Tailored to fit, pure cotton fabric.",
        price: 1200,
        stockQuantity: 8,
        stockQuantity: 8,
        images: [{ url: "https://images.unsplash.com/photo-1540932239986-30128078f3c5", public_id: "placeholder" }],
        tags: ["Fashion", "Tailored", "Cotton"],
        location: createdArtisans[1].location
      },
      {
        artisan: createdArtisans[2]._id, // Greenery
        name: "Wildflower Bouquet",
        description: "Freshly picked local wildflowers.",
        price: 350,
        stockQuantity: 15,
        stockQuantity: 15,
        images: [{ url: "https://images.unsplash.com/photo-1485955900006-10f4d324d411", public_id: "placeholder" }],
        tags: ["Flowers", "Eco-friendly", "Gift"],
        location: createdArtisans[2].location
      },
      {
        artisan: createdArtisans[2]._id, // Greenery
        name: "Potted Succulent",
        description: "Low maintenance indoor plant.",
        price: 250,
        stockQuantity: 18,
        stockQuantity: 18,
        images: [{ url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa", public_id: "placeholder" }],
        tags: ["Plant", "Indoor", "Succulent"],
        location: createdArtisans[2].location
      }
    ];

    await Product.create(products);
    console.log('Products Created...');

    console.log('Data Imported successfully!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();

