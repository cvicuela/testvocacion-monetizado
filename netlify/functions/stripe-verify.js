const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        const body = JSON.parse(event.body);
        const { checkoutSessionId } = body;

        if (!checkoutSessionId || typeof checkoutSessionId !== 'string') {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Missing checkoutSessionId' }),
            };
        }

        const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

        if (session.payment_status === 'paid') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: true,
                    status: 'paid',
                    tv_session_id: session.metadata?.tv_session_id || '',
                }),
            };
        } else {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: false,
                    status: session.payment_status,
                }),
            };
        }
    } catch (error) {
        console.error('Stripe verify error:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Failed to verify payment.' }),
        };
    }
};
