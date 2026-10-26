/**
 * Garfield AI Executive - Enterprise Chat & Function Calling Handler (api/chat.js)
 * Powered by Gemini 1.5 Flash & Supabase Multi-Tenant Architecture
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Garfield Warning] Supabase credentials missing in environment variables.');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Define Gemini Function Calling Tool Declarations (for automated lead and appointment extraction)
const tools = [
    {
        function_declarations: [
            {
                name: 'save_lead_and_appointment',
                description: 'Immediately invoke this function when the visitor provides their name, contact details (email or phone), appointment date, or consultation inquiries to save client data and schedule.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        name: { type: 'STRING', description: 'Visitor full name or preferred title' },
                        email: { type: 'STRING', description: 'Email address' },
                        phone: { type: 'STRING', description: 'Contact phone number' },
                        appointment_date: { type: 'STRING', description: 'Scheduled date and time (e.g., 2026-11-01 14:00)' },
                        notes: { type: 'STRING', description: 'Consultation requirements, notes, or special inquiries' }
                    },
                    required: ['name']
                }
            }
        ]
    }
];

export default async function handler(req, res) {
    // Set CORS and Security Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Allow POST requests only
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { message, clientId = 'turtle_english', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string.' });
    }

    try {
        // ----------------------------------------------------
        // 1. Automatically fetch client-specific system prompt from Supabase
        // ----------------------------------------------------
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('system_prompt, client_name')
            .eq('client_id', clientId)
            .single();

        if (clientError) {
            console.warn(`[Supabase] Client prompt lookup warning for ${clientId}:`, clientError.message);
        }

        // Fallback system prompt if client configuration is not found
        const systemInstruction = clientData?.system_prompt || `You are the Garfield AI Executive elite VIP concierge and appointment specialist. Your tone is polite, professional, and efficient. Your objective is to assist corporate visitors with inquiries and guide them to provide their name, contact details, and appointment schedule.`;

        // ----------------------------------------------------
        // 2. Call Gemini 1.5 Flash API
        // ----------------------------------------------------
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return res.status(500).json({ error: 'Gemini API Key is not configured on server.' });
        }

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

        const payload = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            tools: tools,
            contents: [
                ...history,
                { role: 'user', parts: [{ text: message }] }
            ]
        };

        let response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let data = await response.json();

        if (data.error) {
            console.error('Gemini API Error:', data.error);
            return res.status(500).json({ error: data.error.message || 'Gemini API Error' });
        }

        const candidate = data.candidates?.[0];
        const firstPart = candidate?.content?.parts?.[0];

        // ----------------------------------------------------
        // 3. Check if AI triggered a Function Call (Save to Supabase)
        // ----------------------------------------------------
        if (firstPart && firstPart.functionCall) {
            const { name: functionName, args } = firstPart.functionCall;

            if (functionName === 'save_lead_and_appointment') {
                const { name, email, phone, appointment_date, notes } = args;

                // A. Insert into leads table
                const { data: leadData, error: leadError } = await supabase
                    .from('leads')
                    .insert([
                        {
                            client_id: clientId,
                            name: name || 'Unnamed Visitor',
                            email: email || null,
                            phone: phone || null,
                            notes: notes || null
                        }
                    ])
                    .select()
                    .single();

                if (leadError) {
                    console.error('Supabase Lead Insert Error:', leadError);
                }

                // B. Insert into appointments table if appointment date is provided
                let aptRecorded = false;
                if (appointment_date) {
                    const { error: aptError } = await supabase
                        .from('appointments')
                        .insert([
                            {
                                client_id: clientId,
                                lead_id: leadData?.id || null,
                                appointment_date: appointment_date,
                                status: 'pending',
                                notes: notes || null
                            }
                        ]);

                    if (aptError) {
                        console.error('Supabase Appointment Insert Error:', aptError);
                    } else {
                        aptRecorded = true;
                    }
                }

                // -----------------------------------------------------------------
                // 🚀 NEW: 當高單價客戶留單/預約成功時，非同步發送高效 Slack Block Kit 通知
                // -----------------------------------------------------------------
                const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
                if (slackWebhookUrl) {
                    fetch(slackWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            blocks: [
                                {
                                    type: "header",
                                    text: {
                                        type: "plain_text",
                                        text: "🎯 New High-Ticket Lead & Appointment!",
                                        emoji: true
                                    }
                                },
                                {
                                    type: "section",
                                    fields: [
                                        {
                                            type: "mrkdwn",
                                            text: `*Tenant / Client:*\n\`${clientId}\``
                                        },
                                        {
                                            type: "mrkdwn",
                                            text: `*Visitor Name:*\n*${name}*`
                                        },
                                        {
                                            type: "mrkdwn",
                                            text: `*Phone:*\n${phone || 'Not provided'}`
                                        },
                                        {
                                            type: "mrkdwn",
                                            text: `*Email:*\n${email || 'Not provided'}`
                                        },
                                        {
                                            type: "mrkdwn",
                                            text: `*Appointment Time:*\n📅 *${appointment_date || 'No specific time'}*`
                                        }
                                    ]
                                },
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `*Consultation Notes:*\n> ${notes || 'No special requirements.'}`
                                    }
                                },
                                {
                                    type: "divider"
                                }
                            ]
                        })
                    }).catch(slackErr => {
                        console.error('Background Slack Lead Notification Failed:', slackErr);
                    });
                }

                // C. Second-turn roundtrip: Send function execution result back to Gemini to generate natural confirmation response
                const functionResponsePayload = {
                    ...payload,
                    contents: [
                        ...payload.contents,
                        candidate.content,
                        {
                            role: 'function',
                            parts: [{
                                functionResponse: {
                                    name: 'save_lead_and_appointment',
                                    response: { success: true, lead_id: leadData?.id, appointment_recorded: aptRecorded }
                                }
                            }]
                        }
                    ]
                };

                const secondResponse = await fetch(geminiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(functionResponsePayload)
                });

                const secondData = await secondResponse.json();
                const finalReplyText = secondData.candidates?.[0]?.content?.parts?.[0]?.text || 
                    `Thank you, ${name}! Your appointment details have been successfully registered${appointment_date ? ` for ${appointment_date}` : ''}. Our team will reach out to confirm shortly!`;

                return res.status(200).json({ 
                    reply: finalReplyText,
                    action: 'saved_lead',
                    leadId: leadData?.id || null
                });
            }
        }

        // ----------------------------------------------------
        // 4. Standard conversation, return AI text reply
        // ----------------------------------------------------
        const replyText = firstPart?.text || 'Apologies, I am currently unable to process your request. Please try again shortly.';
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('Server Handler Critical Error:', error);
        return res.status(500).json({ error: 'Internal server error occurred during AI pipeline execution.' });
    }
}
