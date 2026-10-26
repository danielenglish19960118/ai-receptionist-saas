/**
 * Garfield AI Executive - Secure Site Password & Admin Authentication Handler (api/auth.js)
 * Validates administrative access tokens using SHA-256 hashing and timing-safe comparisons.
 */

import crypto from 'crypto';

export default async function handler(req, res) {
    // Set CORS and Security Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Ensure the request method is POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
    }

    try {
        const { password } = req.body || {};
        
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Password is required and must be a valid string.' });
        }

        // Compute SHA-256 hash of the incoming password attempt
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        
        // Default secure fallback password hash
        const defaultSecurePassword = 'Kx$9vP#2mQ!7zL%4wR*5dX#8fC!1hB%6n';
        const targetHash = process.env.SITE_PASSWORD_HASH || crypto.createHash('sha256').update(defaultSecurePassword).digest('hex');

        // Use timing-safe comparison to prevent timing attacks
        const inputBuffer = Buffer.from(inputHash, 'hex');
        const targetBuffer = Buffer.from(targetHash, 'hex');

        let isMatch = false;
        if (inputBuffer.length === targetBuffer.length) {
            isMatch = crypto.timingSafeEqual(inputBuffer, targetBuffer);
        }

        if (isMatch) {
            console.log('[Admin Auth Success] Valid executive password authenticated.');
            return res.status(200).json({ 
                success: true, 
                message: 'Authentication successful. Welcome to Garfield Executive Portal.',
                sessionToken: 'grf_auth_' + Math.random().toString(36).substring(2)
            });
        } else {
            console.warn('[Admin Auth Warning] Incorrect password attempt rejected.');
            return res.status(401).json({ success: false, message: 'Incorrect password, please try again.' });
        }

    } catch (error) {
        console.error('[Authentication Critical Error]:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during authentication pipeline.' });
    }
}

// Trigger redeploy timestamp: 2026-10-26
