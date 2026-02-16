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

// Create PayPal order
exports.handler = async (event) => {
      try {
              const { items, totalPrice } = JSON.parse(event.body);

        if (!items || !totalPrice) {
                  return {
                              statusCode: 400,
                              body: JSON.stringify({ error: 'Missing items or totalPrice' }),
                  };
        }

        const accessToken = await getAccessToken();

        const orderData = {
                  intent: 'CAPTURE',
                  purchase_units: [
                      {
                                    amount: {
                                                    currency_code: 'USD',
                                                    value: totalPrice.toString(),
                                                    breakdown: {
                                                                      item_total: {
                                                                                          currency_code: 'USD',
                                                                                          value: totalPrice.toString(),
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
                        body: JSON.stringify({ error: error.message }),
              };
      }
};
