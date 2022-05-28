const AuthService = require('../services/AuthService');

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
    },
    Post: {
        ['/:type(register|signup)']: async ({ body: { email, username, password } }, res) => {
            const auth = await AuthService.register({ email, username, password })
            return res.json(auth)
        },
        ['/:type(authenticate|signin)']: async ({ body: { identifier, email, username, password } }, res) => {
            console.log({ email, password  });
            const auth = await AuthService.authenticate({ identifier, email, username, password })
            return res.json(auth)
        },
        ['/resetpass']: async ({ body: { token, password } }, res) => {
            const auth = await AuthService.resetpass({ token, password })
            return res.json(auth)
        },
    },
    Put: {
        ['/forgotpass/:identifier']: async ({ params: { identifier } }, res) => {
            const auth = await AuthService.forgotpass({ identifier })
            return res.json(auth)
        },
    }
}

module.exports = AuthRouter
