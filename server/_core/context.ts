import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import cookie from "cookie";
import { COOKIE_NAME } from "../../shared/const";
import * as simpleAuth from "../simple-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First, try JWT auth (email/password)
  try {
    const cookies = cookie.parse(opts.req.headers.cookie || "");
    const token = cookies[COOKIE_NAME];

    if (token) {
      // Try to verify as JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.userId && typeof payload.userId === "number") {
        user = await simpleAuth.getUserById(payload.userId);
      }
    }
  } catch (jwtError) {
    // If JWT verification fails, try OAuth
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (oauthError) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
