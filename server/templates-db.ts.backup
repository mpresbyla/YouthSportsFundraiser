import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  raffleItems,
  raffleTiers,
  squaresGrids,
  squaresPurchases,
  squaresPayouts,
  challengeGoals,
  teamVsTeamMatches,
  calendarDates,
  donationMatching,
  type InsertRaffleItem,
  type InsertRaffleTier,
  type InsertSquaresGrid,
  type InsertSquaresPurchase,
  type InsertSquaresPayout,
  type InsertChallengeGoal,
  type InsertTeamVsTeamMatch,
  type InsertCalendarDate,
  type InsertDonationMatching,
} from "../drizzle/schema";

// ============================================================================
// RAFFLE HELPERS
// ============================================================================

export async function createRaffleItem(item: InsertRaffleItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(raffleItems).values(item);
  return result.insertId;
}

export async function getRaffleItems(fundraiserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(raffleItems).where(eq(raffleItems.fundraiserId, fundraiserId));
}

export async function createRaffleTier(tier: InsertRaffleTier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(raffleTiers).values(tier);
  return result.insertId;
}

export async function getRaffleTiers(fundraiserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(raffleTiers).where(eq(raffleTiers.fundraiserId, fundraiserId));
}

export async function drawRaffleWinner(itemId: number, winnerPledgeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(raffleItems)
    .set({ winnerPledgeId, drawnAt: new Date() })
    .where(eq(raffleItems.id, itemId));
}

// ============================================================================
// SQUARES HELPERS
// ============================================================================

export async function createSquaresGrid(grid: InsertSquaresGrid) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(squaresGrids).values(grid);
  return result.insertId;
}

export async function getSquaresGrid(fundraiserId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [grid] = await db.select().from(squaresGrids).where(eq(squaresGrids.fundraiserId, fundraiserId));
  return grid;
}

export async function purchaseSquare(purchase: InsertSquaresPurchase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(squaresPurchases).values(purchase);
  return result.insertId;
}

export async function getSquaresPurchases(gridId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(squaresPurchases).where(eq(squaresPurchases.gridId, gridId));
}

export async function lockSquaresNumbers(gridId: number, homeNumbers: number[], awayNumbers: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(squaresGrids)
    .set({
      homeNumbers: JSON.stringify(homeNumbers),
      awayNumbers: JSON.stringify(awayNumbers),
      numbersLocked: 1,
    })
    .where(eq(squaresGrids.id, gridId));
}

export async function createSquaresPayout(payout: InsertSquaresPayout) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(squaresPayouts).values(payout);
  return result.insertId;
}

export async function getSquaresPayouts(gridId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(squaresPayouts).where(eq(squaresPayouts.gridId, gridId));
}

// ============================================================================
// CHALLENGE HELPERS
// ============================================================================

export async function createChallengeGoal(goal: InsertChallengeGoal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(challengeGoals).values(goal);
  return result.insertId;
}

export async function getChallengeGoals(fundraiserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(challengeGoals).where(eq(challengeGoals.fundraiserId, fundraiserId));
}

export async function completeChallengeGoal(goalId: number, completedDescription: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(challengeGoals)
    .set({
      isCompleted: 1,
      completedDescription,
      completedAt: new Date(),
    })
    .where(eq(challengeGoals.id, goalId));
}

// ============================================================================
// TEAM VS TEAM HELPERS
// ============================================================================

export async function createTeamVsTeamMatch(match: InsertTeamVsTeamMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(teamVsTeamMatches).values(match);
  return result.insertId;
}

export async function getTeamVsTeamMatch(fundraiserId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [match] = await db.select().from(teamVsTeamMatches)
    .where(
      sql`${teamVsTeamMatches.fundraiser1Id} = ${fundraiserId} OR ${teamVsTeamMatches.fundraiser2Id} = ${fundraiserId}`
    );
  return match;
}

export async function completeTeamVsTeamMatch(matchId: number, winnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teamVsTeamMatches)
    .set({
      winnerId,
      completedAt: new Date(),
    })
    .where(eq(teamVsTeamMatches.id, matchId));
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

export async function createCalendarDates(dates: InsertCalendarDate[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(calendarDates).values(dates);
}

export async function getCalendarDates(fundraiserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(calendarDates).where(eq(calendarDates.fundraiserId, fundraiserId));
}

export async function purchaseCalendarDate(dateId: number, pledgeId: number, purchaserName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(calendarDates)
    .set({
      purchaserPledgeId: pledgeId,
      purchaserName,
      purchasedAt: new Date(),
    })
    .where(eq(calendarDates.id, dateId));
}

// ============================================================================
// DONATION MATCHING HELPERS
// ============================================================================

export async function createDonationMatching(matching: InsertDonationMatching) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(donationMatching).values(matching);
  return result.insertId;
}

export async function getDonationMatching(fundraiserId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [matching] = await db.select().from(donationMatching).where(eq(donationMatching.fundraiserId, fundraiserId));
  return matching;
}

export async function updateMatchedAmount(fundraiserId: number, additionalAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(donationMatching)
    .set({
      currentMatched: sql`${donationMatching.currentMatched} + ${additionalAmount}`,
    })
    .where(eq(donationMatching.fundraiserId, fundraiserId));
}
