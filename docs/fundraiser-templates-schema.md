# Fundraiser Templates - Database Schema Design

## Overview
Extend the existing fundraiser system to support multiple template types with template-specific configuration and data models.

## Schema Changes

### 1. Update `fundraisers` table
Add `fundraiserTemplate` enum field:
```sql
fundraiserTemplate ENUM(
  'direct_donation',
  'micro_fundraiser', 
  'raffle',
  'squares',
  'challenge',
  'team_vs_team',
  'calendar',
  'donation_matching'
)
```

### 2. New table: `raffle_items`
```sql
CREATE TABLE raffle_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiserId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  imageUrl VARCHAR(500),
  sponsorName VARCHAR(255),
  sponsorLogoUrl VARCHAR(500),
  totalEntries INT DEFAULT 0,
  winnerPledgeId INT,
  drawnAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiserId) REFERENCES fundraisers(id)
);
```

### 3. New table: `raffle_tiers`
```sql
CREATE TABLE raffle_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiserId INT NOT NULL,
  price INT NOT NULL, -- in cents
  entries INT NOT NULL,
  label VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiserId) REFERENCES fundraisers(id)
);
```

### 4. New table: `squares_grids`
```sql
CREATE TABLE squares_grids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiserId INT NOT NULL,
  gridSize INT DEFAULT 100, -- 10x10 = 100 squares
  pricePerSquare INT NOT NULL, -- in cents
  homeTeam VARCHAR(255),
  awayTeam VARCHAR(255),
  eventDate TIMESTAMP,
  homeNumbers JSON, -- [0,1,2,3,4,5,6,7,8,9] randomized
  awayNumbers JSON,
  numbersLocked BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiserId) REFERENCES fundraisers(id)
);
```

### 5. New table: `squares_purchases`
```sql
CREATE TABLE squares_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gridId INT NOT NULL,
  pledgeId INT NOT NULL,
  squarePosition INT NOT NULL, -- 0-99 for 10x10 grid
  donorName VARCHAR(255),
  purchasedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gridId) REFERENCES squares_grids(id),
  FOREIGN KEY (pledgeId) REFERENCES pledges(id),
  UNIQUE KEY unique_square (gridId, squarePosition)
);
```

### 6. New table: `squares_payouts`
```sql
CREATE TABLE squares_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gridId INT NOT NULL,
  quarter INT, -- 1,2,3,4 or NULL for final
  homeScore INT,
  awayScore INT,
  winnerSquareId INT,
  payoutAmount INT, -- in cents
  paidAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gridId) REFERENCES squares_grids(id),
  FOREIGN KEY (winnerSquareId) REFERENCES squares_purchases(id)
);
```

### 7. New table: `challenge_goals`
```sql
CREATE TABLE challenge_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiserId INT NOT NULL,
  goalAmount INT NOT NULL, -- in cents
  challengeDescription TEXT NOT NULL,
  completedDescription TEXT,
  isCompleted BOOLEAN DEFAULT FALSE,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiserId) REFERENCES fundraisers(id)
);
```

### 8. New table: `team_vs_team_matches`
```sql
CREATE TABLE team_vs_team_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiser1Id INT NOT NULL,
  fundraiser2Id INT NOT NULL,
  loserChallenge TEXT,
  winnerId INT,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiser1Id) REFERENCES fundraisers(id),
  FOREIGN KEY (fundraiser2Id) REFERENCES fundraisers(id)
);
```

### 9. New table: `calendar_dates`
```sql
CREATE TABLE calendar_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiserId INT NOT NULL,
  dateValue DATE NOT NULL,
  amount INT NOT NULL, -- in cents
  purchaserPledgeId INT,
  purchaserName VARCHAR(255),
  purchasedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiserId) REFERENCES fundraisers(id),
  FOREIGN KEY (purchaserPledgeId) REFERENCES pledges(id),
  UNIQUE KEY unique_date (fundraiserId, dateValue)
);
```

### 10. New table: `donation_matching`
```sql
CREATE TABLE donation_matching (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fundraiserId INT NOT NULL,
  sponsorName VARCHAR(255) NOT NULL,
  sponsorLogoUrl VARCHAR(500),
  matchAmount INT NOT NULL, -- max amount to match in cents
  matchRatio DECIMAL(3,2) DEFAULT 1.00, -- 1.00 = 100% match, 0.50 = 50% match
  currentMatched INT DEFAULT 0,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fundraiserId) REFERENCES fundraisers(id)
);
```

## Configuration Storage

Each template stores template-specific config in the existing `fundraisers.config` JSON field:

### Raffle Config
```json
{
  "allowMultipleWinners": boolean,
  "drawDate": "ISO timestamp",
  "displayEntriesCount": boolean
}
```

### Squares Config
```json
{
  "payoutStructure": {
    "q1": 15,  // percentage
    "q2": 20,
    "q3": 15,
    "final": 50
  },
  "teamKeepsPercent": 80
}
```

### Challenge Config
```json
{
  "milestones": [
    { "amount": 500, "description": "Coach wears silly hat" },
    { "amount": 1000, "description": "Coach shaves beard" }
  ]
}
```

### Calendar Config
```json
{
  "month": "2025-03",
  "pricingStrategy": "fixed" | "variable",
  "basePrice": 10,  // in dollars
  "specialDates": {
    "2025-03-17": 50  // St Patrick's Day costs more
  }
}
```

### Donation Matching Config
```json
{
  "showProgress": boolean,
  "showSponsorLogo": boolean,
  "urgencyMessage": "Only $X left to match!"
}
```

## Migration Strategy

1. Add new `fundraiserTemplate` column to `fundraisers` table
2. Migrate existing fundraisers:
   - `fundraiserType='direct_donation'` → `fundraiserTemplate='direct_donation'`
   - `fundraiserType='micro_fundraiser'` → `fundraiserTemplate='micro_fundraiser'`
3. Create all new tables
4. Keep existing `fundraiserType` for backward compatibility (deprecated)

## Indexes

```sql
CREATE INDEX idx_raffle_items_fundraiser ON raffle_items(fundraiserId);
CREATE INDEX idx_squares_grid_fundraiser ON squares_grids(fundraiserId);
CREATE INDEX idx_squares_purchases_grid ON squares_purchases(gridId);
CREATE INDEX idx_calendar_dates_fundraiser ON calendar_dates(fundraiserId);
CREATE INDEX idx_donation_matching_fundraiser ON donation_matching(fundraiserId);
```
