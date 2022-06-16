const AuthService = require('../services/AuthService');
const { authVerify } = require('../middlewares/auth')

const AuthRouter = {
    Get: {
        ['/verify/:token']: async ({ params: { token } }, res) => {
            const auth = await AuthService.verify({ token })
            return res.json(auth)
        },
        ['/verify/username/:username']: async ({ params: { username } }, res) => {
            const verify = await AuthService.verifyUsername({ username })
            return res.json(verify)
        },
        ['/email/:email/verify/:code']: async ({ params: { email, code } }, res) => {
            const auth = await AuthService.emailVerifyCode({ email, code })
            return res.json(auth)
        },
    },
    Post: {
        ['/:type(register|signup)']: async ({ body: { email, name, password } }, res) => {
            const auth = await AuthService.register({ email, name, password })
            return res.json(auth)
        },
        ['/:type(authenticate|signin)']: async ({ body: { identifier, email, password } }, res) => {
            const auth = await AuthService.authenticate({ identifier, email, password })
            return res.json(auth)
        },
        ['/resetpass']: async ({ body: { token, password } }, res) => {
            const auth = await AuthService.resetpass({ token, password })
            return res.json(auth)
        },
        ['/resetemail']: async ({ body: { code, email } }, res) => {
            const auth = await AuthService.resetemail({ code, email })
            return res.json(auth)
        },
    },
    Put: {
        ['/forgotpass/:identifier']: async ({ params: { identifier }, body: { redirectUrl } }, res) => {
            const auth = await AuthService.forgotpass({ identifier, redirectUrl })
            return res.json(auth)
        },
        ['/verifyemail/:email']: async ({ params: { email }, body: { num=5 } }, res) => {
            const auth = await AuthService.verifyemail({ email, num })
            return res.json(auth)
        },
        ['/updatepass']: async ({ body: { password, newPassword }, headers: { authorization:token } }, res) => await authVerify(token,
            async user => {
              console.log({ password, newPassword });
                const auth = await AuthService.updatepass({ user, password, newPassword })
                return res.json(auth)
            }
        ),
    }
}

module.exports = AuthRouter
