import AuthService from '../services/AuthService';
import { authVerify } from '../middlewares/auth';
import { Request, Response } from 'express';

const AuthRouter = {
    Get: {
        ['/recover']: async ({ headers: { authorization:token } }: Request, res: Response) => await authVerify(token,
            async auth => {
                const data = await AuthService.recover({ auth })
                return res.json(data)
            }
        ),
        ['/verify/:token']: async ({ params: { token } }: Request, res: Response) => {
            const auth = await AuthService.verify({ token })
            return res.json(auth)
        },
        // ['/verify/username/:username']: async ({ params: { username } }, res) => {
        //     const verify = await AuthService.verifyUsername({ username })
        //     return res.json(verify)
        // },
        ['/email/:email/verify/:code']: async ({ params: { email, code } }: Request, res: Response) => {
            const auth = await AuthService.emailVerifyCode({ email, code })
            return res.json(auth)
        },
    },
    Post: {
        ['/refresh-token']: async ({ body: { token } }: Request, res: Response) => {
            const data = await AuthService.refreshToken({ token })
            return res.json(data)
        },
        ['/:type(register|signup)']: async ({ body: { email, name, password } }: Request, res: Response) => {
            const auth = await AuthService.register({ email, name, password })
            return res.json(auth)
        },
        ['/:type(authenticate|signin)']: async ({ body: { identifier, email, password } }: Request, res: Response) => {
            const auth = await AuthService.authenticate({ identifier, email, password })
            return res.json(auth)
        },
        ['/resetpass']: async ({ body: { token, password } }: Request, res: Response) => {
            const auth = await AuthService.resetpass({ token, password })
            return res.json(auth)
        },
        ['/resetemail']: async ({ body: { code, email } }: Request, res: Response) => {
            const auth = await AuthService.resetemail({ code, email })
            return res.json(auth)
        },
    },
    Put: {
        ['/forgotpass/:identifier']: async ({ params: { identifier }, body: { redirectUrl } }: Request, res: Response) => {
            const auth = await AuthService.forgotpass({ identifier, redirectUrl })
            return res.json(auth)
        },
        ['/verifyemail/:email']: async ({ params: { email }, body: { num=5 } }: Request, res: Response) => {
            const auth = await AuthService.verifyemail({ email, num })
            return res.json(auth)
        },
        ['/updatepass']: async ({ body: { password, newPassword }, headers: { authorization:token } }: Request, res: Response) => await authVerify(token,
            async user => {
              console.log({ password, newPassword });
                const auth = await AuthService.updatepass({ user, password, newPassword })
                return res.json(auth)
            }
        ),
    }
}

export default AuthRouter
