import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri, { dbName: undefined });
  console.log('MongoDB connected');
  // console.log('MongoDB URI:', uri);
  // console.log('Mongoose DB Name:', mongoose.connection.name);
};

export default connectDB;
