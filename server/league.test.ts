import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(user?: AuthenticatedUser): TrpcContext {
  return {
    user: user || null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("League Router", () => {
  it("should list all leagues publicly", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();
    
    expect(Array.isArray(leagues)).toBe(true);
    // Should have at least the seeded leagues
    expect(leagues.length).toBeGreaterThan(0);
  });

  it("should get league by ID", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const league = await caller.league.getById({ id: 1 });
    
    expect(league).toBeDefined();
    expect(league?.id).toBe(1);
    expect(league?.name).toBeDefined();
  });

  it("should get teams for a league", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const teams = await caller.league.getTeams({ leagueId: 1 });
    
    expect(Array.isArray(teams)).toBe(true);
  });

  it("should require admin role to create league", async () => {
    const regularUser: AuthenticatedUser = {
      id: 999,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = createMockContext(regularUser);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.league.create({
        name: "Test League",
        description: "Test description",
      })
    ).rejects.toThrow("Only admins can create leagues");
  });
});

describe("Team Router", () => {
  it("should get team by ID", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const team = await caller.team.getById({ id: 1 });
    
    expect(team).toBeDefined();
    expect(team?.id).toBe(1);
    expect(team?.name).toBeDefined();
  });

  it("should get fundraisers for a team", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const fundraisers = await caller.team.getFundraisers({ teamId: 1 });
    
    expect(Array.isArray(fundraisers)).toBe(true);
  });
});

describe("Fundraiser Router", () => {
  it("should get fundraiser by ID", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const fundraiser = await caller.fundraiser.getById({ id: 1 });
    
    expect(fundraiser).toBeDefined();
    expect(fundraiser?.id).toBe(1);
    expect(fundraiser?.title).toBeDefined();
    expect(fundraiser?.fundraiserType).toMatch(/direct_donation|micro_fundraiser/);
  });
});
