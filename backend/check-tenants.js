import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Video from './models/Video.js';

dotenv.config();

async function checkTenants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-streaming');
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('-password');
    
    console.log('👥 USERS IN DATABASE:');
    console.log('═'.repeat(80));
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database\n');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.role})`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Tenant ID: ${user.tenantId}`);
        console.log(`   User ID: ${user._id}`);
        console.log('─'.repeat(80));
      });
    }

    // Get all videos
    const videos = await Video.find({}).populate('uploadedBy', 'username email role');
    
    console.log('\n🎬 VIDEOS IN DATABASE:');
    console.log('═'.repeat(80));
    
    if (videos.length === 0) {
      console.log('⚠️  No videos found in database\n');
    } else {
      videos.forEach((video, index) => {
        console.log(`${index + 1}. ${video.originalName}`);
        console.log(`   Uploaded by: ${video.uploadedBy?.username} (${video.uploadedBy?.role})`);
        console.log(`   Tenant ID: ${video.tenantId}`);
        console.log(`   Status: ${video.status}`);
        console.log(`   Sensitivity: ${video.sensitivityStatus}`);
        console.log('─'.repeat(80));
      });
    }

    // Check for tenant mismatches
    console.log('\n🔍 TENANT ANALYSIS:');
    console.log('═'.repeat(80));
    
    const tenantGroups = {};
    users.forEach(user => {
      if (!tenantGroups[user.tenantId]) {
        tenantGroups[user.tenantId] = [];
      }
      tenantGroups[user.tenantId].push(user);
    });

    const tenantCount = Object.keys(tenantGroups).length;
    
    if (tenantCount === 0) {
      console.log('⚠️  No tenants found');
    } else if (tenantCount === 1) {
      console.log('✅ All users belong to the SAME tenant (correct setup)');
      const tenantId = Object.keys(tenantGroups)[0];
      console.log(`   Tenant ID: ${tenantId}`);
      console.log(`   Users in this tenant: ${tenantGroups[tenantId].length}`);
    } else {
      console.log('⚠️  WARNING: Users are in DIFFERENT tenants!');
      console.log(`   Number of different tenants: ${tenantCount}`);
      console.log('\n   Tenant breakdown:');
      Object.entries(tenantGroups).forEach(([tenantId, users]) => {
        console.log(`   - ${tenantId}: ${users.map(u => u.username).join(', ')}`);
      });
      console.log('\n   ❌ This is why users cannot see each other\'s videos!');
      console.log('   💡 Solution: Run "npm run reset-db" to create users with same tenant');
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTenants();
