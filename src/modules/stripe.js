const Stripe = require('stripe');
const stripeConfig = require('../config/stripe.json');

const stripe = new Stripe(stripeConfig.secretKey, {
    apiVersion: '2020-08-27',
    appInfo: { // For sample support and debugging, not required for production:
        name: "authenticate-api/fixed-price",
        version: "0.0.1",
        url: "https://github.com/mateusarenas/authenticate-api"
    }
})

module.exports = stripe;