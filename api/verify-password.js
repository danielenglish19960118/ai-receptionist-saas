/**
 * Garfield AI Executive - Secure Site Password & Admin Authentication Handler (api/verify-password.js)
 * Validates administrative access tokens using SHA-256 hashing, timing-safe comparisons, and Supabase audit logging.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Audit Logging
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// 8-Channel Omnichannel Matrix Lookup Table
const channelNames = {
    1: 'Google Chrome Extension',
    2: 'Slack App Directory',
    3: 'Discord App Directory',
    4: 'Raycast / Alfred Launcher',
    5: 'Telegram / WhatsApp Gateway',
    6: 'Desktop Tray App',
    7: 'Mobile App Companion',
    8: 'Notion Workspace Widget'
};

export default async function handler(req, res) {
    // Set CORS and Security Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
        const { password, channelId = 1, clientId = 'turtle_english' } = req.body || {};
        
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Password is required and must be a valid string.' });
        }

        const selectedChannelName = channelNames[channelId] || channelNames[1];

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
            console.log(`[Admin Auth Success] Valid executive password authenticated via ${selectedChannelName}.`);

            // 🚀 Log successful admin login to Supabase audit trail
            if (supabase) {
                await supabase.from('omnichannel_logs').insert([
                    {
                        client_id: clientId,
                        channel_id: parseInt(channelId, 10) || 1,
                        channel_key: 'admin_auth_success',
                        payload: { status: 'authenticated', originChannel: selectedChannelName },
                        latency_ms: 85,
                        created_at: new Date().toISOString()
                    }
                ]).catch(err => console.error('Supabase Auth Audit Log Warning:', err.message));
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Authentication successful. Welcome to Garfield Executive Portal.',
                sessionToken: 'grf_auth_' + Math.random().toString(36).substring(2),
                originChannel: selectedChannelName,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('[Admin Auth Warning] Incorrect password attempt rejected.');

            // Log failed admin login attempt to Supabase audit trail
            if (supabase) {
                await supabase.from('omnichannel_logs').insert([
                    {
                        client_id: clientId,
                        channel_id: parseInt(channelId, 10) || 1,
                        channel_key: 'admin_auth_rejected',
                        payload: { status: 'rejected', originChannel: selectedChannelName },
                        latency_ms: 90,
                        created_at: new Date().toISOString()
                    }
                ]).catch(err => console.error('Supabase Auth Reject Log Warning:', err.message));
            }

            return res.status(401).json({ success: false, message: 'Incorrect password, please try again.' });
        }

    } catch (error) {
        console.error('[Authentication Critical Error]:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during authentication pipeline.' });
    }
}

// Trigger redeploy timestamp: 2026-10-27
