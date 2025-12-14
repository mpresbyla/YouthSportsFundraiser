import { drizzle } from "drizzle-orm/mysql2";
import { leagues, teams, fundraisers } from "../drizzle/schema";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL!);

async function seedDatabase() {
  console.log("Seeding database...\n");

  try {
    // Create test league
    console.log("Creating test league...");
    const [league] = await db.insert(leagues).values({
      name: "Youth Baseball League",
      description: "A competitive youth baseball league for ages 8-14",
      defaultFeePercentage: 5,
      allowedFundraiserTypes: "direct_donation,micro_fundraiser",
    });
    const leagueId = league.insertId;
    console.log(`✓ Created league with ID: ${leagueId}`);

    // Create test teams
    console.log("\nCreating test teams...");
    const [team1] = await db.insert(teams).values({
      leagueId: leagueId,
      name: "Tigers",
      description: "The mighty Tigers team",
      stripeOnboardingCompleted: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
    });
    const team1Id = team1.insertId;
    console.log(`✓ Created team: Tigers (ID: ${team1Id})`);

    const [team2] = await db.insert(teams).values({
      leagueId: leagueId,
      name: "Eagles",
      description: "The soaring Eagles team",
      stripeOnboardingCompleted: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
    });
    const team2Id = team2.insertId;
    console.log(`✓ Created team: Eagles (ID: ${team2Id})`);

    // Create test fundraisers
    console.log("\nCreating test fundraisers...");
    
    // Direct donation fundraiser
    const [fundraiser1] = await db.insert(fundraisers).values({
      teamId: team1Id,
      title: "Tigers Season Equipment Fund",
      description: "Help us raise funds for new equipment this season!",
      fundraiserType: "direct_donation",
      status: "draft",
      goalAmount: 500000, // $5,000 in cents
      totalAmountPledged: 0,
      totalAmountCharged: 0,
    });
    console.log(`✓ Created direct donation fundraiser (ID: ${fundraiser1.insertId})`);

    // Micro-fundraiser
    const microConfig = JSON.stringify({
      metricName: "runs",
      metricUnit: "per run",
      defaultPledgeAmount: 100, // $1.00 in cents
      defaultCap: 5000, // $50.00 in cents
      estimatedRange: "5-15 runs",
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    });

    const [fundraiser2] = await db.insert(fundraisers).values({
      teamId: team2Id,
      title: "Eagles Home Run Challenge",
      description: "Pledge per run scored in our championship game!",
      fundraiserType: "micro_fundraiser",
      status: "draft",
      config: microConfig,
      totalAmountPledged: 0,
      totalAmountCharged: 0,
    });
    console.log(`✓ Created micro-fundraiser (ID: ${fundraiser2.insertId})`);

    console.log("\n✅ Database seeded successfully!");
    console.log("\nTest Data Summary:");
    console.log(`- League: Youth Baseball League (ID: ${leagueId})`);
    console.log(`- Teams: Tigers (${team1Id}), Eagles (${team2Id})`);
    console.log(`- Fundraisers: 2 created`);
    
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedDatabase();
