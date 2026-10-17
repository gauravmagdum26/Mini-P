const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
connectDB();

// Route files
const auth = require('./routes/authRoutes');
const artisans = require('./routes/artisanRoutes');
const products = require('./routes/productRoutes');
const orders = require('./routes/orderRoutes');

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Mount routers
app.use('/api/auth', auth);
app.use('/api/artisans', artisans);
app.use('/api/products', products);
app.use('/api/orders', orders);

// Error handler middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
