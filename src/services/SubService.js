const stripe = require('../modules/stripe')

class SubService {

    async config ({  }) { 
        try {
            const prices = await stripe.prices.list({
                lookup_keys: ['sample_basic', 'sample_premium'],
                expand: ['data.product']
            });

            return ({ prices: prices.data });
          } catch (err) { throw new Error("An error occured " + err?.message) }
    }
    
    async createCustomer ({ email }) { 
        try {
            const customer = await stripe.customers.create({
                email: email,
            });

            return ({ customer })
        } catch (err) { throw new Error('Not created user ' + err?.message) }
    }

    async createSubscription ({ customer, price }) { 
        // Simulate authenticated user. In practice this will be the
        // Stripe Customer ID related to the authenticated user.
        try {
            const subscription = await stripe.subscriptions.create({
                customer,
                items: [{ price }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
            });

            return ({ 
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            });
          } catch (err) { throw new Error("An error occured " + err?.message) }
    }

    async invoicePreview ({ customer, price, subscription: subscriptionId }) { // this controller as authenticate account
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const invoice = await stripe.invoices.retrieveUpcoming({
            customer,
            subscription: subscriptionId,
            subscription_items: [{ id: subscription.items.data[0].id, price }],
          });

          return ({ invoice })
        } catch (err) { throw new Error('Authenticate failed ' + err?.message ) }
    }

    async cancelSubscription ({ subscription }) {
        try {
          const deletedSubscription = await stripe.subscriptions.del(subscription);

          return ({ subscription: deletedSubscription })
        } catch (err) { throw new Error('Error on forgot password, try again ' + err?.message) }
    }

    async updateSubscription ({ subscription: subscriptionId, price }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price,
                }],
            });

            return ({ subscription: updatedSubscription })
        } catch (err) { throw new Error('Cannot reset password, try again ' + err?.message) }
    }

    async subscriptions ({ customer }) {
        try {
            const subscriptions = await stripe.subscriptions.list({
                customer,
                status: 'all',
                expand: ['data.default_payment_method'],
            });

            return ({ subscriptions })
        } catch (err) { throw new Error('Cannot reset password, try again ' + err?.message) }
    }
}

module.exports = new SubService()
