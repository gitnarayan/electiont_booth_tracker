import mongoose from 'mongoose';

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
});

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI must be set before connecting to MongoDB.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
  return mongoose.connection;
}

export default connectDatabase;
