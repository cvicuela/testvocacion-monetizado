const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SITE_URL = 'https://testvocacion.netlify.app';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@testvocacion.app';
const FROM_NAME = 'TestVocacion';

function buildEmailHtml(referrerName) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f1ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(108,92,231,0.10);">
    <tr>
      <td style="background:linear-gradient(135deg,#6C5CE7,#a29bfe);padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🎓 TestVocacion</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Descubre tu perfil vocacional</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <p style="font-size:16px;color:#2d3436;margin:0 0 16px;line-height:1.6;">
          <strong>${referrerName}</strong> acaba de completar su test vocacional y pensó en ti.
        </p>
        <p style="font-size:15px;color:#636e72;margin:0 0 24px;line-height:1.6;">
          Es un test rápido (menos de 5 minutos) que analiza tus aptitudes en 5 dimensiones
          — Creativa, Científica, Social, Empresarial y Técnica — y te sugiere carreras
          que encajan con tu perfil.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr>
            <td style="background:#6C5CE7;border-radius:10px;">
              <a href="${SITE_URL}" target="_blank"
                 style="display:inline-block;padding:14px 36px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">
                Hacer el test gratis →
              </a>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#b2bec3;text-align:center;margin:0;line-height:1.5;">
          Este correo fue enviado porque ${referrerName} compartió tu email con nosotros.<br>
          No almacenamos tu dirección para ningún otro fin.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f8f7ff;padding:16px 28px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#a4b0be;">
          TestVocacion · <a href="${SITE_URL}/privacy.html" style="color:#6C5CE7;text-decoration:none;">Privacidad</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(referrerName) {
    return `${referrerName} acaba de completar su test vocacional y pensó en ti.\n\n`
        + `TestVocacion es un test rápido (menos de 5 min) que analiza tus aptitudes en 5 dimensiones `
        + `y te sugiere carreras que encajan con tu perfil.\n\n`
        + `Haz el test gratis: ${SITE_URL}\n\n`
        + `Este correo fue enviado porque ${referrerName} compartió tu email con nosotros. `
        + `No almacenamos tu dirección para ningún otro fin.`;
}

exports.handler = async (event) => {
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

        const { sessionId, emails, referrerName } = JSON.parse(event.body);

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

        // Send invitation emails via SendGrid
        const displayName = (referrerName || '').trim() || 'Tu amigo/a';
        const htmlBody = buildEmailHtml(displayName);
        const textBody = buildEmailText(displayName);

        const messages = [...unique].map(toEmail => ({
            to: toEmail,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: `${displayName} te invita a descubrir tu perfil vocacional`,
            text: textBody,
            html: htmlBody,
        }));

        try {
            await sgMail.send(messages);
        } catch (sendErr) {
            // Log but don't fail the request — referrals are already saved
            console.error('SendGrid error:', sendErr.response ? sendErr.response.body : sendErr.message);
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                ok: true,
                message: 'Referidos registrados y emails enviados.',
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
