import Stripe from "stripe";
import * as db from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

export async function handleStripeWebhook(rawBody: string, signature: string): Promise<{ received: boolean }> {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    throw new Error("Invalid signature");
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      case "setup_intent.setup_failed":
        await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    throw error;
  }

  return { received: true };
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);

  // Update pledge status to charged
  const pledgeId = paymentIntent.metadata.pledge_id;
  if (pledgeId) {
    await db.updatePledgeStatus(parseInt(pledgeId), "charged");
  }

  // Update charge status if it exists
  const charges = await db.getChargesByPaymentIntent(paymentIntent.id);
  for (const charge of charges) {
    await db.updateChargeStatus(charge.id, {
      status: "succeeded",
      succeededAt: new Date(),
    });
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);

  const charges = await db.getChargesByPaymentIntent(paymentIntent.id);
  for (const charge of charges) {
    await db.updateChargeStatus(charge.id, {
      status: "failed",
      failureCode: paymentIntent.last_payment_error?.code || "unknown",
      failureMessage: paymentIntent.last_payment_error?.message || "Payment failed",
      failedAt: new Date(),
    });
  }
}

async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  console.log(`[Webhook] Setup succeeded: ${setupIntent.id}`);

  // Update pledge status to authorized
  const pledgeId = setupIntent.metadata?.pledge_id;
  if (pledgeId) {
    await db.updatePledgeStatus(parseInt(pledgeId), "authorized");
  }
}

async function handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
  console.log(`[Webhook] Setup failed: ${setupIntent.id}`);

  // Update pledge status to failed
  const pledgeId = setupIntent.metadata?.pledge_id;
  if (pledgeId) {
    await db.updatePledgeStatus(parseInt(pledgeId), "failed");
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Webhook] Charge refunded: ${charge.id}`);

  // Find the charge in our database by payment intent
  if (charge.payment_intent) {
    const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
    const charges = await db.getChargesByPaymentIntent(piId);
    
    for (const dbCharge of charges) {
      await db.updateChargeStatus(dbCharge.id, {
        status: "refunded",
        refundAmount: charge.amount_refunded,
        refundedAt: new Date(),
      });
    }
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`[Webhook] Account updated: ${account.id}`);

  // Update team's Stripe account status
  const teams = await db.getTeamsByStripeAccount(account.id);
  for (const team of teams) {
    await db.updateTeamStripeAccount(team.id, {
      stripeOnboardingCompleted: account.details_submitted || false,
      stripeChargesEnabled: account.charges_enabled || false,
      stripePayoutsEnabled: account.payouts_enabled || false,
    });
  }
}
