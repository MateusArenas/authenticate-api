const stripeConfig = require('../config/stripe.json');
const stripe = require('../modules/stripe');
const { getAuthUser } = require('../middlewares/auth')

const User = require('../schemas/User');

class SubService {

    isUpdate(currentPrice, newPrice) {
        console.log({ new: newPrice.metadata, cur: currentPrice.metadata});
        return Number(newPrice.metadata?.['level']) >= Number(currentPrice.metadata?.['level'])
    }

    porrogationTime(unixStart, unixEnd, current, next, nowKey) {
        // ( (current / days) * (distance - usage) ) / ( (next / days) * (distance - usage) ) = ammonut
        // ammonut * (distance - usage) = days

        const periodStartAt = new Date(unixStart * 1000);
        const periodEndAt = new Date(unixEnd * 1000);

        function distanceOfDays (stampStart, stampEnd) {
            return Math.max(0, Math.floor((
                new Date(stampStart).getTime() -  new Date(stampEnd).getTime()
            ) / (1000 * 3600 * 24)));
        }

        function getDaysInMonth() {
            const date = new Date()
            return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        }

        const distance = distanceOfDays(periodEndAt.getTime(), periodStartAt.getTime());

        const monthDays = getDaysInMonth();

        const usageDays = distanceOfDays(periodStartAt.getTime(), Date.now())

        console.log({ distance, monthDays, usageDays });

        const currentAmount  = current.unit_amount / 100;
        const nextAmount  = next.unit_amount / 100;

        const amount = ((currentAmount / monthDays) * (distance - usageDays)) / ((nextAmount / monthDays) * (distance - usageDays))
        const days =  Math.floor(amount * (distance - usageDays))

        console.log({ days });

        const date = new Date()
        date.setDate(periodStartAt.getDate() + days);

        if (new Date() >= date) { return nowKey || Math.floor(Date.now() / 1000) }

        return Math.floor(date.getTime() / 1000)//seconds = unix
    }

    async config ({ authorization }) {
        const user = await getAuthUser(authorization)
        try {

            const prices = await stripe.prices.list({
                lookup_keys: ['starter', 'silver', 'premium'],
                expand: ['data.product']
            });

            const existsSubscription = await stripe.subscriptions.search({ query: `metadata[\'user\']:\'${user}\'` })

            prices.data.forEach(price => {
                price.self = !!existsSubscription.data?.[0]?.items?.data?.find?.(item => price?.id === item?.price?.id)
                if (price.self) {
                    price.status = existsSubscription.data?.[0]?.status;
                }
                price.cancel_at_period_end = existsSubscription.data?.[0]?.cancel_at_period_end
            })

            return ({
                prices: prices.data,
                publishableKey: stripeConfig.publicKey,
                subscriptionId: existsSubscription.data?.[0]?.id,
                clientSecret: existsSubscription.data?.[0]?.latest_invoice?.payment_intent?.client_secret,
            });
          } catch (err) { throw new Error("An error occured " + err?.message) }
    }

    async createCustomer ({ user, email }) {
        try {
            const existsCustomer = await stripe.customers.search({ query: `metadata[\'user\']:\'${user}\'` })

            if (existsCustomer.data.length) { throw new Error('this user has customer in stripe!') }

            const customer = await stripe.customers.create({
                email: email, metadata: { user }
            });

            return ({ customer })
        } catch (err) { throw new Error('Not created user ' + err?.message) }
    }

    async createSubscription ({ user, customer, price }) {
        // Simulate authenticated user. In practice this will be the
        // Stripe Customer ID related to the authenticated user.
        try {
            console.log('create init');
            const existsSubscription = await stripe.subscriptions.search({ query: `metadata[\'user\']:\'${user}\'` })

            if (existsSubscription.data.length > 0) { throw new Error('this user has subscription in stripe!') }
            console.log('existsSubscription final');

            const subscription = await stripe.subscriptions.create({
                customer, proration_behavior: 'none',
                items: [{ price }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata: { user }
            });
            console.log('create final');

            return ({
                subscriptionId: subscription?.id,
                clientSecret: subscription?.latest_invoice?.payment_intent?.client_secret,
            });
          } catch (err) { throw new Error("An error occured " + err?.message) }
    }

    async invoicePreviewUpdate ({ user, price: priceId, subscription: subscriptionId }) {
        try {
          const { data: [customer] } = await stripe.customers.search({ query: `metadata[\'user\']:\'${user}\'` });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const price = await stripe.prices.retrieve(priceId);

          const current = await stripe.invoices.retrieveUpcoming({
            customer: subscription.customer,
            subscription: subscription.schedule ? undefined : subscription.id,
            schedule: subscription.id ? undefined : subscription.schedule
        })

        //   if (price.id === subscription.items.data[0].price.id) { throw new Error('this price has updated!') }

        const periodEndUnix = this.porrogationTime(subscription.current_period_start, current.next_payment_attempt, subscription.items.data[0].price, price)

          let invoice;
          if (this.isUpdate(subscription.items.data[0].price, price)) { //update
            invoice = await stripe.invoices.retrieveUpcoming({
                customer: customer.id,
                subscription_proration_behavior: 'none',
                subscription_start_date: periodEndUnix,
                subscription_items: [{ price: priceId }],
            });
          } else { // downgrade
            invoice = await stripe.invoices.retrieveUpcoming({
                customer: customer.id,
                subscription_proration_behavior: 'none',
                subscription_start_date: current.period_end,
                subscription_items: [{ price: priceId }],
            });
          }

          return ({ invoice })
        } catch (err) {
            console.log(err);
            throw new Error('Authenticate failed ' + err?.message )
        }
    }

    async cancelSubscription ({ subscription: subscriptionId, user }) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          if (subscription.metadata['user'] !== user) { throw new Error('this subscription not provider for auth!') }

        //   const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
          const deletedSubscription = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

          return ({ subscription: deletedSubscription })
        } catch (err) {
            console.log(err);
            throw new Error('Error on forgot password, try again ' + err?.message)
        }
    }

    async updateSubscription ({ subscription: subscriptionId, price: priceId, user }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            if (subscription.metadata['user'] !== user) { throw new Error('this subscription not provider for auth!') }

            const price = await stripe.prices.retrieve(priceId);

            if (subscription.cancel_at_period_end) {
                const reative = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
                return ({ subscription: reative })
            }

            if (price.id === subscription.items.data[0].price.id) { throw new Error('this price has updated!') }

            const invoice = await stripe.invoices.retrieveUpcoming({
                customer: subscription.customer,
                subscription: subscription.schedule ? undefined : subscription.id,
                schedule: subscription.id ? undefined : subscription.schedule
            })

            if (subscription.schedule) { await stripe.subscriptionSchedules.release(subscription.schedule) }

            const subscriptionSchedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });

            let phases = [];
            if (this.isUpdate(subscription.items.data[0].price, price)) { //update

                const periodEndUnix = this.porrogationTime(
                    subscription.current_period_start,
                    invoice.next_payment_attempt,
                    subscription.items.data[0].price,
                    price,
                    'now'
                )

                phases = [
                    {
                        start_date: subscription.current_period_start,
                        end_date: periodEndUnix,
                        items: [{ price: priceId }],
                        proration_behavior: 'none',
                    },
                    {
                        start_date: periodEndUnix,
                        billing_cycle_anchor: 'phase_start',
                        items: [{ price: priceId }],
                        proration_behavior: 'none',
                    },
                ]


            } else {//downgrade
                phases = [
                    {
                        start_date: subscription.current_period_start,
                        end_date: invoice.period_end,
                        items: [{ price: subscription.items.data[0].price.id }],
                        proration_behavior: 'none',
                    },
                    {
                        start_date: invoice.period_end,
                        billing_cycle_anchor: 'phase_start',
                        items: [{ price: priceId }],
                        proration_behavior: 'none',
                    }
                ]
            }


            await stripe.subscriptionSchedules.update(subscriptionSchedule.id,
                { end_behavior: 'release', proration_behavior: 'none', phases }
            )


            return ({ subscription })
        } catch (err) {
            console.log(err);
            throw new Error('Failled to update subscription ' + err?.message)
        }
    }

    async updatePaymentIntent ({ paymentIntent: paymentIntentId, payment_method, subscription: subscriptionId }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            await stripe.paymentMethods.attach(payment_method, { customer: subscription.customer });

            await stripe.subscriptions.update(
                subscriptionId,
                {
                    default_payment_method: payment_method,
                },
            );

            return ({ paymentIntent })
        } catch (err) {
            console.log(err);
            throw new Error('Cannot reset password, try again ' + err?.message)
        }
    }

    async subscriptions ({ user }) {
        try {
            const { data: [customer] } = await stripe.customers.search({
                query: `metadata[\'user\']:\'${user}\'`,
            });

            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'all',
                expand: ['data.default_payment_method', 'data.latest_invoice.payment_intent'], //latest_invoice.period_end
            });

            await Promise.all(subscriptions.data.map(async subscription => {
                subscription.invoice = await stripe.invoices.retrieveUpcoming({
                    customer: customer.id,
                    subscription: subscription.schedule ? undefined : subscription.id,
                    schedule: subscription.id ? undefined : subscription.schedule
                })
            }))

            return ({
                subscriptions,
                // clientSecret: subscription?.latest_invoice?.payment_intent?.client_secret,
            })
        } catch (err) {
            console.log(err);
            throw new Error('Cannot reset password, try again ' + err?.message)
        }
    }

    async subscription ({ user, subscription: subscriptionId }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            if (subscription?.metadata?.user !== user) { throw new Error('this subscription not provider for auth!') }

            subscription.invoice = await stripe.invoices.retrieveUpcoming({
                customer: subscription.customer,
                subscription: subscription.schedule ? undefined : subscription.id,
                schedule: subscription.id ? undefined : subscription.schedule
            })

            return ({ subscription })
        } catch (err) {
            console.log(err);
            throw new Error('Cannot reset password, try again ' + err?.message)
        }
    }
}

module.exports = new SubService()
