import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET as string, {
    apiVersion: '2020-08-27',
    appInfo: { // For sample support and debugging, not required for production:
        name: "authenticate-api/fixed-price",
        version: "0.0.1",
        url: "https://github.com/mateusarenas/authenticate-api"
    }
})

export default stripe;