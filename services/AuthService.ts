import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../schemas/User'
import jwt from 'jsonwebtoken'
import transporter from '../modules/mailer'

const generatePinCode = require('generate-pincode')

class AuthService {

    generateToken (params = {}) {
        return jwt.sign(params, process.env.JWT_SECRET as string, { 
          // expiresIn: "1h" 
          expiresIn: "40s" 
        })
    }

    generateRefreshToken (params = {}) {
      return jwt.sign(params, process.env.JWT_SECRET as string, {
        expiresIn: "1d",
        audience: "RefreshToken.API",
        issuer: 'http://localhost',
        // tokenType: "rt+jwt",
      })
    }

    async refreshToken ({ token }: { token: string }) { //post
      try {
        if (!token) { throw new Error('not token provider!') }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string, {
          audience: "RefreshToken.API",
          issuer: 'http://localhost',
        });

        if (typeof decoded === 'string') { throw new Error('invalid token body format.') }

        return ({ 
          refreshtoken: this.generateRefreshToken({ id: decoded.id }), 
          token: this.generateToken({ id: decoded.id }), 
        })
      } catch (err) {
          console.log(err);
          throw new Error('Refresh Token failed ' + (err as Error)?.message )
      }
    }

    async register ({ name, email, password }: { name: string, email: string, password: string }) { // this controller as register account
        try {
            const verifiedToken = crypto.randomBytes(20).toString('hex')

            const user = await User.create({ name, email, password, verifiedToken })

            user.password = password

           transporter.sendMail({ to: user.email, from: process.env.MAIL_USER as string, template: 'auth/welcome',  } as any);

           transporter.sendMail({
                to: user.email,
                from: process.env.MAIL_USER as string,
                template: 'auth/verify',
                context: { url: `http://localhost/verify/${verifiedToken}` },
            } as any)

            return ({
                user,
                token: this.generateToken({ id: user._id }),
                refreshtoken: this.generateRefreshToken({ id: user._id }), 
            })
        } catch (err) {
            console.log(err);
            throw new Error('Not created user ' + (err as Error)?.message)
        }
    }

    async authenticate ({ identifier, email, password }: { identifier?: string, email?: string, password: string }) { // this controller as authenticate account
      try {
        const user = await User.findOne({ $or: [ {email}, {email: identifier} ]}).select('+password')

        if (!user) { throw new Error('Invalid email or phone filed User not found') }

        if(!await bcrypt.compare(password, user.password)) { throw new Error('Invalid password') }

        user.password = password

        return ({
          user,
          token: this.generateToken({ id: user._id }),
          refreshtoken: this.generateRefreshToken({ id: user._id }), 
        })
      } catch (err) {
          console.log(err);
          throw new Error('Authenticate failed ' + (err as Error)?.message )
      }
    }

    async verify ({ token }: { token: string }) { // this controller as verify account
        try {
            if (!token) { throw new Error("Not Token provider") }

            const user = await User.findOne({ verifiedToken: token });

            if (!user) { throw new Error("User invalid or link") }

            await User.updateOne({  _id: user._id }, { verified: true, $unset: { verifiedToken: "", expiredAt: "" } });

            return ({ message: "email verified sucessfully" });
          } catch (err) { throw new Error("An error occured " + (err as Error)?.message) }
    }

    async recover ({ auth }: { auth: string }) { 
        try {
          const user = await User.findById(auth)

          if (!user) { throw new Error('Invalid Auth') }

          return ({ user })
        } catch (err) {
            console.log(err);
            throw new Error('Recover failed ' + (err as Error)?.message )
        }
    }

    async forgotpass ({ identifier, redirectUrl }: { identifier: string, redirectUrl: string }) {
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
            from: process.env.MAIL_USER as string,
            template: 'auth/forgotpass',
            context: { token: passwordResetToken, url, expiresHours }
          } as any)

          return ({ message: "send link in email andress for forgotpass" })
        } catch (err) { throw new Error('Error on forgot password, try again ' + (err as Error)?.message ) }
    }

    async resetpass ({ token, password }: { token?: string, password: string }) {
        try {
            if (!token) { throw new Error('not token provider!') }

            if (password.length < 8) { throw new Error('Error password it s smaller than 8') }

            const user = await User.findOne({ passwordResetToken: token }).select('+passwordResetExpires')

            if (!user) { throw new Error('User not found or Token invalid') }

            const now = new Date()

            if(now > user?.passwordResetExpires) { throw new Error('Token expired, generate a new one') }

            user.password = password

            await user.save()

            return ({ message: 'password as reset, using you new password' })
        } catch (err) { throw new Error('Cannot reset password, try again ' + (err as Error)?.message ) }
    }

    async updatepass ({ user: userId, password, newPassword }: { user: string, password: string, newPassword: string }) {
        try {
            const user = await User.findById(userId).select('+password')

            if (!user) { throw new Error('User not found or Token invalid') }

            if(!await bcrypt.compare(password, user.password)) { throw new Error('Invalid user password') }

            if (newPassword.length < 8) { throw new Error('Error new password it s smaller than 8') }

            user.password = newPassword

            await user.save()

            return ({ message: 'password as updated, using you new password' })
        } catch (err) {
          console.log(err);
          throw new Error('Cannot reset password, try again ' + (err as Error)?.message )
        }
    }

    async verifyemail ({ email, num }: { email: string, num: number }) {
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
            from: process.env.MAIL_USER as string,
            template: 'auth/verifyemail',
            context: { code: emailVerifyCode }
          } as any)


          return ({ message: "send link in email andress for forgotpass" })
        } catch (err) { throw new Error('Error on forgot password, try again ' + (err as Error)?.message ) }
    }

    async emailVerifyCode ({ email, code }: { email: string, code: string }) {
      try {
        if (!await User.findOne({ email, emailVerifyCode: code })) { throw new Error('This email has exists or code invalid.') }

        return ({ message: 'email as verify, by code.' })
      } catch (err) { throw new Error('Cannot reset email, try again ' + (err as Error)?.message ) }
    }

    async resetemail ({ code, email }: { code: string, email: string }) {
        try {
            if ((await User.find({ email })).length > 1) { throw new Error('This email has exists in other User.') }

            const user = await User.findOne({ emailVerifyCode: code }).select('+emailVerifyExpires')

            if (!user) { throw new Error('User not found or Code invalid') }

            const now = new Date()

            if(now > user?.emailVerifyExpires) { throw new Error('Code expired, generate a new one') }

            user.email = email

            await user.save()

            return ({ message: 'email as reset, using you new email' })
        } catch (err) {
          console.log(err);
          throw new Error('Cannot reset email, try again ' + (err as Error)?.message )
        }
    }
}

export default new AuthService()




// async verifyUsername ({ username }) { // this controller as verify account
//   try {
//       if (!username) { throw new Error("Not username provider") }

//       if (!(/^[a-zA-Z0-9._]{0,28}[\w]+$/).test(username)) {
//         throw new Error("Please enter a valid Username format!")
//       }

//       if (await User.findOne({ username })) {

//           let sugestions = []

//           while (!sugestions.length) {
//               const verifiables = Array(9).fill().map((_, i) => username+Math.floor(Math.random() * 100) + i)

//               const exists = await User.find({ username: { $in: verifiables } }).distinct('username')

//               sugestions = verifiables.filter(verifiable => !exists.includes(verifiable))
//           }

//           return ({ status: false, sugestions });
//        }

//       return ({ status: true, sugestions: [] });
//     } catch (err) { throw new Error("An error occured " + err?.message) }
// }