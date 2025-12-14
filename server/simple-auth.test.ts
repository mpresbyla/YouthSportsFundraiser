import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Simple Email/Password Authentication", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "password123";
  const testName = "Test User";

  // Clean up test user after tests
  async function cleanupTestUser() {
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, testEmail));
    }
  }

  beforeEach(async () => {
    await cleanupTestUser();
  });

  describe("Registration", () => {
    it("should register a new user with email and password", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.user.name).toBe(testName);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
    });

    it("should not allow duplicate email registration", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      // Register first time
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      // Try to register again with same email
      await expect(
        caller.auth.register({
          email: testEmail,
          password: "different-password",
          name: "Different Name",
        })
      ).rejects.toThrow();
    });

    it("should hash passwords before storing", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      // Check that password is hashed in database
      const db = await getDb();
      if (db) {
        const [user] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
        expect(user?.password).toBeDefined();
        expect(user?.password).not.toBe(testPassword);
        expect(user?.password?.startsWith("$2")).toBe(true); // bcrypt hash starts with $2
      }
    });
  });

  describe("Login", () => {
    beforeEach(async () => {
      // Create a test user before each login test
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      });
    });

    it("should login with correct credentials", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.token).toBeDefined();
    });

    it("should reject login with incorrect password", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.login({
          email: testEmail,
          password: "wrong-password",
        })
      ).rejects.toThrow();
    });

    it("should reject login with non-existent email", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          headers: {},
          protocol: "https",
        } as any,
        res: {
          cookie: () => {},
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.login({
          email: "nonexistent@example.com",
          password: testPassword,
        })
      ).rejects.toThrow();
    });
  });

  describe("Session Management", () => {
    it("should set cookie on successful login", async () => {
      let cookieSet = false;
      const ctx: TrpcContext = {
        user: null,
        req: {} as any,
        res: {
          cookie: (name: string, value: string, options: any) => {
            cookieSet = true;
            expect(name).toBe("session");
            expect(value).toBeDefined();
            expect(options.httpOnly).toBe(true);
          },
        } as any,
      };

      const caller = appRouter.createCaller(ctx);

      // Register and login
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      expect(cookieSet).toBe(true);
    });
  });
});
