const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Product = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const applyChanges = process.argv.includes('--apply');

const initializeProductStock = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured');
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    const supportsTransactions = Boolean(
      (hello.setName || hello.msg === 'isdbgrid') && hello.logicalSessionTimeoutMinutes !== undefined
    );
    console.log(`MongoDB transactions supported: ${supportsTransactions}`);

    const filter = { stockQuantity: { $exists: false } };
    const productsToUpdate = await Product.countDocuments(filter);

    console.log(`Products missing stockQuantity: ${productsToUpdate}`);
    if (!applyChanges) {
      console.log('Dry run only. Re-run with --apply to set these products to stock 0.');
      return;
    }

    const result = await Product.updateMany(filter, { $set: { stockQuantity: 0 } });
    console.log(`Products initialized to stock 0: ${result.modifiedCount}`);
  } finally {
    await mongoose.disconnect();
  }
};

initializeProductStock().catch(error => {
  console.error(`Stock migration failed: ${error.message}`);
  process.exitCode = 1;
});
