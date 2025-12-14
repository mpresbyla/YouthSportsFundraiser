import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId: number = 1, role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Fundraiser Templates", () => {
  it("creates a raffle fundraiser with items and tiers", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // First create team membership for the test user
    await caller.role.assignRole({ teamId: 1, userId: ctx.user!.id, role: "manager" });

    // Create fundraiser with raffle template
    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Spring Raffle",
      description: "Win amazing prizes!",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "raffle",
      goalAmount: 500000, // $5000
    });

    expect(fundraiser.id).toBeTypeOf("number");

    // Add raffle items
    const item = await caller.templates.createRaffleItem({
      fundraiserId: fundraiser.id,
      title: "iPad Pro",
      description: "Latest model with 256GB storage",
    });

    expect(item.id).toBeTypeOf("number");
    expect(item.title).toBe("iPad Pro");

    // Create raffle tiers
    const tiers = await caller.templates.createRaffleTiers({
      fundraiserId: fundraiser.id,
      tiers: [
        { price: 1000, entries: 1, label: "1 Entry" },
        { price: 2500, entries: 3, label: "3 Entries" },
        { price: 5000, entries: 10, label: "10 Entries" },
      ],
    });

    expect(tiers.length).toBe(3);
    expect(tiers[0]?.price).toBe(1000);
    expect(tiers[0]?.entries).toBe(1);
  });

  it("creates a calendar fundraiser with dates", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Pick-a-Date Calendar",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "calendar",
      goalAmount: 310000, // $3100 (31 days * $100)
    });

    // Create calendar dates for March 2025
    const dates = await caller.templates.createCalendarDates({
      fundraiserId: fundraiser.id,
      month: "2025-03",
      basePrice: 10000, // $100 base price
    });

    expect(dates.length).toBe(31); // March has 31 days
    expect(dates[0]?.date).toMatch(/2025-03-01/);
    expect(dates[0]?.price).toBe(10000);
  });

  it("creates a Super Bowl squares grid", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Super Bowl Squares 2025",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "squares",
      goalAmount: 1000000, // $10,000 (100 squares * $100)
    });

    const grid = await caller.templates.createSquaresGrid({
      fundraiserId: fundraiser.id,
      pricePerSquare: 10000, // $100 per square
      homeTeam: "Kansas City Chiefs",
      awayTeam: "San Francisco 49ers",
      eventDate: new Date("2025-02-09"),
    });

    expect(grid.length).toBe(100); // 10x10 grid
    expect(grid[0]?.homeNumber).toBeGreaterThanOrEqual(0);
    expect(grid[0]?.homeNumber).toBeLessThanOrEqual(9);
    expect(grid[0]?.awayNumber).toBeGreaterThanOrEqual(0);
    expect(grid[0]?.awayNumber).toBeLessThanOrEqual(9);
  });

  it("creates a head-to-head challenge fundraiser", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Coach's Challenge",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "challenge",
    });

    const goals = await caller.templates.createChallengeGoals({
      fundraiserId: fundraiser.id,
      goals: [
        { goalAmount: 100000, challengeDescription: "Coach shaves his beard" },
        { goalAmount: 250000, challengeDescription: "Coach dyes hair team colors" },
        { goalAmount: 500000, challengeDescription: "Coach does ice bucket challenge" },
      ],
    });

    expect(goals.length).toBe(3);
    expect(goals[0]?.goalAmount).toBe(100000);
    expect(goals[0]?.challengeDescription).toBe("Coach shaves his beard");
  });

  it("creates a donation matching fundraiser", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Sponsor Match Campaign",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "donation_matching",
      goalAmount: 1000000, // $10,000
    });

    const matching = await caller.templates.createDonationMatching({
      fundraiserId: fundraiser.id,
      sponsorName: "Local Business Inc",
      matchAmount: 500000, // $5000 match pool
      matchRatio: 100, // 100% match (dollar for dollar)
      expiresAt: new Date("2025-12-31"),
    });

    expect(matching.id).toBeTypeOf("number");
    expect(matching.sponsorName).toBe("Local Business Inc");
    expect(matching.matchAmount).toBe(500000);
    expect(matching.matchRatio).toBe(100);
  });

  it("retrieves raffle items for a fundraiser", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Test Raffle",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "raffle",
    });

    await caller.templates.createRaffleItem({
      fundraiserId: fundraiser.id,
      title: "Prize 1",
      description: "First prize",
    });

    await caller.templates.createRaffleItem({
      fundraiserId: fundraiser.id,
      title: "Prize 2",
      description: "Second prize",
    });

    const items = await caller.templates.getRaffleItems({ fundraiserId: fundraiser.id });
    expect(items.length).toBe(2);
    expect(items[0]?.title).toBe("Prize 1");
    expect(items[1]?.title).toBe("Prize 2");
  });

  it("retrieves calendar dates for a fundraiser", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.create({
      teamId: 1,
      title: "Calendar Test",
      fundraiserType: "direct_donation",
      fundraiserTemplate: "calendar",
    });

    await caller.templates.createCalendarDates({
      fundraiserId: fundraiser.id,
      month: "2025-06",
      basePrice: 5000,
    });

    const dates = await caller.templates.getCalendarDates({ fundraiserId: fundraiser.id });
    expect(dates.length).toBe(30); // June has 30 days
  });
});
