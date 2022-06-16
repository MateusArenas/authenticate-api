const express = require('express');
const stripe = require('../modules/stripe');
const endpointSecret = "whsec_c07a7975a14f6e93dea39f57abd95b41768376af6fda247c8f3a8fbc10235029";

const SubHook = {   
    Post: {
        ['/webhook']: async (req, res) => {
            // const auth = await AuthService.resetpass({ token, password })
            // return res.json(auth)

            const payloadString = JSON.stringify(req.body, null, 2);

            const header = stripe.webhooks.generateTestHeaderString({
                payload: payloadString,
                secret: endpointSecret,
            });

            let event;
        
            try {   
                event = stripe.webhooks.constructEvent(payloadString, header, endpointSecret);
            } catch (err) {
                console.log(err);
                console.log(`⚠️  Webhook signature verification failed.`);
                console.log(
                `⚠️  Check the env file and enter the correct webhook secret.`
                );
                return res.sendStatus(400);
            }

            // Extract the object from the event.
            const dataObject = event.data.object;

            // console.log(dataObject);
        
            // Handle the event
            // Review important events for Billing webhooks
            // https://stripe.com/docs/billing/webhooks
            // Remove comment to see the various objects sent for this sample
            switch (event.type) {
                case 'invoice.payment_succeeded':
                    console.log('hook: ', dataObject['billing_reason']);
                    if(dataObject['billing_reason'] == 'subscription_create') {

                        // The subscription automatically activates after successful payment
                        // Set the payment method used to pay the first invoice
                        // as the default payment method for that subscription
                        const subscription_id = dataObject['subscription']
                        const payment_intent_id = dataObject['payment_intent']
            
                        // Retrieve the payment intent used to pay the subscription
                        const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id);
            
                        const subscription = await stripe.subscriptions.update(
                        subscription_id,
                        {
                            default_payment_method: payment_intent.payment_method,
                        },
                        );
            
                        console.log("Default payment method set for subscription:" + payment_intent.payment_method);
                    }
        
                break;
                case 'invoice.payment_failed':
                // If the payment fails or the customer does not have a valid payment method,
                //  an invoice.payment_failed event is sent, the subscription becomes past_due.
                // Use this webhook to notify your user that their payment has
                // failed and to retrieve new card details.
                break;
                case 'invoice.finalized':
                // If you want to manually send out invoices to your customers
                // or store them locally to reference to avoid hitting Stripe rate limits.
                break;
                case 'customer.subscription.deleted':
                if (event.request != null) {
                    // handle a subscription cancelled by your request
                    // from above.
                } else {
                    // handle subscription cancelled automatically based
                    // upon your subscription settings.
                }
                break;
                case 'customer.subscription.trial_will_end':
                // Send notification to your user that the trial will end
                break;
                default:
                // Unexpected event type
            }
            res.sendStatus(200);
        },
    }
}

module.exports = SubHook