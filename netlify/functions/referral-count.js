const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
                body: JSON.stringify({ ok: false, message: 'Method not allowed' })
            };
        }

        const { sessionId } = JSON.parse(event.body);

        if (!sessionId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ ok: false, count: 0, message: 'Missing sessionId' })
            };
        }

        const { data, error, count } = await supabase
            .from('referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_session', sessionId)
            .eq('status', 'completed');

        if (error) {
            console.error('Supabase query error:', error.message);
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ ok: false, count: 0, message: 'Error al consultar referidos.' })
            };
        }

        const validReferrals = count || 0;
        const hasDiscount = validReferrals >= 3;

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                ok: true,
                count: validReferrals,
                hasDiscount: hasDiscount,
                message: hasDiscount ? 'Descuento habilitado.' : `Faltan ${3 - validReferrals} referidos más.`
            })
        };
    } catch (error) {
        console.error('referral-count error:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ ok: false, count: 0, message: 'Error interno del servidor.' })
        };
    }
};
