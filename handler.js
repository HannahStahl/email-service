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
  const { email, name, message, sourceEmail, siteDomain } = body
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
          Data: (
            `
              <html>
                <head>
                  <style>
                    h2 { font-weight: normal; }
                    p { font-size: 16px; }
                  </style>
                </head>
                <body>
                  <h2><b>${name}</b> has sent you the following message:</h2><p>"${message}"</p>
                  <p><i>You can respond to ${name} by replying directly to this email.</i></p>
                </body>
              </html>
            `
          ),
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `New message from ${siteDomain || 'website'}`,
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
