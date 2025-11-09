import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import User from './models/User.js';
import Video from './models/Video.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-streaming';

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // Get total video count before deletion
    const totalVideos = await Video.countDocuments();
    console.log(`Found ${totalVideos} videos in database`);

    // Clear video files from uploads directories
    const videos = await Video.find({});
    console.log('Cleaning up video files...');
    
    for (const video of videos) {
      // Delete original video file
      if (video.filePath) {
        try {
          await fs.remove(video.filePath);
          console.log(`Deleted original file: ${video.filename}`);
        } catch (err) {
          console.warn(`Could not delete file: ${video.filePath}`, err.message);
        }
      }
      
      // Delete processed video file
      if (video.processedFilePath) {
        try {
          await fs.remove(video.processedFilePath);
          console.log(`Deleted processed file: ${video.filename}`);
        } catch (err) {
          console.warn(`Could not delete processed file: ${video.processedFilePath}`, err.message);
        }
      }

      // Delete any temporary files
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      try {
        await fs.remove(tempDir);
        console.log('Cleaned up temporary directory');
      } catch (err) {
        console.warn('Could not clean temporary directory:', err.message);
      }
    }

    // Clear all videos from database
    const deletedVideos = await Video.deleteMany({});
    console.log(`Deleted ${deletedVideos.deletedCount} videos from database`);

    // Clear all users from database
    const deletedUsers = await User.deleteMany({});
    console.log(`Deleted ${deletedUsers.deletedCount} users from database`);

    console.log('Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();

