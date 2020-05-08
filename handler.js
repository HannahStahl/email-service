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

function generateEmailParams (body) {
  const { email, name, message, sourceEmail, siteDomain, html, orderNotification } = body
  if (!(email && name && message && sourceEmail)) {
    throw new Error('Missing parameters! Make sure to add parameters \'email\', \'name\', \'message\', and \'sourceEmail\'.');
  }
  return {
    Source: sourceEmail,
    Destination: { ToAddresses: [sourceEmail] },
    ReplyToAddresses: [email],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html || (
            `
              <html>
                <head>
                  <link href="https://fonts.googleapis.com/css?family=Rubik&display=swap" rel="stylesheet" />
                  <style>
                    body {
                      font-family: 'Rubik', sans-serif;
                      letter-spacing: 1.5px;
                      max-width: 500px;
                    }
                    h2 {
                      font-weight: normal;
                    }
                    p {
                      font-size: 16px;
                    }
                    .message-box {
                      padding: 20px;
                      border: solid 1px rgb(206, 212, 218);
                    }
                  </style>
                </head>
                <body>
                  <h2><b>${name}</b> has sent you the following message:</h2>
                  <div class="message-box"><p>${message}</p></div>
                  <p><i>You can respond to ${name} by replying directly to this email.</i></p>
                </body>
              </html>
            `
          ),
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `New ${orderNotification ? 'order' : 'message'} from ${siteDomain || 'website'}`,
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
