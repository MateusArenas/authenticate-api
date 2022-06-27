import nodemailer from 'nodemailer'
import path from 'path'

import hbs from 'nodemailer-express-handlebars'

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER as string,
    pass:  process.env.MAIL_PASS as string
  }
})

transport.use('compile', hbs({
  viewEngine: {
    extname: ".handlebars",
    partialsDir: path.resolve('./resources/mail/'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./resources/mail/'),
  extName: '.html'
}))

export default transport;
