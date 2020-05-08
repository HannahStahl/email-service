const aws = require('aws-sdk')
const ses = new aws.SES()

function generateResponse (code, payload) {
  return {
    statusCode: code,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(payload)
  }
}

function generateError (code, err) {
  return {
    statusCode: code,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(err.message)
  }
}

function getMessageNotification (body) {
  const { name, message } = body
  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Rubik&display=swap" rel="stylesheet" />
        <style>
          * {
            font-family: 'Rubik', sans-serif;
          }
          h2 {
            font-weight: normal;
            letter-spacing: 1.6px;
          }
          p {
            font-size: 16px;
            letter-spacing: 1.1px;
          }
          .message-box {
            max-width: 500px;
            padding: 20px;
            border: solid 1px rgb(206, 212, 218);
          }
          .message-box p {
            margin: 0px;
          }
          .note {
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <h2><b>${name}</b> has sent you the following message:</h2>
        <div class="message-box"><p>${message}</p></div>
        <p class="note"><i>You can respond to ${name} by replying directly to this email.</i></p>
      </body>
    </html>
  `
}

function getOrderNotification (body) {
  const { name, items, orderTotal, siteDomain, address } = body
  let itemsTable = ''
  items.forEach((item) => {
    itemsTable += `
      <tr>
        <td><a href=${siteDomain}${item.link}>${item.name}</a></td>
        <td>$${item.price}</td>
        <td>${item.quantity}</td>
      </tr>
    `
  })
  let addressHtml = ''
  address.forEach((line) => {
    addressHtml += `<p class="address">${line}</p>`
  })
  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Rubik&display=swap" rel="stylesheet" />
        <style>
          * {
            font-family: 'Rubik', sans-serif;
          }
          h2 {
            font-weight: normal;
            letter-spacing: 1.6px;
          }
          p {
            font-size: 16px;
            letter-spacing: 1.1px;
          }
          .items-table td {
            padding: 20px;
            border: solid 1px rgb(206, 212, 218);
          }
          .note {
            font-size: 14px;
          }
          .address {
            margin: 0px;
          }
        </style>
      </head>
      <body>
        <h2>You have a new order from <b>${name}</b>!</h2>
        <table class="items-table">
          <thead><tr>
            <td><b>Item</b></td>
            <td><b>Price</b></td>
            <td><b>Quantity</b></td>
          </tr></thead>
          <tbody>${itemsTable}</tbody>
        </table>
        <p><b>Total:</b> $${orderTotal}</p>
        <p class="address"><b>Shipping Address:</b></p>
        <p class="address">${name}</p>
        ${addressHtml}
        <p class="note"><i>To get in touch with ${name}, simply reply to this email.</i></p>
      </body>
    </html>
  `
}

function getOrderConfirmation (body) {
  const { name, items, orderTotal, siteDomain, address, businessName } = body
  let itemsTable = ''
  items.forEach((item) => {
    itemsTable += `
      <tr>
        <td><p><a href=${siteDomain}${item.link}>${item.name}</a></p></td>
        <td><p>$${item.price}</p></td>
        <td><p>${item.quantity}</p></td>
      </tr>
    `
  })
  let addressHtml = ''
  address.forEach((line) => {
    addressHtml += `<p class="address">${line}</p>`
  })
  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Rubik&display=swap" rel="stylesheet" />
        <style>
          * {
            font-family: 'Rubik', sans-serif;
          }
          p {
            font-size: 16px;
            letter-spacing: 1.1px;
          }
          .items-table {
            border: solid 1px rgb(206, 212, 218);
          }
          .items-table td {
            border: none;
            padding: 20px;
            padding-top: 0px;
            padding-bottom: 0px;
          }
          .items-table thead td {
            border-bottom: solid 1px rgb(206, 212, 218);
          }
          .address {
            margin: 0px;
          }
        </style>
      </head>
      <body>
        <p>Hello ${name},</p>
        <p>Thank you for your order from ${businessName || siteDomain}!</p>
        <p>Here are your order details:</p>
        <table class="items-table">
          <thead><tr>
            <td><p><b>Item</b></p></td>
            <td><p><b>Price</b></p></td>
            <td><p><b>Quantity</b></p></td>
          </tr></thead>
          <tbody>${itemsTable}</tbody>
        </table>
        <p><b>Total:</b> $${orderTotal}</p>
        <p class="address"><b>Shipping Address:</b></p>
        <p class="address">${name}</p>
        ${addressHtml}
        <p>Thank you for supporting our business. If you have any questions about your order, please reply directly to this email to get in touch.</p>
      </body>
    </html>
  `
}

function getDefaultHtml (body) {
  const { orderConfirmation, orderNotification } = body
  if (orderConfirmation) return getOrderConfirmation(body)
  if (orderNotification) return getOrderNotification(body)
  return getMessageNotification(body)
}

function generateEmailParams (body) {
  const { userEmail, clientEmail, siteDomain, html, orderNotification, orderConfirmation, businessName } = body
  return {
    Source: 'hannahstahl14@gmail.com',
    Destination: { ToAddresses: [orderConfirmation ? userEmail : clientEmail] },
    ReplyToAddresses: [orderConfirmation ? clientEmail : userEmail],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html || getDefaultHtml(body),
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: orderConfirmation ? `${businessName || siteDomain} Order Confirmation` : `New ${orderNotification ? 'order' : 'message'} from ${siteDomain || 'website'}`,
      }
    }
  }
}

module.exports.send = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const emailParams = generateEmailParams(body)
    const data = await ses.sendEmail(emailParams).promise()
    return generateResponse(200, data)
  } catch (err) {
    return generateError(500, err)
  }
}
