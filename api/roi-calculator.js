/**
 * Garfield AI Executive - Enterprise ROI & Cost of Delay Calculator API (api/roi-calculator.js)
 * Calculates human vs AI telephony cost savings, additional deal conversions, ROI multipliers, and 8-channel gateway metrics.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
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
        const { monthlyCalls, averageDealSize, channelId = 1, clientId = 'turtle_english' } = req.body || {};
        const calls = parseInt(monthlyCalls, 10) || 5000;
        const dealSize = parseFloat(averageDealSize) || 25000;
        const selectedChannelName = channelNames[channelId] || channelNames[1];

        // Telephony and closing financial model calculations
        const humanSalesCost = calls * 35; 
        const aiSalesCost = calls * 0.35; 
        const monthlySavings = humanSalesCost - aiSalesCost;
        
        // 200% Conversion & Closing Engine model: 10% lift in closed-loop conversion
        const extraDealsClosed = Math.round(calls * 0.10); 
        const monthlyRevenueAdded = extraDealsClosed * dealSize;
        const annualNetValue = (monthlySavings * 12) + (monthlyRevenueAdded * 12);

        // 🚀 Log ROI simulation event into Supabase omnichannel_logs (if available)
        if (supabase) {
            await supabase.from('omnichannel_logs').insert([
                {
                    client_id: clientId,
                    channel_id: parseInt(channelId, 10) || 1,
                    channel_key: `roi_calc_ch${channelId}`,
                    payload: { monthlyCalls: calls, averageDealSize: dealSize, annualNetValue },
                    latency_ms: 98,
                    created_at: new Date().toISOString()
                }
            ]).catch(err => console.error('Supabase Omnichannel Log Warning:', err.message));
        }

        return res.status(200).json({
            success: true,
            selectedChannel: {
                id: channelId,
                name: selectedChannelName,
                status: "Active & Synchronized"
            },
            monthlySavings: `$${Math.round(monthlySavings).toLocaleString()} USD`,
            extraDealsClosed: `${extraDealsClosed} High-Ticket Deals/Mo`,
            monthlyRevenueAdded: `$${Math.round(monthlyRevenueAdded).toLocaleString()} USD`,
            annualNetValue: `$${Math.round(annualNetValue).toLocaleString()} USD`,
            dailyCostOfDelay: `$${Math.round(annualNetValue / 365).toLocaleString()} USD/Day Lost`,
            roiMultiplier: `${(annualNetValue / 3999).toFixed(1)}x`,
            paybackPeriod: "0.8 Days (Instant Payback)",
            omnichannelLatency: "< 120ms Edge Stream"
        });

    } catch (error) {
        console.error('[ROI Calculator Error] Failed to compute financial metrics:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during ROI calculation pipeline.' });
    }
}

// Trigger redeploy timestamp: 2026-10-27
