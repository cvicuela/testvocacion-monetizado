const axios = require('axios');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Get PayPal access token
async function getAccessToken() {
    const PAYPAL_SECRET =
        process.env.PAYPAL_SECRET ||
        process.env.PAYPAL_CLIENT_SECRET ||
        process.env.PAYPAL_CLIENT_SECRET_KEY ||
        process.env.PAYPAL_CLIENT_SECRET_VALUE;

    if (!process.env.PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
        throw new Error('Missing PayPal env vars');
    }

    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
    ).toString('base64');

    const response = await axios.post(
        `https://api-m.${process.env.PAYPAL_ENV === 'live' ? 'paypal.com' : 'sandbox.paypal.com'}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );

    return response.data.access_token;
}

// Create PayPal order
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        const { tier, sessionId } = body;

        // Map tier to price and description
        const TIERS = {
            FULL_7_99: { price: '7.99', name: 'Full Personalized Career Report' },
            DISC_3_99: { price: '3.99', name: 'Discounted Career Report (Referral)' },
        };

        const tierInfo = TIERS[tier];
        if (!tierInfo) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Invalid tier: ' + (tier || 'missing') }),
            };
        }

        const priceStr = tierInfo.price;

        const items = [
            {
                name: tierInfo.name,
                unit_amount: { currency_code: 'USD', value: priceStr },
                quantity: '1',
            },
        ];

        const accessToken = await getAccessToken();

        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    description: tierInfo.name + (sessionId ? ' (' + sessionId.substring(0, 16) + ')' : ''),
                    amount: {
                        currency_code: 'USD',
                        value: priceStr,
                        breakdown: {
                            item_total: {
                                currency_code: 'USD',
                                value: priceStr,
                            },
                        },
                    },
                    items: items,
                },
            ],
            application_context: {
                return_url: `${process.env.PAYPAL_RETURN_URL || 'http://localhost:8888'}`,
                cancel_url: `${process.env.PAYPAL_CANCEL_URL || 'http://localhost:8888'}`,
                brand_name: 'TestVocación',
                landing_page: 'BILLING',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
            },
        };

        const response = await axios.post(
            `https://api-m.${process.env.PAYPAL_ENV === 'live' ? 'paypal.com' : 'sandbox.paypal.com'}/v2/checkout/orders`,
            orderData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                id: response.data.id,
                status: response.data.status,
                links: response.data.links,
            }),
        };
    } catch (error) {
        console.error('Error creating order:', error.response?.data || error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Failed to create order. Please try again.' }),
        };
    }
};
