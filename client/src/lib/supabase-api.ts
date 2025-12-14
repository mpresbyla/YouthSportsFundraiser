import { supabase } from './supabase';

// Helper to get auth token for Edge Function calls
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  };
}

// Base URL for Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  async me() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/auth`, { headers });
    return res.json();
  },
};

// ============================================================================
// LEAGUES API
// ============================================================================

export const leaguesApi = {
  async getAll() {
    const res = await fetch(`${FUNCTIONS_URL}/leagues`);
    return res.json();
  },

  async getById(id: number) {
    const res = await fetch(`${FUNCTIONS_URL}/leagues?id=${id}`);
    return res.json();
  },

  async create(data: {
    name: string;
    description?: string;
    logoUrl?: string;
    defaultFeePercentage?: number;
    allowedFundraiserTypes?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/leagues`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(id: number, data: Partial<{
    name: string;
    description: string;
    logoUrl: string;
    defaultFeePercentage: number;
    allowedFundraiserTypes: string;
  }>) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/leagues?id=${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

// ============================================================================
// TEAMS API
// ============================================================================

export const teamsApi = {
  async getByLeague(leagueId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/teams?leagueId=${leagueId}`);
    return res.json();
  },

  async getById(id: number) {
    const res = await fetch(`${FUNCTIONS_URL}/teams?id=${id}`);
    return res.json();
  },

  async getMyTeams() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/teams?action=my-teams`, { headers });
    return res.json();
  },

  async create(data: {
    leagueId: number;
    name: string;
    description?: string;
    logoUrl?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/teams`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(id: number, data: Partial<{
    name: string;
    description: string;
    logoUrl: string;
  }>) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/teams?id=${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

// ============================================================================
// FUNDRAISERS API
// ============================================================================

export const fundraisersApi = {
  async getByTeam(teamId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?teamId=${teamId}`);
    return res.json();
  },

  async getById(id: number) {
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?id=${id}`);
    return res.json();
  },

  async getActive() {
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?action=active`);
    return res.json();
  },

  async create(data: {
    teamId: number;
    title: string;
    description?: string;
    fundraiserType?: string;
    fundraiserTemplate?: string;
    startDate?: string;
    endDate?: string;
    goalAmount?: number;
    config?: any;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(id: number, data: any) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?id=${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async publish(id: number) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?action=publish&id=${id}`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async pause(id: number) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?action=pause&id=${id}`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async resume(id: number) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?action=resume&id=${id}`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  async complete(id: number) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fundraisers?action=complete&id=${id}`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },
};

// ============================================================================
// PAYMENTS API
// ============================================================================

export const paymentsApi = {
  async createIntent(data: {
    fundraiserId: number;
    amount: number;
    donorName: string;
    donorEmail: string;
    donorPhone?: string;
    donorTip?: number;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/payments?action=create-intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async confirm(pledgeId: number) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/payments?action=confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pledgeId }),
    });
    return res.json();
  },
};

// ============================================================================
// TEMPLATES API
// ============================================================================

export const templatesApi = {
  // Raffle
  async getRaffleItems(fundraiserId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=raffle-items&fundraiserId=${fundraiserId}`);
    return res.json();
  },

  async getRaffleTiers(fundraiserId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=raffle-tiers&fundraiserId=${fundraiserId}`);
    return res.json();
  },

  async createRaffleItem(data: {
    fundraiserId: number;
    title: string;
    description?: string;
    imageUrl?: string;
    sponsorName?: string;
    sponsorLogoUrl?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=raffle-item`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async createRaffleTier(data: {
    fundraiserId: number;
    price: number;
    entries: number;
    label?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=raffle-tier`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Calendar
  async getCalendarDates(fundraiserId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=calendar-dates&fundraiserId=${fundraiserId}`);
    return res.json();
  },

  async createCalendarDate(data: {
    fundraiserId: number;
    dateValue: string;
    amount: number;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=calendar-date`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async purchaseDate(data: {
    dateId: number;
    pledgeId: number;
    purchaserName: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=purchase-date`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Squares
  async getSquaresGrid(fundraiserId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=squares-grid&fundraiserId=${fundraiserId}`);
    return res.json();
  },

  async createSquaresGrid(data: {
    fundraiserId: number;
    gridSize?: number;
    pricePerSquare: number;
    homeTeam?: string;
    awayTeam?: string;
    eventDate?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=squares-grid`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async purchaseSquare(data: {
    gridId: number;
    pledgeId: number;
    squarePosition: number;
    donorName: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=purchase-square`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Challenge
  async getChallengeGoals(fundraiserId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=challenge-goals&fundraiserId=${fundraiserId}`);
    return res.json();
  },

  async createChallengeGoal(data: {
    fundraiserId: number;
    goalAmount: number;
    challengeDescription: string;
    completedDescription?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=challenge-goal`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Donation Matching
  async getDonationMatching(fundraiserId: number) {
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=donation-matching&fundraiserId=${fundraiserId}`);
    return res.json();
  },

  async createDonationMatching(data: {
    fundraiserId: number;
    sponsorName: string;
    sponsorLogoUrl?: string;
    matchAmount: number;
    matchRatio?: number;
    expiresAt?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates?action=donation-matching`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
