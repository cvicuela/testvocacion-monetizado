# TestVocacion – Monetización (Netlify + PayPal + Supabase)

Este repo es **1 HTML** (index.html) + **Netlify Functions** para PayPal y referidos (Supabase).

## 1) Variables de entorno (Netlify)
Configura en Netlify → Site settings → Environment variables:

- `PAYPAL_ENV` = `sandbox` (luego `live`)
- `PAYPAL_CLIENT_ID` = (tu Client ID)
- `PAYPAL_CLIENT_SECRET` = (tu Secret)
- `SUPABASE_URL` = `https://lqdodhyovotxyjhinjgd.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (service_role key)
- `SENDGRID_API_KEY` = (tu SendGrid API key)
- `SENDGRID_FROM_EMAIL` = (email verificado en SendGrid, ej. `hello@testvocacion.app`)

> **No** pongas el secret en el HTML. Solo en Netlify env vars.

## 2) Tablas en Supabase
Ejecuta el SQL en `supabase/schema.sql`.

## 3) Deploy
- Conecta este repo a Netlify
- Build: none (static)
- Publish: `.`
- Functions: `netlify/functions`

## 4) Flujo de precios
- Full Report: **$9.99**
- Discount: **$5.99** (se habilita al tener **3 referidos** válidos)

