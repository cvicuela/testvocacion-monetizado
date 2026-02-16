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

      const { referrerEmail, invitedEmail } = JSON.parse(event.body);

      if (!referrerEmail || !invitedEmail) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Missing required fields' })
              };
      }

      // Guardar la invitación en la tabla de referidos
      const { data, error } = await supabase
            .from('referrals')
            .insert([
              {
                          referrer_email: referrerEmail,
                          invited_email: invitedEmail,
                          status: 'pending',
                          created_at: new Date().toISOString()
              }
                    ])
            .select();

      if (error) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: error.message })
              };
      }

      return {
              statusCode: 200,
              body: JSON.stringify({
                        success: true,
                        message: 'Invitation sent successfully',
                        data: data
              })
      };
    } catch (error) {
          return {
                  statusCode: 500,
                  body: JSON.stringify({ error: error.message })
          };
    }
};
