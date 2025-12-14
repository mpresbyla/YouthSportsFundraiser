import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as stripeHelpers from "./stripe";

// ============================================================================
// Auth Router
// ============================================================================

const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ============================================================================
// League Router
// ============================================================================

const leagueRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllLeagues();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const league = await db.getLeagueById(input.id);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      return league;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        logoUrl: z.string().url().optional(),
        defaultFeePercentage: z.number().min(0).max(100).optional(),
        allowedFundraiserTypes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Any authenticated user can create a league
      // They will automatically become the league admin

      const result = await db.createLeague(input);
      const leagueId = result[0].insertId;
      
      // Assign creator as league admin
      await db.assignLeagueAdmin(leagueId, ctx.user.id);
      
      await db.logAudit({
        userId: ctx.user.id,
        action: "league.create",
        entityType: "league",
        entityId: leagueId,
        metadata: { name: input.name },
      });

      // Return the full league object
      const league = await db.getLeagueById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create league" });
      }
      return league;
    }),

  getTeams: publicProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ input }) => {
      return db.getTeamsByLeague(input.leagueId);
    }),
});

// ============================================================================
// Team Router
// ============================================================================

const teamRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const team = await db.getTeamById(input.id);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }
      return team;
    }),

  create: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        logoUrl: z.string().url().optional(),
        feePercentage: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is league admin
      const isAdmin = await db.isLeagueAdmin(ctx.user.id, input.leagueId);
      if (!isAdmin && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only league admins can create teams" });
      }

      const result = await db.createTeam(input);
      const teamId = result[0].insertId;

      await db.logAudit({
        userId: ctx.user.id,
        action: "team.create",
        entityType: "team",
        entityId: teamId,
        metadata: { name: input.name, leagueId: input.leagueId },
      });

      // Return the full team object
      const team = await db.getTeamById(teamId);
      if (!team) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create team" });
      }
      return team;
    }),

  // Stripe Connect onboarding
  createStripeAccount: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this team" });
      }

      const team = await db.getTeamById(input.teamId);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // Create Stripe Connect account
      const account = await stripeHelpers.createConnectAccount({
        email: ctx.user.email || "",
        teamName: team.name,
        metadata: {
          team_id: input.teamId.toString(),
          league_id: team.leagueId.toString(),
        },
      });

      // Save account ID
      await db.updateTeamStripeAccount(input.teamId, {
        stripeAccountId: account.id,
      });

      await db.logAudit({
        userId: ctx.user.id,
        action: "team.stripe_account_created",
        entityType: "team",
        entityId: input.teamId,
        metadata: { stripeAccountId: account.id },
      });

      return { accountId: account.id };
    }),

  createStripeOnboardingLink: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const team = await db.getTeamById(input.teamId);
      if (!team || !team.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe account not created" });
      }

      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const accountLink = await stripeHelpers.createAccountLink({
        accountId: team.stripeAccountId,
        refreshUrl: `${origin}/team/${input.teamId}/stripe-refresh`,
        returnUrl: `${origin}/team/${input.teamId}/stripe-return`,
      });

      return { url: accountLink.url };
    }),

  checkStripeStatus: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const team = await db.getTeamById(input.teamId);
      if (!team || !team.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe account not created" });
      }

      const status = await stripeHelpers.isAccountReady(team.stripeAccountId);

      // Update team record
      await db.updateTeamStripeAccount(input.teamId, {
        stripeOnboardingCompleted: status.detailsSubmitted,
        stripeChargesEnabled: status.chargesEnabled,
        stripePayoutsEnabled: status.payoutsEnabled,
      });

      return status;
    }),

  getFundraisers: publicProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      return db.getFundraisersByTeam(input.teamId);
    }),
});

// ============================================================================
// Fundraiser Router
// ============================================================================

const fundraiserRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const fundraiser = await db.getFundraiserById(input.id);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fundraiser not found" });
      }
      return fundraiser;
    }),

  create: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        fundraiserType: z.enum(["direct_donation", "micro_fundraiser"]),
        goalAmount: z.number().optional(),
        config: z.string().optional(), // JSON string for micro-fundraiser config
      })
    )
    .mutation(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await db.createFundraiser(input);
      const fundraiserId = result[0].insertId;

      await db.logAudit({
        userId: ctx.user.id,
        action: "fundraiser.create",
        entityType: "fundraiser",
        entityId: fundraiserId,
        metadata: { title: input.title, type: input.fundraiserType },
      });

      return { id: fundraiserId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "paused", "completed", "cancelled"]).optional(),
        goalAmount: z.number().optional(),
        config: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.id);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { id, ...updateData } = input;
      await db.updateFundraiser(id, updateData);

      await db.logAudit({
        userId: ctx.user.id,
        action: "fundraiser.update",
        entityType: "fundraiser",
        entityId: id,
        metadata: updateData,
      });

      return { success: true };
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.id);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify team has Stripe set up
      const team = await db.getTeamById(fundraiser.teamId);
      if (!team?.stripeChargesEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team must complete Stripe onboarding first",
        });
      }

      await db.updateFundraiser(input.id, {
        status: "active",
        publishedAt: new Date(),
      });

      await db.logAudit({
        userId: ctx.user.id,
        action: "fundraiser.publish",
        entityType: "fundraiser",
        entityId: input.id,
      });

      return { success: true };
    }),

  getPledges: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.getPledgesByFundraiser(input.fundraiserId);
    }),

  getStats: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.getStatsByFundraiser(input.fundraiserId);
    }),

  enterStats: protectedProcedure
    .input(
      z.object({
        fundraiserId: z.number(),
        metricName: z.string(),
        metricValue: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (fundraiser.fundraiserType !== "micro_fundraiser") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stats only for micro-fundraisers" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await db.createStatsEntry({
        fundraiserId: input.fundraiserId,
        metricName: input.metricName,
        metricValue: input.metricValue,
        enteredBy: ctx.user.id,
        notes: input.notes,
      });

      await db.logAudit({
        userId: ctx.user.id,
        action: "fundraiser.stats_entered",
        entityType: "fundraiser",
        entityId: input.fundraiserId,
        metadata: { metricName: input.metricName, metricValue: input.metricValue },
      });

      return { id: result[0].insertId };
    }),
});

// ============================================================================
// Pledge Router (Public - for donors)
// ============================================================================

const pledgeRouter = router({
  // Create setup intent for micro-pledge authorization
  createSetupIntent: publicProcedure
    .input(
      z.object({
        fundraiserId: z.number(),
        donorName: z.string(),
        donorEmail: z.string().email(),
        donorPhone: z.string().optional(),
        baseAmount: z.number().positive(),
        capAmount: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser || fundraiser.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Fundraiser not available" });
      }

      if (fundraiser.fundraiserType !== "micro_fundraiser") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Wrong fundraiser type" });
      }

      const team = await db.getTeamById(fundraiser.teamId);
      if (!team?.stripeAccountId || !team.stripeChargesEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team payment not configured" });
      }

      // Create customer
      const customer = await stripeHelpers.createCustomer({
        email: input.donorEmail,
        name: input.donorName,
        metadata: {
          fundraiser_id: input.fundraiserId.toString(),
        },
      });

      // Create pledge record
      const pledgeResult = await db.createPledge({
        fundraiserId: input.fundraiserId,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        pledgeType: "micro_pledge",
        baseAmount: input.baseAmount,
        capAmount: input.capAmount,
        finalAmount: 0, // Will be calculated later
        platformFee: 0, // Will be calculated later
        stripeCustomerId: customer.id,
        status: "pending_authorization",
      });

      const pledgeId = pledgeResult[0].insertId;

      // Create setup intent
      const setupIntent = await stripeHelpers.createSetupIntent({
        connectedAccountId: team.stripeAccountId,
        donorEmail: input.donorEmail,
        donorName: input.donorName,
        fundraiserId: input.fundraiserId,
        pledgeId: pledgeId,
      });

      // Update pledge with setup intent ID
      await db.updatePledge(pledgeId, {
        stripeSetupIntentId: setupIntent.id,
      });

      return {
        pledgeId,
        clientSecret: setupIntent.client_secret,
      };
    }),

  // Confirm pledge authorization
  confirmPledge: publicProcedure
    .input(
      z.object({
        pledgeId: z.number(),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const pledge = await db.getPledgeById(input.pledgeId);
      if (!pledge) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!pledge.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Customer not found" });
      }

      // Attach payment method to customer
      await stripeHelpers.attachPaymentMethod(input.paymentMethodId, pledge.stripeCustomerId);

      // Update pledge
      await db.updatePledge(input.pledgeId, {
        stripePaymentMethodId: input.paymentMethodId,
        status: "authorized",
        authorizedAt: new Date(),
      });

      // Update fundraiser total
      const fundraiser = await db.getFundraiserById(pledge.fundraiserId);
      if (fundraiser) {
        await db.updateFundraiser(pledge.fundraiserId, {
          totalAmountPledged: (fundraiser.totalAmountPledged || 0) + pledge.baseAmount,
        });
      }

      return { success: true };
    }),

  // Create direct donation payment intent
  createDirectDonation: publicProcedure
    .input(
      z.object({
        fundraiserId: z.number(),
        donorName: z.string(),
        donorEmail: z.string().email(),
        donorPhone: z.string().optional(),
        amount: z.number().positive(),
        donorTip: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser || fundraiser.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Fundraiser not available" });
      }

      if (fundraiser.fundraiserType !== "direct_donation") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Wrong fundraiser type" });
      }

      const team = await db.getTeamById(fundraiser.teamId);
      if (!team?.stripeAccountId || !team.stripeChargesEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team payment not configured" });
      }

      const league = await db.getLeagueById(team.leagueId);
      const feePercentage = team.feePercentage ?? league?.defaultFeePercentage ?? 5;
      const platformFee = Math.round((input.amount * feePercentage) / 100);
      const donorTip = input.donorTip ?? 0;
      const totalAmount = input.amount + donorTip;

      // Create payment intent
      const paymentIntent = await stripeHelpers.createDirectPaymentIntent({
        amount: totalAmount,
        connectedAccountId: team.stripeAccountId,
        platformFeeAmount: platformFee,
        donorEmail: input.donorEmail,
        donorName: input.donorName,
        fundraiserId: input.fundraiserId,
        description: `Donation to ${fundraiser.title}`,
      });

      // Create pledge record
      const pledgeResult = await db.createPledge({
        fundraiserId: input.fundraiserId,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        pledgeType: "direct_donation",
        baseAmount: input.amount,
        finalAmount: totalAmount,
        platformFee: platformFee,
        donorTip: donorTip,
        stripePaymentIntentId: paymentIntent.id,
        status: "pending_authorization",
      });

      return {
        pledgeId: pledgeResult[0].insertId,
        clientSecret: paymentIntent.client_secret,
      };
    }),
});

// ============================================================================
// Charge Router (Protected - for team managers)
// ============================================================================

const chargeRouter = router({
  // Trigger charges for a micro-fundraiser after stats are entered
  triggerCharges: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (fundraiser.fundraiserType !== "micro_fundraiser") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only for micro-fundraisers" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Get stats
      const stats = await db.getStatsByFundraiser(input.fundraiserId);
      if (stats.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No stats entered yet" });
      }

      const latestStats = stats[stats.length - 1];
      const multiplier = latestStats.metricValue;

      // Get all authorized pledges
      const pledges = await db.getPledgesByFundraiser(input.fundraiserId);
      const authorizedPledges = pledges.filter(p => p.status === "authorized");

      const team = await db.getTeamById(fundraiser.teamId);
      if (!team?.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team Stripe not configured" });
      }

      const league = await db.getLeagueById(team.leagueId);
      const feePercentage = team.feePercentage ?? league?.defaultFeePercentage ?? 5;

      const results = [];

      for (const pledge of authorizedPledges) {
        try {
          // Calculate final amount
          let calculatedAmount = pledge.baseAmount * multiplier;
          if (pledge.capAmount && calculatedAmount > pledge.capAmount) {
            calculatedAmount = pledge.capAmount;
          }

          const platformFee = Math.round((calculatedAmount * feePercentage) / 100);
          const totalAmount = calculatedAmount + (pledge.donorTip || 0);

          // Charge the payment method
          const paymentIntent = await stripeHelpers.chargePaymentMethod({
            amount: totalAmount,
            paymentMethodId: pledge.stripePaymentMethodId!,
            customerId: pledge.stripeCustomerId!,
            connectedAccountId: team.stripeAccountId,
            platformFeeAmount: platformFee,
            donorEmail: pledge.donorEmail,
            donorName: pledge.donorName,
            fundraiserId: input.fundraiserId,
            pledgeId: pledge.id,
            description: `Charge for ${fundraiser.title} - ${multiplier} ${latestStats.metricName}`,
          });

          // Update pledge
          await db.updatePledge(pledge.id, {
            multiplier: multiplier,
            calculatedAmount: calculatedAmount,
            finalAmount: totalAmount,
            platformFee: platformFee,
            stripePaymentIntentId: paymentIntent.id,
            status: "charged",
            chargedAt: new Date(),
          });

          // Create charge record
          await db.createCharge({
            pledgeId: pledge.id,
            fundraiserId: input.fundraiserId,
            grossAmount: totalAmount,
            platformFee: platformFee,
            donorTip: pledge.donorTip || 0,
            netAmount: totalAmount - platformFee,
            stripePaymentIntentId: paymentIntent.id,
            status: "succeeded",
          });

          results.push({ pledgeId: pledge.id, success: true });
        } catch (error: any) {
          // Record failure
          await db.updatePledge(pledge.id, {
            status: "failed",
          });

          await db.createCharge({
            pledgeId: pledge.id,
            fundraiserId: input.fundraiserId,
            grossAmount: 0,
            platformFee: 0,
            donorTip: 0,
            netAmount: 0,
            status: "failed",
            failureCode: error.code,
            failureMessage: error.message,
          });

          results.push({ pledgeId: pledge.id, success: false, error: error.message });
        }
      }

      // Update fundraiser totals
      const allPledges = await db.getPledgesByFundraiser(input.fundraiserId);
      const totalCharged = allPledges
        .filter(p => p.status === "charged")
        .reduce((sum, p) => sum + (p.finalAmount || 0), 0);

      await db.updateFundraiser(input.fundraiserId, {
        totalAmountCharged: totalCharged,
        status: "completed",
        completedAt: new Date(),
      });

      await db.logAudit({
        userId: ctx.user.id,
        action: "fundraiser.charges_triggered",
        entityType: "fundraiser",
        entityId: input.fundraiserId,
        metadata: { pledgesProcessed: results.length, multiplier },
      });

      return { results };
    }),

  getCharges: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.getChargesByFundraiser(input.fundraiserId);
    }),
});

// ============================================================================
// Main App Router
// ============================================================================

// ============================================================================
// Stripe Router
// ============================================================================

const stripeRouter = router({
  createConnectAccount: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const team = await db.getTeamById(input.teamId);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // Create Stripe Connect account
      const account = await stripeHelpers.createConnectAccount({
        email: ctx.user.email || "",
        teamName: team.name,
        metadata: {
          team_id: input.teamId.toString(),
          league_id: team.leagueId.toString(),
        },
      });

      // Save account ID
      await db.updateTeamStripeAccount(input.teamId, {
        stripeAccountId: account.id,
      });

      await db.logAudit({
        userId: ctx.user.id,
        action: "team.stripe_account_created",
        entityType: "team",
        entityId: input.teamId,
        metadata: { stripeAccountId: account.id },
      });

      return { accountId: account.id };
    }),

  createOnboardingLink: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const team = await db.getTeamById(input.teamId);
      if (!team?.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe account found" });
      }

      const link = await stripeHelpers.createAccountLink({
        accountId: team.stripeAccountId,
        refreshUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/team/${input.teamId}/dashboard`,
        returnUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/team/${input.teamId}/dashboard`,
      });

      return { url: link.url };
    }),

  getAccountStatus: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ ctx, input }) => {
      const canManage = await db.canManageTeam(ctx.user.id, input.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const team = await db.getTeamById(input.teamId);
      if (!team?.stripeAccountId) {
        return { configured: false };
      }

      const account = await stripeHelpers.getAccountDetails(team.stripeAccountId);
      const status = {
        configured: true,
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
      };

      // Update team record
      await db.updateTeamStripeAccount(input.teamId, {
        stripeOnboardingCompleted: status.detailsSubmitted,
        stripeChargesEnabled: status.chargesEnabled,
        stripePayoutsEnabled: status.payoutsEnabled,
      });

      return status;
    }),
});

// ============================================================================
// Role Router
// ============================================================================

const roleRouter = router({
  getUserRole: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ ctx, input }) => {
      const roles = await db.getUserRoles(ctx.user.id);
      const teamRole = roles.find(r => r.teamId === input.teamId);
      return teamRole || null;
    }),
});

// ============================================================================
// Reporting Router
// ============================================================================

const reportingRouter = router({
  getPledgeList: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const pledges = await db.getPledgesByFundraiser(input.fundraiserId);
      return pledges;
    }),

  getChargeList: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const charges = await db.getChargesByFundraiser(input.fundraiserId);
      return charges;
    }),

  exportPledgesCSV: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const pledges = await db.getPledgesByFundraiser(input.fundraiserId);
      
      // Generate CSV
      const headers = ["ID", "Donor Name", "Email", "Phone", "Base Amount", "Cap Amount", "Status", "Created At"];
      const rows = pledges.map(p => [
        p.id.toString(),
        p.donorName,
        p.donorEmail,
        p.donorPhone || "",
        (p.baseAmount / 100).toFixed(2),
        p.capAmount ? (p.capAmount / 100).toFixed(2) : "",
        p.status,
        p.createdAt.toISOString(),
      ]);

      const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
      return { csv, filename: `pledges-${input.fundraiserId}-${Date.now()}.csv` };
    }),

  exportChargesCSV: protectedProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const charges = await db.getChargesByFundraiser(input.fundraiserId);
      
      // Generate CSV
      const headers = ["ID", "Pledge ID", "Gross Amount", "Net Amount", "Platform Fee", "Status", "Created At", "Succeeded At"];
      const rows = charges.map(c => [
        c.id.toString(),
        c.pledgeId.toString(),
        (c.grossAmount / 100).toFixed(2),
        (c.netAmount / 100).toFixed(2),
        (c.platformFee / 100).toFixed(2),
        c.status,
        c.createdAt.toISOString(),
        c.succeededAt?.toISOString() || "",
      ]);

      const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
      return { csv, filename: `charges-${input.fundraiserId}-${Date.now()}.csv` };
    }),
});

// ============================================================================
// Templates Router
// ============================================================================

import * as templatesDb from "./templates-db";

const templatesRouter = router({
  // Raffle
  createRaffleItem: protectedProcedure
    .input(z.object({
      fundraiserId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      sponsorName: z.string().optional(),
      sponsorLogoUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) throw new TRPCError({ code: "NOT_FOUND" });
      
      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      
      const itemId = await templatesDb.createRaffleItem(input);
      return { itemId };
    }),

  getRaffleItems: publicProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getRaffleItems(input.fundraiserId);
    }),

  createRaffleTiers: protectedProcedure
    .input(z.object({
      fundraiserId: z.number(),
      tiers: z.array(z.object({
        price: z.number(),
        entries: z.number(),
        label: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) throw new TRPCError({ code: "NOT_FOUND" });
      
      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      
      for (const tier of input.tiers) {
        await templatesDb.createRaffleTier({ fundraiserId: input.fundraiserId, ...tier });
      }
      return { success: true };
    }),

  getRaffleTiers: publicProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getRaffleTiers(input.fundraiserId);
    }),

  drawRaffleWinner: protectedProcedure
    .input(z.object({ itemId: z.number(), winnerPledgeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await templatesDb.drawRaffleWinner(input.itemId, input.winnerPledgeId);
      return { success: true };
    }),

  // Squares
  createSquaresGrid: protectedProcedure
    .input(z.object({
      fundraiserId: z.number(),
      pricePerSquare: z.number(),
      homeTeam: z.string(),
      awayTeam: z.string(),
      eventDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) throw new TRPCError({ code: "NOT_FOUND" });
      
      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      
      const gridId = await templatesDb.createSquaresGrid(input);
      return { gridId };
    }),

  getSquaresGrid: publicProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getSquaresGrid(input.fundraiserId);
    }),

  purchaseSquare: publicProcedure
    .input(z.object({
      gridId: z.number(),
      pledgeId: z.number(),
      squarePosition: z.number(),
      donorName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const purchaseId = await templatesDb.purchaseSquare(input);
      return { purchaseId };
    }),

  getSquaresPurchases: publicProcedure
    .input(z.object({ gridId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getSquaresPurchases(input.gridId);
    }),

  lockSquaresNumbers: protectedProcedure
    .input(z.object({ gridId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Generate random numbers
      const homeNumbers = Array.from({ length: 10 }, (_, i) => i).sort(() => Math.random() - 0.5);
      const awayNumbers = Array.from({ length: 10 }, (_, i) => i).sort(() => Math.random() - 0.5);
      
      await templatesDb.lockSquaresNumbers(input.gridId, homeNumbers, awayNumbers);
      return { homeNumbers, awayNumbers };
    }),

  // Challenge
  createChallengeGoals: protectedProcedure
    .input(z.object({
      fundraiserId: z.number(),
      goals: z.array(z.object({
        goalAmount: z.number(),
        challengeDescription: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) throw new TRPCError({ code: "NOT_FOUND" });
      
      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      
      for (const goal of input.goals) {
        await templatesDb.createChallengeGoal({ fundraiserId: input.fundraiserId, ...goal });
      }
      return { success: true };
    }),

  getChallengeGoals: publicProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getChallengeGoals(input.fundraiserId);
    }),

  completeChallengeGoal: protectedProcedure
    .input(z.object({ goalId: z.number(), completedDescription: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await templatesDb.completeChallengeGoal(input.goalId, input.completedDescription);
      return { success: true };
    }),

  // Calendar
  createCalendarDates: protectedProcedure
    .input(z.object({
      fundraiserId: z.number(),
      month: z.string(), // YYYY-MM
      basePrice: z.number(),
      specialDates: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) throw new TRPCError({ code: "NOT_FOUND" });
      
      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      
      // Generate all dates for the month
      const [year, month] = input.month.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const dates = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateValue = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const amount = (input.specialDates && input.specialDates[dateValue]) ?? input.basePrice;
        dates.push({
          fundraiserId: input.fundraiserId,
          dateValue,
          amount,
        });
      }
      
      await templatesDb.createCalendarDates(dates);
      return { success: true, datesCreated: dates.length };
    }),

  getCalendarDates: publicProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getCalendarDates(input.fundraiserId);
    }),

  purchaseCalendarDate: publicProcedure
    .input(z.object({
      dateId: z.number(),
      pledgeId: z.number(),
      purchaserName: z.string(),
    }))
    .mutation(async ({ input }) => {
      await templatesDb.purchaseCalendarDate(input.dateId, input.pledgeId, input.purchaserName);
      return { success: true };
    }),

  // Donation Matching
  createDonationMatching: protectedProcedure
    .input(z.object({
      fundraiserId: z.number(),
      sponsorName: z.string(),
      sponsorLogoUrl: z.string().optional(),
      matchAmount: z.number(),
      matchRatio: z.number().optional(),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fundraiser = await db.getFundraiserById(input.fundraiserId);
      if (!fundraiser) throw new TRPCError({ code: "NOT_FOUND" });
      
      const canManage = await db.canManageTeam(ctx.user.id, fundraiser.teamId);
      if (!canManage) throw new TRPCError({ code: "FORBIDDEN" });
      
      const matchingId = await templatesDb.createDonationMatching(input);
      return { matchingId };
    }),

  getDonationMatching: publicProcedure
    .input(z.object({ fundraiserId: z.number() }))
    .query(async ({ input }) => {
      return templatesDb.getDonationMatching(input.fundraiserId);
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  league: leagueRouter,
  team: teamRouter,
  fundraiser: fundraiserRouter,
  pledge: pledgeRouter,
  charge: chargeRouter,
  stripe: stripeRouter,
  role: roleRouter,
  reporting: reportingRouter,
  templates: templatesRouter,
});

export type AppRouter = typeof appRouter;
