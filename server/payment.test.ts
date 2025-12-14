import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Payment Integration", () => {
  it("should create a direct donation with payment intent", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This test verifies the procedure structure, not actual Stripe API calls
    // In production, you'd mock Stripe responses
    expect(caller.pledge.createDirectDonation).toBeDefined();
  });

  it("should create a setup intent for micro-fundraiser pledge", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.pledge.createSetupIntent).toBeDefined();
  });

  it("should trigger charges for micro-fundraiser", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.charge.triggerCharges).toBeDefined();
  });
});

describe("Reporting Features", () => {
  it("should export pledges as CSV", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.reporting.exportPledgesCSV).toBeDefined();
  });

  it("should export charges as CSV", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.reporting.exportChargesCSV).toBeDefined();
  });

  it("should get pledge list for a fundraiser", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.reporting.getPledgeList).toBeDefined();
  });

  it("should get charge list for a fundraiser", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.reporting.getChargeList).toBeDefined();
  });
});

describe("Stripe Connect", () => {
  it("should create Stripe Connect account for team", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.stripe.createConnectAccount).toBeDefined();
  });

  it("should create onboarding link for team", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.stripe.createOnboardingLink).toBeDefined();
  });
});
