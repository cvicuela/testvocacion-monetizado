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
const FROM_NAME = 'Test Vocacional';

function buildEmailHtml() {
    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;line-height:1.6;color:#222">
<h2 style="margin-bottom:10px">Test Vocacional</h2>
<p>Hola,</p>
<p>Una persona cercana te recomendó este test vocacional porque pensó que podría ayudarte a descubrir mejor tus fortalezas y posibles caminos profesionales.</p>
<p>El test incluye una <strong>vista gratuita</strong> con resultados iniciales.</p>
<div style="text-align:center;margin:30px 0">
<a href="${SITE_URL}"
style="background:#0070ba;color:white;padding:14px 22px;border-radius:10px;text-decoration:none;font-size:16px;display:inline-block">
Hacer el test
</a>
</div>
<p style="font-size:14px;color:#666">
Si no deseas recibir más invitaciones simplemente ignora este mensaje.
</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="font-size:12px;color:#999">
Este mensaje fue enviado como recomendación personal desde testvocacion.netlify.app
</p>
</div>`;
}

function buildEmailText() {
    return `Hola,\n\n`
        + `Una persona cercana te recomendó este test vocacional porque pensó que podría ayudarte a descubrir mejor tus fortalezas y posibles caminos profesionales.\n\n`
        + `El test incluye una vista gratuita con resultados iniciales.\n\n`
        + `Hacer el test: ${SITE_URL}\n\n`
        + `Si no deseas recibir más invitaciones simplemente ignora este mensaje.\n\n`
        + `Este mensaje fue enviado como recomendación personal desde testvocacion.netlify.app`;
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
        const htmlBody = buildEmailHtml();
        const textBody = buildEmailText();

        const messages = [...unique].map(toEmail => ({
            to: toEmail,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: 'Te recomendaron este test vocacional',
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
