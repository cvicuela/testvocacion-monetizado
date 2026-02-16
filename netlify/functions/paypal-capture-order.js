const axios = require('axios');

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

// Capture PayPal order
exports.handler = async (event) => {
      try {
              const { orderID } = JSON.parse(event.body);

        if (!orderID) {
                  return {
                              statusCode: 400,
                              body: JSON.stringify({ error: 'Missing orderID' }),
                  };
        }

        const accessToken = await getAccessToken();

        const response = await axios.post(
                  `https://api-m.${process.env.PAYPAL_ENV === 'live' ? 'paypal.com' : 'sandbox.paypal.com'}/v2/checkout/orders/${orderID}/capture`,
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
                              body: JSON.stringify({
                                            success: false,
                                            status: response.data.status,
                                            details: response.data.details,
                              }),
                  };
        }
      } catch (error) {
              console.error('Error capturing order:', error.response?.data || error.message);
              return {
                        statusCode: 500,
                        body: JSON.stringify({
                                    success: false,
                                    error: error.message,
                                    details: error.response?.data,
                        }),
              };
      }
};
