# Youth Sports Fundraising Platform - TODO

## Phase 1: Database Schema & Foundation
- [x] Design and implement database schema for leagues, teams, users, roles
- [x] Design and implement schema for fundraisers (direct donation & micro-fundraiser)
- [x] Design and implement schema for pledges, charges, stats entries
- [x] Create seed data for testing
- [x] Set up database migrations

## Phase 2: Authentication & Authorization
- [x] Implement user authentication flow
- [x] Create role-based access control (league admin, team manager)
- [x] Build user profile management
- [x] Implement role assignment functionality

## Phase 3: League & Team Management
- [x] Create league creation and configuration
- [x] Build team creation and profile management
- [x] Implement league dashboard with team oversight
- [x] Build team dashboard with fundraiser management
- [x] Add league branding and settings

## Phase 4: Stripe Connect Integration
- [x] Set up Stripe Connect Standard accounts
- [x] Build team Stripe onboarding flow
- [x] Implement account link creation
- [x] Add Stripe account status verification
- [ ] Handle Stripe webhook events (backend ready, needs testing)

## Phase 5: Direct Donation Fundraisers
- [x] Create direct donation fundraiser creation flow
- [x] Build public fundraiser page for direct donations
- [x] Implement immediate payment processing (backend)
- [ ] Add donor checkout with Stripe Elements (frontend integration needed)
- [ ] Create email receipt functionality

## Phase 6: Micro-Fundraiser System
- [x] Build micro-fundraiser creation flow
- [x] Implement pledge authorization with SetupIntent (backend)
- [x] Create stats entry interface for team managers
- [x] Build calculation engine for pledge amounts
- [x] Implement deferred charging with PaymentIntent
- [x] Add charge review and triggering interface

## Phase 7: Public Pages & Donor Experience
- [x] Design and build public fundraiser pages
- [x] Create donor checkout flow with payment method collection (basic form)
- [ ] Implement share links and Open Graph metadata
- [ ] Build pledge confirmation pages
- [ ] Add donor pledge status view

## Phase 8: Dashboards & Management
- [x] Build league admin dashboard with oversight features (basic)
- [x] Create team manager dashboard with fundraiser list (basic)
- [x] Implement fundraiser management (create, edit, publish, cancel)
- [x] Add stats entry and charge triggering interfaces
- [x] Build pledge and charge management views

## Phase 9: Notifications & Reporting
- [ ] Set up email notification system
- [ ] Implement pledge confirmation emails
- [ ] Add payment receipt emails
- [ ] Create stats entry reminder notifications
- [ ] Build charge completion summary emails
- [ ] Implement CSV export for pledges and charges
- [ ] Add fundraiser performance metrics

## Phase 10: Payment Processing & Webhooks
- [x] Implement platform fee calculation and collection
- [x] Build refund processing functionality
- [x] Add payment failure handling and retry logic
- [ ] Create Stripe webhook handler (needs route registration)
- [ ] Implement charge reconciliation

## Phase 11: Testing & Polish
- [x] Test complete direct donation flow (backend)
- [x] Test complete micro-fundraiser flow (backend)
- [x] Verify role-based access control
- [ ] Test Stripe integration end-to-end (needs frontend Elements)
- [ ] Polish UI/UX across all pages
- [x] Create initial checkpoint

## MVP Complete - Ready for Next Phase
The core platform is functional with:
- ✅ Complete database schema and backend logic
- ✅ tRPC procedures for all features
- ✅ Frontend pages for leagues, teams, and fundraisers
- ✅ Role-based access control
- ✅ Stripe Connect integration (backend)
- ✅ Passing tests

**Next Steps:**
- Integrate Stripe Elements on the frontend for actual payment processing
- Add Stripe webhook route and handler
- Implement email notifications
- Add reporting and CSV export
- Polish UI/UX and add more dashboard features
