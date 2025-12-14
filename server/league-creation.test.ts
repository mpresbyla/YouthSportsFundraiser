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

describe("League Creation", () => {
  it("allows any authenticated user to create a league", async () => {
    const ctx = createTestContext(999, "user"); // Regular user, not admin
    const caller = appRouter.createCaller(ctx);

    const league = await caller.league.create({
      name: "Test Youth Soccer League",
      description: "A test league for youth soccer teams",
    });

    expect(league.id).toBeTypeOf("number");
    expect(league.name).toBe("Test Youth Soccer League");
    expect(league.description).toBe("A test league for youth soccer teams");
  });

  it("allows league creator to become admin automatically", async () => {
    const ctx = createTestContext(888, "user");
    const caller = appRouter.createCaller(ctx);

    const league = await caller.league.create({
      name: "Another Test League",
    });

    expect(league.id).toBeTypeOf("number");
    
    // The user should now be able to create teams in this league
    // (which requires being a league admin)
    const team = await caller.team.create({
      leagueId: league.id,
      name: "Test Team",
    });

    expect(team.id).toBeTypeOf("number");
    expect(team.leagueId).toBe(league.id);
  });

  it("lists all leagues publicly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a couple of leagues
    await caller.league.create({ name: "League 1" });
    await caller.league.create({ name: "League 2" });

    const leagues = await caller.league.list();
    
    expect(leagues.length).toBeGreaterThanOrEqual(2);
    expect(leagues.some(l => l.name === "League 1")).toBe(true);
    expect(leagues.some(l => l.name === "League 2")).toBe(true);
  });
});
