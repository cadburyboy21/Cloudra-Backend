const path = require('path');
const dotenv = require('dotenv');

// Load env vars from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const sendEmail = require('../utils/sendEmail');

const testEmail = async () => {
    const toEmail = process.argv[2] || process.env.SMTP_EMAIL;

    if (!toEmail) {
        console.error('Error: No recipient email provided and SMTP_EMAIL not found in .env');
        console.log('Usage: node src/scripts/test-email.js <recipient-email>');
        process.exit(1);
    }

    console.log(`Attempting to send test email to: ${toEmail}`);
    console.log(`Using SMTP Host: ${process.env.SMTP_HOST}`);
    console.log(`Using SMTP Port: ${process.env.SMTP_PORT}`);
    console.log(`Using SMTP User: ${process.env.SMTP_EMAIL}`);

    try {
        await sendEmail({
            email: toEmail,
            subject: 'SMTP Configuration Test - Cloudra',
            message: 'This is a test email to verify that your SMTP credentials are working correctly.',
            html: '<h1>SMTP Test</h1><p>This is a test email to verify that your SMTP credentials are working correctly.</p>'
        });
        console.log('✅ Test email sent successfully!');
    } catch (err) {
        console.error('❌ Failed to send test email:', err);
        process.exit(1);
    }
};

testEmail();
