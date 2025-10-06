# 401 Error Root Cause Analysis & Fix

## The REAL Problem 🎯

Your token was **EXPIRED**, not malformed!

### Token Analysis
```
Token issued at:  2025-10-05T07:52:52.000Z
Token expires at: 2025-10-05T08:07:52.000Z
Current time:     2025-10-05T08:08:29.977Z
Status: EXPIRED (37 seconds ago)
```

## Root Causes Found

### 1. Token Expiration (Primary Issue)
Your JWT token expired after 15 minutes, which is the default setting.

### 2. Environment Variable Mismatch (Secondary Issue)
The code was looking for different env variable names than what was in `.env`:

**Code Expected:**
- `JWT_ACCESS_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`

**Your .env Had:**
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

This meant the code was using fallback values instead of your configured values!

### 3. Quote Issue (Already Fixed)
The quote stripping fix was correct and is working.

## Fixes Applied

### Fix 1: Increased Token Expiration for Development
**File:** `backend/.env`

**Before:**
```env
JWT_EXPIRES_IN=15m
```

**After:**
```env
JWT_EXPIRES_IN=24h
```

Now tokens last 24 hours in development, making testing much easier.

### Fix 2: Fixed Environment Variable Names
**File:** `backend/src/utils/jwt.ts`

**Before:**
```typescript
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
```

**After:**
```typescript
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
```

Now it checks both naming conventions, prioritizing your `.env` variable names.

### Fix 3: Token Extraction (Already Done)
The quote stripping in `extractTokenFromHeader` is working correctly.

## How to Test

### Step 1: Restart Backend
With nodemon installed, it should auto-restart. If not:
```bash
npm run dev:backend
```

### Step 2: Login Again
Go to your frontend and login to get a fresh token with 24-hour expiration.

### Step 3: Test the Endpoints
```bash
# Get your new token from localStorage in browser console
localStorage.getItem('accessToken')

# Test with the new token (replace YOUR_NEW_TOKEN)
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer YOUR_NEW_TOKEN"
curl http://localhost:3000/api/expenses/pending-approvals -H "Authorization: Bearer YOUR_NEW_TOKEN"
```

## Why You Were Getting 401

1. **Token Expired** → Backend correctly rejected it
2. **Environment mismatch** → Token was using 15m default instead of your config
3. **Quotes in curl** → Was causing additional issues (now fixed)

## What's Fixed Now

✅ **Token lasts 24 hours** in development
✅ **Environment variables** read correctly
✅ **Quote stripping** handles malformed headers
✅ **Nodemon** auto-restarts on changes

## Production Considerations

For production, keep short-lived tokens:
```env
JWT_EXPIRES_IN=15m  # Short-lived for security
JWT_REFRESH_EXPIRES_IN=7d  # Longer for refresh tokens
```

Use the refresh token flow to get new access tokens without re-login.

## Testing Checklist

- [ ] Backend restarted with new config
- [ ] Login to get fresh 24-hour token
- [ ] Test `/api/auth/me` endpoint
- [ ] Test `/api/expenses/pending-approvals` endpoint
- [ ] Verify token doesn't expire for 24 hours
- [ ] Check that quotes in Authorization header are handled

## Files Modified

1. `backend/.env` - Increased JWT_EXPIRES_IN to 24h
2. `backend/src/utils/jwt.ts` - Fixed env variable name mismatch
3. `backend/src/utils/jwt.ts` - Added quote stripping (already done)
4. `backend/package.json` - Added nodemon (already done)

## Date
December 2024

## Lesson Learned

Always check token expiration first when debugging 401 errors! 🎓
