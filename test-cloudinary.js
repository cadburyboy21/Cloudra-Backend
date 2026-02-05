const cloudinary = require('./src/config/cloudinary');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// The SDK will automatically use CLOUDINARY_URL from process.env if present.
// We'll log the config to verify it picked it up.
const config = cloudinary.config();

const testCloudinary = async () => {
    console.log('--- Cloudinary Connectivity Test ---');
    console.log(`Cloud Name: ${config.cloud_name || 'Not found'}`);

    try {
        console.log('\n1. Testing Connectivity (Account Info)...');
        const info = await cloudinary.api.usage();
        console.log('✅ Successfully connected to Cloudinary!');
        console.log(`Plan: ${info.plan}`);

        console.log('\n2. Testing Upload...');
        const res = await cloudinary.uploader.upload('https://cloudinary-devs.github.io/res/cloudinary-tag.png', {
            folder: 'cloudra-test'
        });
        console.log(`✅ Successfully uploaded! Public ID: ${res.public_id}`);

        console.log('\n3. Testing Delete...');
        await cloudinary.uploader.destroy(res.public_id);
        console.log('✅ Successfully deleted the test file.');

        console.log('\n🎉 Cloudinary Configuration is fully working!');

    } catch (err) {
        console.error('\n❌ Cloudinary Test Failed:');
        console.error(err.message);
    }
};

testCloudinary();
