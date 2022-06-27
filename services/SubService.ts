import stripe from '../modules/stripe';
import { getAuthUser } from '../middlewares/auth';

import User from '../schemas/User';
import Stripe from 'stripe';

class SubService {

    isUpdate(currentPrice: { metadata: { [x: string]: any; }; }, newPrice: { metadata: { [x: string]: any; }; }): boolean {
        return Number(newPrice.metadata?.['level']) >= Number(currentPrice.metadata?.['level'])
    }

    porrogationTime(unixStart: number, unixEnd: number, current: { unit_amount: number; }, next: { unit_amount: number; }, nowKey?: string | undefined): number | string {
        // ( (current / days) * (distance - usage) ) / ( (next / days) * (distance - usage) ) = ammonut
        // ammonut * (distance - usage) = days

        const periodStartAt = new Date(unixStart * 1000);
        const periodEndAt = new Date(unixEnd * 1000);

        function distanceOfDays (stampStart: string | number | Date, stampEnd: string | number | Date) {
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

    async config ({ authorization }: { authorization?: string }) {
        const user = await getAuthUser(authorization)
        try {

            const prices = await stripe.prices.list({
                lookup_keys: ['starter', 'silver', 'premium'],
                expand: ['data.product']
            });

            const existsSubscription = await stripe.subscriptions.search({ query: `metadata[\'user\']:\'${user}\'` })

            prices.data.forEach((price: any) => {
                price.self = !!existsSubscription.data?.[0]?.items?.data?.find?.((item: { price: { id: any; }; }) => price?.id === item?.price?.id)
                if (price.self) {
                    price.status = existsSubscription.data?.[0]?.status;
                }
                price.cancel_at_period_end = existsSubscription.data?.[0]?.cancel_at_period_end
            })

            if (typeof existsSubscription.data?.[0]?.latest_invoice !== 'object') { throw new Error("last invoice not expanded.") }

            if (typeof  existsSubscription.data?.[0]?.latest_invoice?.payment_intent !== 'object') { throw new Error("last invoice payment intent not expanded.") }

            return ({
                prices: prices.data,
                publishableKey: process.env.STRIPE_PUBLIC as string,
                subscriptionId: existsSubscription.data?.[0]?.id,
                clientSecret: existsSubscription.data?.[0]?.latest_invoice?.payment_intent?.client_secret as string,
            });
          } catch (err) { throw new Error("An error occured " + (err as Error)?.message) }
    }

    async createCustomer ({ user, email }: { user: string, email: string }) {
        try {
            const existsCustomer = await stripe.customers.search({ query: `metadata[\'user\']:\'${user}\'` })

            if (existsCustomer.data.length) { throw new Error('this user has customer in stripe!') }

            const customer = await stripe.customers.create({
                email: email, metadata: { user }
            });

            return ({ customer })
        } catch (err) { throw new Error('Not created user ' + (err as Error)?.message) }
    }

    async createSubscription ({ user, customer, price }: { user: string, customer: string, price: string }) {
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


            if (typeof subscription?.latest_invoice !== 'object') { throw new Error("last invoice not expanded.") }

            if (typeof subscription?.latest_invoice?.payment_intent !== 'object') { throw new Error("last invoice payment intent not expanded.") }

            return ({
                subscriptionId: subscription?.id,
                clientSecret: subscription?.latest_invoice?.payment_intent?.client_secret,
            });
          } catch (err) { throw new Error("An error occured " + (err as Error)?.message) }
    }

    async invoicePreviewUpdate ({ user, price: priceId, subscription: subscriptionId }: { user: string, price: string, subscription: string }) {
        try {
          const { data: [customer] } = await stripe.customers.search({ query: `metadata[\'user\']:\'${user}\'` });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const price = await stripe.prices.retrieve(priceId);

          const currentInvoiceParams: Stripe.InvoiceRetrieveUpcomingParams = { customer: subscription.customer as string };

          if (!subscription.schedule) { currentInvoiceParams.subscription = subscription.id as string }

          if (subscription.schedule) { currentInvoiceParams.schedule = subscription.schedule as string }

          const current = await stripe.invoices.retrieveUpcoming(currentInvoiceParams)

        //   if (price.id === subscription.items.data[0].price.id) { throw new Error('this price has updated!') }

        const params: Stripe.InvoiceRetrieveUpcomingParams = {
            customer: customer.id,
            subscription_proration_behavior: 'none',
            subscription_start_date: current.period_end, // default downgrade
            subscription_items: [{ price: priceId }],
        }

          if (this.isUpdate(subscription.items.data[0].price, price)) { //update
            params.subscription_start_date = this.porrogationTime(
                subscription.current_period_start as number, 
                current.next_payment_attempt as number, 
                subscription.items.data[0].price as any, 
                price as any
            ) as number;
          } 

          const invoice = await stripe.invoices.retrieveUpcoming(params);

          return ({ invoice })
        } catch (err) {
            console.log(err);
            throw new Error('Authenticate failed ' + (err as Error)?.message )
        }
    }

    async cancelSubscription ({ subscription: subscriptionId, user }: { subscription: string, user: string }) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          if (subscription.metadata['user'] !== user) { throw new Error('this subscription not provider for auth!') }

        //   const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
          const deletedSubscription = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

          return ({ subscription: deletedSubscription })
        } catch (err) {
            console.log(err);
            throw new Error('Error on forgot password, try again ' + (err as Error)?.message)
        }
    }

    async updateSubscription ({ subscription: subscriptionId, price: priceId, user }: { subscription: string, price: string, user: string }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            if (subscription.metadata['user'] !== user) { throw new Error('this subscription not provider for auth!') }

            const price = await stripe.prices.retrieve(priceId);

            if (subscription.cancel_at_period_end) {
                const reative = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
                return ({ subscription: reative })
            }

            if (price.id === subscription.items.data[0].price.id) { throw new Error('this price has updated!') }

            const params: Stripe.InvoiceRetrieveUpcomingParams = { customer: subscription.customer as string };

            if (!subscription.schedule) { params.subscription = subscription.id as string }

            if (subscription.schedule) { params.schedule = subscription.schedule as string }

            const invoice = await stripe.invoices.retrieveUpcoming(params)

            if (subscription.schedule) { await stripe.subscriptionSchedules.release(subscription.schedule as string) }

            const subscriptionSchedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });

            let phases = [] as any;
            if (this.isUpdate(subscription.items.data[0].price, price)) { //update

                const periodEndUnix = this.porrogationTime(
                    subscription.current_period_start,
                    invoice.next_payment_attempt as any,
                    subscription.items.data[0].price as any,
                    price as any,
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
            throw new Error('Failled to update subscription ' + (err as Error)?.message)
        }
    }

    async updatePaymentIntent ({ paymentIntent: paymentIntentId, payment_method, subscription: subscriptionId }: { paymentIntent: string, payment_method: string, subscription: string }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            await stripe.paymentMethods.attach(payment_method, { customer: subscription.customer as string });

            await stripe.subscriptions.update(
                subscriptionId,
                {
                    default_payment_method: payment_method,
                },
            );

            return ({ paymentIntent })
        } catch (err) {
            console.log(err);
            throw new Error('Cannot reset password, try again ' + (err as Error)?.message)
        }
    }

    async subscriptions ({ user }: { user: string }) {
        try {
            const { data: [customer] } = await stripe.customers.search({
                query: `metadata[\'user\']:\'${user}\'`,
            });

            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'all',
                expand: ['data.default_payment_method', 'data.latest_invoice.payment_intent'], //latest_invoice.period_end
            });

            await Promise.all(subscriptions.data.map(async (subscription: any) => {
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
            throw new Error('Cannot reset password, try again ' + (err as Error)?.message)
        }
    }

    async subscription ({ user, subscription: subscriptionId }: { user: string, subscription: string }) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            if (subscription?.metadata?.user !== user) { throw new Error('this subscription not provider for auth!') }

            const params: Stripe.InvoiceRetrieveUpcomingParams = { customer: subscription.customer as string };

            if (!subscription.schedule) { params.subscription = subscription.id as string }

            if (subscription.schedule) { params.schedule = subscription.schedule as string }

            const invoice = await stripe.invoices.retrieveUpcoming(params)

            return ({ subscription: { ...subscription, invoice } })
        } catch (err) {
            console.log(err);
            throw new Error('Cannot reset password, try again ' + (err as Error)?.message)
        }
    }
}

export default new SubService()
