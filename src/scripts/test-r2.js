const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const testR2 = async () => {
    console.log('--- Cloudflare R2 Connectivity Test ---');
    console.log(`Account ID: ${process.env.R2_ACCOUNT_ID}`);
    console.log(`Bucket Name: ${process.env.R2_BUCKET_NAME}`);

    try {
        console.log('\n1. Testing Connectivity (List Buckets)...');
        const buckets = await r2.send(new ListBucketsCommand({}));
        console.log('✅ Successfully connected to R2!');
        const bucketExists = buckets.Buckets.some(b => b.Name === process.env.R2_BUCKET_NAME);

        if (!bucketExists) {
            console.error(`❌ Bucket "${process.env.R2_BUCKET_NAME}" not found in your account.`);
            console.log('Available buckets:', buckets.Buckets.map(b => b.Name).join(', '));
            return;
        }
        console.log(`✅ Bucket "${process.env.R2_BUCKET_NAME}" exists.`);

        console.log('\n2. Testing Write Access (Upload Test File)...');
        const testKey = `test-connection-${Date.now()}.txt`;
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: testKey,
            Body: 'Hello from Cloudra R2 Test Script',
            ContentType: 'text/plain'
        }));
        console.log(`✅ Successfully uploaded: ${testKey}`);

        console.log('\n3. Testing Read Access (Download Test File)...');
        await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: testKey
        }));
        console.log('✅ Successfully read the test file.');

        console.log('\n4. Testing Delete Access (Removing Test File)...');
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: testKey
        }));
        console.log('✅ Successfully deleted the test file.');

        console.log('\n🎉 R2 Configuration is fully working!');

        console.log('\n⚠️  Important Check: Did you configure CORS in Cloudflare dashboard?');
        console.log('Cloudflare R2 > Your Bucket > Settings > CORS Policy');
        console.log('Ensure you allow your frontend origin (e.g., http://localhost:5173) and include headers like "Content-Type".');

    } catch (err) {
        console.error('\n❌ R2 Test Failed:');
        console.error(err.message);
        if (err.name === 'InvalidAccessKeyId') {
            console.log('Tip: Check your R2_ACCESS_KEY_ID');
        } else if (err.name === 'SignatureDoesNotMatch') {
            console.log('Tip: Check your R2_SECRET_ACCESS_KEY');
        } else if (err.code === 'ENOTFOUND') {
            console.log('Tip: Check your R2_ACCOUNT_ID (endpoint URL might be wrong)');
        }
    }
};

testR2();
