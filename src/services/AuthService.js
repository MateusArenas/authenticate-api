const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const User = require('../schemas/User')
const jwt = require('jsonwebtoken')
const authConfig = require('../config/auth.json')
const transporter = require('../modules/mailer')

const generatePinCode = require('generate-pincode')

class AuthService {

    generateToken (params = {}) {
        return jwt.sign(params, authConfig.secret, {
            expiresIn: 86400
        })
    }

    async verifyUsername ({ username }) { // this controller as verify account
        try {
            if (!username) { throw new Error("Not username provider") }

            if (!(/^[a-zA-Z0-9._]{0,28}[\w]+$/).test(username)) {
              throw new Error("Please enter a valid Username format!")
            }

            if (await User.findOne({ username })) {

                let sugestions = []

                while (!sugestions.length) {
                    const verifiables = Array(9).fill().map((_, i) => username+Math.floor(Math.random() * 100) + i)

                    const exists = await User.find({ username: { $in: verifiables } }).distinct('username')

                    sugestions = verifiables.filter(verifiable => !exists.includes(verifiable))
                }

                return ({ status: false, sugestions });
             }

            return ({ status: true, sugestions: [] });
          } catch (err) { throw new Error("An error occured " + err?.message) }
    }

    async register ({ name, email, password }) { // this controller as register account
        try {
            const verifiedToken = crypto.randomBytes(20).toString('hex')

            const user = await User.create({ name, email, password, verifiedToken })

            user.password = password

           transporter.sendMail({ to: user.email, from: 'simplechatpop@gmail.com', template: 'auth/welcome',  });

           transporter.sendMail({
                to: user.email,
                from: 'simplechatpop@gmail.com',
                template: 'auth/verify',
                context: { url: `http://localhost/verify/${verifiedToken}` },
            })

            return ({
                user,
                token: this.generateToken({ id: user._id }),
            })
        } catch (err) {
            console.log(err);
            throw new Error('Not created user ' + err?.message)
        }
    }

    async verify ({ token }) { // this controller as verify account
        try {
            if (!token) { throw new Error("Not Token provider") }

            const user = await User.findOne({ verifiedToken: token });

            if (!user) { throw new Error("User invalid or link") }

            await User.updateOne({  _id: user._id }, { verified: true, $unset: { verifiedToken: "", expiredAt: "" } });

            return ({ message: "email verified sucessfully" });
          } catch (err) { throw new Error("An error occured " + err?.message) }
    }

    async authenticate ({ identifier, email, password }) { // this controller as authenticate account
        try {
          const user = await User.findOne({ $or: [ {email}, {email: identifier} ]}).select('+password')

          if (!user) { throw new Error('Invalid email or phone filed User not found') }

          if(!await bcrypt.compare(password, user.password)) { throw new Error('Invalid password') }

          user.password = password

          return ({
            user,
            token: this.generateToken({ id: user._id }),
          })
        } catch (err) {
            console.log(err);
            throw new Error('Authenticate failed ' + err?.message )
        }
    }

    async forgotpass ({ identifier, redirectUrl }) {
        try {
          const user = await User.findOne({ $or: [{email: identifier} ] })

          if (!user) { throw new Error('Invalid email or phone filed User not found') }

          const passwordResetToken = crypto.randomBytes(20).toString('hex')

          let url = 'http://localhost/resetpass'

          if (redirectUrl) {
            url = redirectUrl.replace(/\{\{([a-z0-9]+)\}\}/gi, passwordResetToken)
          }

          const passwordResetExpires = new Date()

          const now = new Date()

          const expiresHours = 1;

          passwordResetExpires.setHours(now.getHours() + expiresHours)

          await User.updateOne({ _id: user._id, passwordResetToken, passwordResetExpires })

         transporter.sendMail({
            to: user.email,
            from: 'simplechatpop@gmail.com',
            template: 'auth/forgotpass',
            context: { token: passwordResetToken, url, expiresHours }
          })

          return ({ message: "send link in email andress for forgotpass" })
        } catch (err) { throw new Error('Error on forgot password, try again ' + err?.message) }
    }

    async resetpass ({ token, password }) {
        try {
            if (password.length < 8) { throw new Error('Error password it s smaller than 8') }

            const user = await User.findOne({ passwordResetToken: token }).select('+passwordResetExpires')

            if (!user) { throw new Error('User not found or Token invalid') }

            const now = new Date()

            if(now > user.passwordResetExpires) { throw new Error('Token expired, generate a new one') }

            user.password = password

            await user.save()

            return ({ message: 'password as reset, using you new password' })
        } catch (err) { throw new Error('Cannot reset password, try again ' + err?.message) }
    }

    async updatepass ({ user: userId, password, newPassword }) {
        try {
          console.log('enter');
            const user = await User.findById(userId).select('+password')

            if (!user) { throw new Error('User not found or Token invalid') }

            if(!await bcrypt.compare(password, user.password)) { throw new Error('Invalid user password') }

            if (newPassword.length < 8) { throw new Error('Error new password it s smaller than 8') }

            user.password = newPassword

            await user.save()

            return ({ message: 'password as updated, using you new password' })
        } catch (err) {
          console.log(err);
          throw new Error('Cannot reset password, try again ' + err?.message)
        }
    }

    async verifyemail ({ email, num }) {
        try {
          const user = await User.findOne({ email })

          if (!user) { throw new Error('Invalid email filed User not found') }

          const emailVerifyCode = generatePinCode(num);

          const emailVerifyExpires = new Date();

          const now = new Date();

          const expiresHours = 1;

          emailVerifyExpires.setHours(now.getHours() + expiresHours)

          await User.updateOne({ _id: user._id, emailVerifyCode, emailVerifyExpires })

         transporter.sendMail({
            to: user.email,
            from: 'simplechatpop@gmail.com',
            template: 'auth/verifyemail',
            context: { code: emailVerifyCode }
          })

          return ({ message: "send link in email andress for forgotpass" })
        } catch (err) { throw new Error('Error on forgot password, try again ' + err?.message) }
    }

    async emailVerifyCode ({ email, code }) {
      try {
        if (!await User.findOne({ email, emailVerifyCode: code })) { throw new Error('This email has exists or code invalid.') }

        return ({ message: 'email as verify, by code.' })
      } catch (err) { throw new Error('Cannot reset email, try again ' + err?.message) }
    }

    async resetemail ({ code, email }) {
        try {
            if ((await User.find({ email })).length > 1) { throw new Error('This email has exists in other User.') }

            const user = await User.findOne({ emailVerifyCode: code }).select('+emailVerifyExpires')

            if (!user) { throw new Error('User not found or Code invalid') }

            const now = new Date()

            if(now > user.emailVerifyExpires) { throw new Error('Code expired, generate a new one') }

            user.email = email

            await user.save()

            return ({ message: 'email as reset, using you new email' })
        } catch (err) {
          console.log(err);
          throw new Error('Cannot reset email, try again ' + err?.message)
        }
    }
}

module.exports = new AuthService()
