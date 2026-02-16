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
                body: JSON.stringify({ ok: false, message: 'Method not allowed' })
            };
        }

        const { sessionId, emails } = JSON.parse(event.body);

        if (!sessionId || !Array.isArray(emails) || emails.length < 3) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ ok: false, message: 'Se requieren sessionId y 3 emails.' })
            };
        }

        // Validate all emails
        for (const email of emails) {
            if (!EMAIL_RE.test(email)) {
                return {
                    statusCode: 400,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ ok: false, message: `Email inválido: ${email}` })
                };
            }
        }

        // Check for duplicates
        const unique = new Set(emails.map(e => e.toLowerCase()));
        if (unique.size < 3) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ ok: false, message: 'Los 3 emails deben ser diferentes.' })
            };
        }

        // Insert all 3 referrals
        const rows = emails.map(email => ({
            referrer_session: sessionId,
            invited_email: email.toLowerCase(),
            status: 'completed',
            created_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('referrals')
            .insert(rows)
            .select();

        if (error) {
            console.error('Supabase insert error:', error.message);
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ ok: false, message: 'Error al guardar referidos: ' + error.message })
            };
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                ok: true,
                message: 'Referidos registrados correctamente.',
                count: data.length
            })
        };
    } catch (error) {
        console.error('referral-invite error:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ ok: false, message: 'Error interno del servidor.' })
        };
    }
};
