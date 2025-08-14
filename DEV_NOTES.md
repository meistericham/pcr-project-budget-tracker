# Development Notes - Blank Page Fix

## Root Cause Analysis

### Issue
- **Problem**: Blank white page on localhost:3000 during development
- **Browser Console Error**: "supabaseUrl is required" (from Supabase client initialization)

### Diagnosis
1. **Exact Error Message**: 
   ```
   Error: Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (marked as Build Variable in Coolify) before building.
   ```

2. **Source Location**: 
   - File: `src/lib/supabaseClient.ts`
   - Line: 14 (throw statement in module initialization)

3. **Chain of Causes**:
   - Missing `.env.development` file with required environment variables
   - `src/lib/supabaseClient.ts` throws error at module level when env vars are undefined
   - `src/components/AuthPage.tsx` imports the Supabase client
   - App crashes before React can render anything, resulting in blank page

## Files Changed

### 1. `src/lib/supabase.ts` (Consolidated Singleton)
- **Change**: Consolidated duplicate Supabase clients into single singleton with unique storage key
- **Before**: Had two separate client files (`supabase.ts` and `supabaseClient.ts`) causing "Multiple GoTrueClient instances" warning
- **After**: Single client instance with `storageKey: 'pcr-tracker-auth'` and graceful fallback for missing env vars
- **Removed**: `src/lib/supabaseClient.ts` (duplicate file)

### 2. `.env.development` (new file)
- **Purpose**: Provides safe demo environment variables for local development
- **Contents**: Demo Supabase URL and key placeholders

### 3. `src/components/EnvWarning.tsx` (new file)
- **Purpose**: Shows user-friendly warning when Supabase isn't properly configured
- **Styling**: Yellow warning banner with setup instructions

### 4. `src/components/AuthPage.tsx` & `src/pages/UpdatePassword.tsx`
- **Added**: "AppBootOK" indicator (top-left corner)
- **Added**: Environment warning display when `!isSupabaseConfigured`
- **Updated**: All imports changed from `../lib/supabaseClient` to `../lib/supabase` (consolidated client)

## How to Run Locally

### Prerequisites
```bash
# Ensure you have Node.js and npm installed
node --version  # Should be 18+ 
npm --version   # Should be 8+
```

### Setup Steps
1. **Clone and install dependencies**:
   ```bash
   cd pcr_project_tracker-main
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   # Option A: Use demo configuration (already included)
   # The app will work with .env.development but show a warning banner
   
   # Option B: Use real Supabase credentials
   cp .env.example .env.development
   # Edit .env.development with your actual Supabase credentials:
   # VITE_SUPABASE_URL=https://your-project.supabase.co
   # VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Verify the fix**:
   - Open http://localhost:3000
   - Should see "AppBootOK" in top-left corner
   - Should see login page (not blank)
   - Console should show env variable logs
   - If using demo config, yellow warning banner appears

### Environment Variables Needed

For **full functionality**, create `.env.development` with:
```bash
# Your Supabase project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Your Supabase anon/public key  
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to get these values**:
1. Go to [supabase.com](https://supabase.com)
2. Create/open your project
3. Go to Settings → API
4. Copy "Project URL" → `VITE_SUPABASE_URL`
5. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

## Verification Checklist

✅ **Dev server starts without crashing**
- `npm run dev` runs successfully
- Server accessible at http://localhost:3000

✅ **No fatal console errors**
- Browser console shows env variable logs
- No "supabaseUrl is required" error
- Warning about demo config (if applicable)

✅ **Visual confirmation**
- Page renders content (not blank)
- "AppBootOK" indicator visible in top-left
- Login form displays correctly
- Warning banner shows (if using demo config)

✅ **Network requests**
- Main JS bundle loads with 200 status
- Content-Type: `application/javascript`

## Development vs Production

### Development (localhost)
- Uses `.env.development` for local environment variables
- Shows warning banner if using demo config
- Graceful fallback prevents app crashes

### Production (Coolify deployment)
- Uses build-time environment variables in Coolify
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as "Build Variables"
- No warning banner when properly configured

## Troubleshooting

**Issue**: Still seeing blank page
- Check browser console for different errors
- Ensure `npm install` completed successfully
- Verify Node.js version is 18+

**Issue**: Warning banner won't disappear
- Update `.env.development` with real Supabase credentials
- Restart dev server (`npm run dev`)

**Issue**: Auth features don't work
- Ensure real Supabase credentials in `.env.development`
- Check Supabase project is active and accessible
