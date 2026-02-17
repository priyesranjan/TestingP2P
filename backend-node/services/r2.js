const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Cloudflare R2 Config (S3-compatible)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'connecto-media';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // e.g., https://media.appdost.com

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
    }
});

/**
 * Upload a file to Cloudflare R2
 * @param {Object} file - multer file object { buffer, mimetype, originalname }
 * @returns {string} Public URL of uploaded file
 */
async function uploadToR2(file) {
    const ext = path.extname(file.originalname);
    const key = `uploads/${Date.now()}-${uuidv4()}${ext}`;

    await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));

    // Return public URL
    if (R2_PUBLIC_URL) {
        return `${R2_PUBLIC_URL}/${key}`;
    }
    return `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

module.exports = { uploadToR2 };
