const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

exports.handler = async (event, context) => {
    try {
          // Solo aceptamos POST
      if (event.httpMethod !== 'POST') {
              return {
                        statusCode: 405,
                        body: JSON.stringify({ error: 'Method not allowed' })
              };
      }

      const { referrerEmail } = JSON.parse(event.body);

      if (!referrerEmail) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Missing referrer email' })
              };
      }

      // Contar referidos válidos (compras completadas)
      const { data, error, count } = await supabase
            .from('referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_email', referrerEmail)
            .eq('status', 'completed');

      if (error) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: error.message })
              };
      }

      // Determinar si tiene descuento (3 referidos válidos)
      const validReferrals = count || 0;
          const hasDiscount = validReferrals >= 3;

      return {
              statusCode: 200,
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
          return {
                  statusCode: 500,
                  body: JSON.stringify({ error: error.message })
          };
    }
};
