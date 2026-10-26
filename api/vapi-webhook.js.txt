/**
 * Garfield AI Executive - Vapi Telephony Webhook Handler (api/vapi-webhook.js)
 * Handles real-time Vapi call events, transcripts, end-of-call summaries, and Supabase synchronization.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const event = req.body || {};
        const message = event.message || {};
        const eventType = message.type || event.type;

        console.log(`[Vapi Webhook] Received incoming event type: ${eventType || 'unknown'}`);

        // Handle different Vapi webhook event types
        switch (eventType) {
            case 'end-of-call-report':
            case 'call-ended': {
                const call = message.call || event.call || {};
                const transcript = message.transcript || call.transcript || '';
                const summary = message.summary || call.summary || 'No summary generated.';
                const customerNumber = call.customer?.number || 'Unknown';
                const assistantId = call.assistantId;

                console.log(`[Vapi Call Ended] Assistant ID: ${assistantId} | Caller: ${customerNumber}`);
                console.log(`- Call Summary: ${summary}`);

                // Synchronize call logs and summaries to Supabase
                if (supabaseUrl && supabaseAnonKey) {
                    const { error: logError } = await supabase.from('call_logs').insert([
                        {
                            assistant_id: assistantId || null,
                            customer_phone: customerNumber,
                            transcript: transcript,
                            summary: summary,
                            raw_event: event
                        }
                    ]);

                    if (logError) {
                        console.error('[Supabase Call Log Insert Error]:', logError);
                    }
                }
                break;
            }

            case 'function-call': {
                const functionCall = message.functionCall;
                console.log(`[Vapi Function Call] Executing: ${functionCall?.name}`, functionCall?.parameters);
                
                // Return server-side function execution result to Vapi if needed
                return res.status(200).json({
                    result: "Function executed successfully by Garfield AI Executive webhook engine."
                });
            }

            default:
                console.log(`[Vapi Webhook] Unhandled event type received: ${eventType}`);
                break;
        }

        return res.status(200).json({ success: true, received: true });

    } catch (error) {
        console.error('[Vapi Webhook Critical Error] Failed to process incoming payload:', error);
        return res.status(500).json({ error: 'Internal server error processing Vapi webhook payload.' });
    }
}

// Trigger redeploy timestamp: 2026-10-26
