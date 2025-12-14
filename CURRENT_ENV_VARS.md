# Current Environment Variables (Manus Platform)

## Database
```
DATABASE_URL=mysql://43vTRjgAqpvcKeB.eb6693f9eac6:Y5DE4WBQ31kYmOcCH7I9@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/VcCft6GGjHvPTHjXgiRKM9?ssl={"rejectUnauthorized":true}
```

## Authentication
```
JWT_SECRET=crqhg7WT3DMCDBDLuHiNH3
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=iZ9oKHWymRaqPKcYaZxEiN
OWNER_NAME=Michael Presbyla
```

## Application
```
VITE_APP_ID=VcCft6GGjHvPTHjXgiRKM9
VITE_APP_TITLE=Youth Sports Fundraising Platform
VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663045817451/FRNORNBEYBmKGHxy.png
```

## Stripe (Test Mode)
```
STRIPE_SECRET_KEY=sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY
STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
STRIPE_WEBHOOK_SECRET=whsec_moaCYzhu4Tm87i2HRFmxxnWREYJ1YNLS
```

## Manus APIs
```
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=b5b3jRGgDq98N2Hb4Ms2Aj
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=X5BvcKFZjjpiiNm2nXEbMk
```

## Analytics
```
VITE_ANALYTICS_ENDPOINT=https://manus-analytics.com
VITE_ANALYTICS_WEBSITE_ID=a3ea22ad-ca46-4015-8cd4-5748b8348b9d
```

---

## Migration Notes

**Stripe Keys**: These are YOUR test mode keys and can be reused in Supabase deployment
**Database**: Will be migrated to Supabase PostgreSQL
**Auth**: Will be replaced with Supabase Auth (no more Manus OAuth)
**APIs**: Manus Forge APIs will be removed (not needed with Supabase)
