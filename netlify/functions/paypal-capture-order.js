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
        `https://api-m.${process.env.PAYPAL_ENV === 'sandbox' ? 'sandbox.paypal.com' : 'paypal.com'}/v1/oauth2/token`,
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

// Capture PayPal order
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    try {
        const { orderID } = JSON.parse(event.body);

        if (!orderID || typeof orderID !== 'string' || orderID.length > 50) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Missing or invalid orderID' }),
            };
        }

        const accessToken = await getAccessToken();

        const response = await axios.post(
            `https://api-m.${process.env.PAYPAL_ENV === 'sandbox' ? 'sandbox.paypal.com' : 'paypal.com'}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.status === 'COMPLETED') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: true,
                    id: response.data.id,
                    status: response.data.status,
                    payer: response.data.payer,
                    purchase_units: response.data.purchase_units,
                }),
            };
        } else {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: false,
                    status: response.data.status,
                }),
            };
        }
    } catch (error) {
        console.error('Error capturing order:', error.response?.data || error.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: false,
                error: 'Failed to capture order. Please try again.',
            }),
        };
    }
};
