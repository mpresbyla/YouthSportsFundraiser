import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "user" | "admin" = "user"): TrpcContext {
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

describe("Fundraiser Management", () => {
  it("should list all leagues", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();

    expect(Array.isArray(leagues)).toBe(true);
    expect(leagues.length).toBeGreaterThan(0);
  });

  it("should get league by ID", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();
    if (leagues.length === 0) {
      throw new Error("No leagues found for testing");
    }

    const league = await caller.league.getById({ id: leagues[0].id });

    expect(league).toBeDefined();
    expect(league.id).toBe(leagues[0].id);
    expect(league.name).toBeDefined();
  });

  it("should get teams for a league", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();
    if (leagues.length === 0) {
      throw new Error("No leagues found for testing");
    }

    const teams = await caller.league.getTeams({ leagueId: leagues[0].id });

    expect(Array.isArray(teams)).toBe(true);
  });

  it("should get team by ID", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();
    if (leagues.length === 0) {
      throw new Error("No leagues found for testing");
    }

    const teams = await caller.league.getTeams({ leagueId: leagues[0].id });
    if (teams.length === 0) {
      throw new Error("No teams found for testing");
    }

    const team = await caller.team.getById({ id: teams[0].id });

    expect(team).toBeDefined();
    expect(team.id).toBe(teams[0].id);
    expect(team.name).toBeDefined();
  });

  it("should get fundraisers for a team", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();
    if (leagues.length === 0) {
      throw new Error("No leagues found for testing");
    }

    const teams = await caller.league.getTeams({ leagueId: leagues[0].id });
    if (teams.length === 0) {
      throw new Error("No teams found for testing");
    }

    const fundraisers = await caller.team.getFundraisers({ teamId: teams[0].id });

    expect(Array.isArray(fundraisers)).toBe(true);
  });

  it("should get fundraiser by ID", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const leagues = await caller.league.list();
    if (leagues.length === 0) {
      throw new Error("No leagues found for testing");
    }

    const teams = await caller.league.getTeams({ leagueId: leagues[0].id });
    if (teams.length === 0) {
      throw new Error("No teams found for testing");
    }

    const fundraisers = await caller.team.getFundraisers({ teamId: teams[0].id });
    if (fundraisers.length === 0) {
      throw new Error("No fundraisers found for testing");
    }

    const fundraiser = await caller.fundraiser.getById({ id: fundraisers[0].id });

    expect(fundraiser).toBeDefined();
    expect(fundraiser.id).toBe(fundraisers[0].id);
    expect(fundraiser.title).toBeDefined();
    expect(fundraiser.fundraiserType).toMatch(/^(direct_donation|micro_fundraiser)$/);
  });
});

describe("Authentication and Authorization", () => {
  it("should return current user for authenticated request", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("should return null for unauthenticated request", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeNull();
  });

  it("should successfully logout", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
  });
});
