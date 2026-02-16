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

        const { referrerEmail } = JSON.parse(event.body);

        if (!referrerEmail) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Missing referrer email' })
            };
        }

        if (!EMAIL_RE.test(referrerEmail)) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }

        const { data, error, count } = await supabase
            .from('referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_email', referrerEmail)
            .eq('status', 'completed');

        if (error) {
            console.error('Supabase query error:', error.message);
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Failed to query referrals' })
            };
        }

        const validReferrals = count || 0;
        const hasDiscount = validReferrals >= 3;

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                referrerEmail: referrerEmail,
                validReferrals: validReferrals,
                hasDiscount: hasDiscount,
                discountPercentage: hasDiscount ? 50 : 0,
                message: hasDiscount ? 'Discount unlocked!' : `Need ${3 - validReferrals} more referrals for discount`
            })
        };
    } catch (error) {
        console.error('referral-count error:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
