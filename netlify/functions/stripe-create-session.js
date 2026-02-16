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
        const { tier, sessionId } = body;

        const TIERS = {
            FULL_9_99: { price: 999, name: 'Full Personalized Career Report' },
            DISC_5_99: { price: 599, name: 'Discounted Career Report (Referral)' },
        };

        const tierInfo = TIERS[tier];
        if (!tierInfo) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Invalid tier: ' + (tier || 'missing') }),
            };
        }

        const siteUrl = process.env.SITE_URL || 'https://testvocacion.netlify.app';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: tierInfo.name,
                            description: 'TestVocacion - Career Aptitude Assessment Report',
                        },
                        unit_amount: tierInfo.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${siteUrl}?stripe_success=1&session_id={CHECKOUT_SESSION_ID}&tv_session=${encodeURIComponent(sessionId || '')}`,
            cancel_url: `${siteUrl}?stripe_cancel=1`,
            metadata: {
                tv_session_id: sessionId || '',
                tier: tier,
            },
        });

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ url: session.url, id: session.id }),
        };
    } catch (error) {
        console.error('Stripe create session error:', error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Failed to create Stripe session.' }),
        };
    }
};
