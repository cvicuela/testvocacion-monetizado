const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        const { referrerEmail, invitedEmail } = JSON.parse(event.body);

        if (!referrerEmail || !invitedEmail) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        if (!EMAIL_RE.test(referrerEmail) || !EMAIL_RE.test(invitedEmail)) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }

        if (referrerEmail.toLowerCase() === invitedEmail.toLowerCase()) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Referrer and invited email must be different' })
            };
        }

        const { data, error } = await supabase
            .from('referrals')
            .insert([
                {
                    referrer_email: referrerEmail,
                    invited_email: invitedEmail,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('Supabase insert error:', error.message);
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Failed to create invitation' })
            };
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                message: 'Invitation sent successfully',
                data: data
            })
        };
    } catch (error) {
        console.error('referral-invite error:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
