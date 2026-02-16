const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'PAYPAL_CLIENT_ID not configured' }),
        };
    }

    return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        body: JSON.stringify({ clientId }),
    };
};
