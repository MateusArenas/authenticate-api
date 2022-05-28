const SubService = require('../services/SubService');

const SubRouter = {
    Get: {
        ['/config']: async ({ params }, res) => {
            const config = await SubService.config({ })
            return res.json(config)
        },
        ['/invoice-preview/:customer/:subscription/:price']: async ({ params: { customer, subscription, price } }, res) => {
            const invoice = await SubService.invoicePreview({ customer, subscription, price })
            return res.json(invoice)
        },
        ['/subscriptions/:customer']: async ({ params: { customer } }, res) => {
            const invoice = await SubService.subscriptions({ customer })
            return res.json(invoice)
        },
    },
    Post: {
        ['/create-customer']: async ({ body: { email } }, res) => {
            const customer = await SubService.createCustomer({ email })
            return res.json(customer)
        },
        ['/create-subscription']: async ({ body: { customer, price } }, res) => {
            const subscription = await SubService.createSubscription({ customer, price })
            return res.json(subscription)
        },
    },
    Put: {
        ['/update-subscription/:subscription']: async ({ params: { subscription:sub }, body: { price } }, res) => {
            const subscription = await SubService.updateSubscription({ subscription:sub, price })
            return res.json(subscription)
        },
    },
    Delete: {
        ['/cancel-subscription/:subscription']: async ({ params: { subscription:sub } }, res) => {
            const subscription = await SubService.cancelSubscription({ subscription:sub })
            return res.json(subscription)
        },
    }
}

module.exports = SubRouter
