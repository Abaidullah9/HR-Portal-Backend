import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI: string = `${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/HR-DB'}${process.env.MONGO_URI?.includes('?') ? '&' : '?'}retryWrites=false`;
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;