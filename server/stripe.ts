import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

// ============================================================================
// Stripe Connect - Account Management
// ============================================================================

/**
 * Create a Stripe Connect Standard account for a team
 */
export async function createConnectAccount(params: {
  email: string;
  teamName: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: "standard",
    email: params.email,
    business_profile: {
      name: params.teamName,
    },
    metadata: params.metadata,
  });
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
}

/**
 * Retrieve account details to check onboarding status
 */
export async function getAccountDetails(accountId: string): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

/**
 * Check if account can accept charges
 */
export async function isAccountReady(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const account = await stripe.accounts.retrieve(accountId);
  
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

// ============================================================================
// Payment Processing - Direct Donations
// ============================================================================

/**
 * Create a payment intent for immediate charge (direct donations)
 */
export async function createDirectPaymentIntent(params: {
  amount: number; // in cents
  connectedAccountId: string;
  platformFeeAmount: number; // in cents
  donorEmail: string;
  donorName: string;
  fundraiserId: number;
  description: string;
}): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: params.amount,
    currency: "usd",
    application_fee_amount: params.platformFeeAmount,
    receipt_email: params.donorEmail,
    description: params.description,
    metadata: {
      fundraiser_id: params.fundraiserId.toString(),
      donor_name: params.donorName,
      donor_email: params.donorEmail,
      payment_type: "direct_donation",
    },
    transfer_data: {
      destination: params.connectedAccountId,
    },
  });
}

// ============================================================================
// Payment Processing - Micro-Fundraisers (Pledge Authorization)
// ============================================================================

/**
 * Create a setup intent to authorize a payment method for future charges
 */
export async function createSetupIntent(params: {
  connectedAccountId: string;
  donorEmail: string;
  donorName: string;
  fundraiserId: number;
  pledgeId: number;
}): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      fundraiser_id: params.fundraiserId.toString(),
      pledge_id: params.pledgeId.toString(),
      donor_name: params.donorName,
      donor_email: params.donorEmail,
      payment_type: "micro_pledge",
    },
    on_behalf_of: params.connectedAccountId,
  });
}

/**
 * Create a customer for storing payment methods
 */
export async function createCustomer(params: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

// ============================================================================
// Payment Processing - Deferred Charging
// ============================================================================

/**
 * Charge a saved payment method (for micro-fundraisers after stats are entered)
 */
export async function chargePaymentMethod(params: {
  amount: number; // in cents
  paymentMethodId: string;
  customerId: string;
  connectedAccountId: string;
  platformFeeAmount: number; // in cents
  donorEmail: string;
  donorName: string;
  fundraiserId: number;
  pledgeId: number;
  description: string;
}): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: params.amount,
    currency: "usd",
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    off_session: true,
    confirm: true,
    application_fee_amount: params.platformFeeAmount,
    receipt_email: params.donorEmail,
    description: params.description,
    metadata: {
      fundraiser_id: params.fundraiserId.toString(),
      pledge_id: params.pledgeId.toString(),
      donor_name: params.donorName,
      donor_email: params.donorEmail,
      payment_type: "micro_pledge_charge",
    },
    transfer_data: {
      destination: params.connectedAccountId,
    },
  });
}

// ============================================================================
// Refunds
// ============================================================================

/**
 * Refund a payment
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // optional partial refund in cents
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amount,
    reason: params.reason,
  });
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Construct and verify a webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
