# PayPal Netlify Functions

Netlify Functions para integrar PayPal con tu aplicación TestVocación.

## Archivos

- **paypal-create-order.js** - Crea una orden en PayPal
- - **paypal-capture-order.js** - Captura/completa una orden en PayPal
  - - **package.json** - Dependencias necesarias (axios)
   
    - ## Configuración necesaria
   
    - Debes agregar las siguientes variables de entorno en Netlify:
   
    - ```
      PAYPAL_CLIENT_ID=tu_client_id
      PAYPAL_CLIENT_SECRET=tu_client_secret
      PAYPAL_ENV=sandbox  (o "live" para producción)
      PAYPAL_RETURN_URL=https://tudominio.com/success
      PAYPAL_CANCEL_URL=https://tudominio.com/cancel
      ```

      ## Endpoints de las funciones

      ### POST /.netlify/functions/paypal-create-order

      Crea una nueva orden en PayPal.

      **Request body:**
      ```json
      {
        "items": [
          {
            "name": "TestVocación - Carrera Profesional",
            "quantity": "1",
            "unit_amount": {
              "currency_code": "USD",
              "value": "19.99"
            }
          }
        ],
        "totalPrice": "19.99"
      }
      ```

      **Response:**
      ```json
      {
        "id": "7A98...",
        "status": "CREATED",
        "links": [...]
      }
      ```

      ### POST /.netlify/functions/paypal-capture-order

      Captura una orden existente de PayPal.

      **Request body:**
      ```json
      {
        "orderID": "7A98..."
      }
      ```

      **Response:**
      ```json
      {
        "success": true,
        "id": "7A98...",
        "status": "COMPLETED",
        "payer": {...},
        "purchase_units": [...]
      }
      ```

      ## Uso en el cliente

      ```javascript
      // 1. Crear orden
      const createOrderResponse = await fetch('/.netlify/functions/paypal-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{...}],
          totalPrice: '19.99'
        })
      });
      const { id } = await createOrderResponse.json();

      // 2. Redirigir a PayPal o usar SDK de PayPal

      // 3. Capturar orden después de aprobación
      const captureResponse = await fetch('/.netlify/functions/paypal-capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: id })
      });
      const result = await captureResponse.json();
      ```

      ## Documentación oficial

      - [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)
      - - [Netlify Functions](https://docs.netlify.com/functions/overview/)
