const SubService = require('../services/SubService');
const { authVerify } = require('../middlewares/auth')

const SubRouter = {
    Get: {
        ['/config']: async ({ params, headers: { authorization } }, res) => {
            const config = await SubService.config({ authorization })
            return res.json(config)
        },
        ['/subscriptions']: {
            ['/']: async ({ headers: { authorization:token } }, res) => await authVerify(token,
                async user => {
                    const subscriptions = await SubService.subscriptions({ user })
                    return res.json(subscriptions)
                }
            ),
            ['/:subscription']: async ({ params: { subscription }, headers: { authorization:token } }, res) => await authVerify(token,
                async user => {
                    const sub = await SubService.subscription({ user, subscription })
                    return res.json(sub)
                }
            ),
            ['/:subscription/invoice-preview-update/:price']: async ({ params: { subscription, price }, headers: { authorization:token } }, res) => await authVerify(token,
                async user => {
                    const invoice = await SubService.invoicePreviewUpdate({ user, subscription, price })
                    return res.json(invoice)
                }
            ),
        },
    },
    Post: {
        ['/create-customer']: async ({ body: { email }, headers: { authorization:token } }, res) => await authVerify(token,
            async user => {
                const customer = await SubService.createCustomer({ user, email })
                return res.json(customer)
            }
        ),
        ['/create-subscription']: async ({ body: { customer, price }, headers: { authorization:token } }, res) => await authVerify(token,
            async user => {
                console.log({ user, customer, price });
                const subscription = await SubService.createSubscription({ user, customer, price })
                return res.json(subscription)
            }
        ),
    },
    Put: {
        ['/update-subscription/:subscription']: async ({ params: { subscription:sub }, body: { price }, headers: { authorization:token } }, res) => await authVerify(token,
            async user => {
                const subscription = await SubService.updateSubscription({ subscription:sub, price, user })
                return res.json(subscription)
            }
        ),
        ['/update-payment-intent/:paymentIntent']: async ({ params: { paymentIntent:pi }, body: { payment_method, subscription }, headers: { authorization:token } }, res) => await authVerify(token,
            async user => {
                const paymentIntent = await SubService.updatePaymentIntent({ paymentIntent:pi, payment_method, subscription })
                return res.json(paymentIntent)
            }
        ),
    },
    Delete: {
        ['/cancel-subscription/:subscription']: async ({ params: { subscription:sub }, headers: { authorization:token } }, res) => await authVerify(token,
            async user => {
                const subscription = await SubService.cancelSubscription({ subscription:sub, user })
                return res.json(subscription)
            }
        )
    }
}

module.exports = SubRouter
