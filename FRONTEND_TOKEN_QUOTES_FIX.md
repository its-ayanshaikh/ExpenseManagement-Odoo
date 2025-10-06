# Frontend Token Quotes Bug - Fix Summary

## The Real Problem 🐛

The frontend was adding **quotes** around JWT tokens in the Authorization header!

### Evidence from Browser
```javascript
fetch("http://localhost:3000/api/users", {
  "headers": {
    "authorization": "Bearer \"eyJhbGci...\"" // ❌ Quotes around token!
  }
})
```

## Root Cause

The `useLocalStorage` hook in `frontend/src/hooks/useLocalStorage.ts` uses `JSON.stringify()` to store values:

```typescript
window.localStorage.setItem(key, JSON.stringify(valueToStore))
```

When storing a string token like `"abc123"`, `JSON.stringify()` adds quotes:
- Input: `abc123`
- Stored: `"abc123"` (with quotes)
- Retrieved: `"abc123"` (with quotes)
- Authorization header: `Bearer "abc123"` ❌

## The Fix

Replaced `useLocalStorage` hook with direct `localStorage` calls in `AuthContext.tsx` to avoid JSON.stringify adding quotes.

### Changes Made

#### 1. Removed useLocalStorage Import
**Before:**
```typescript
import useLocalStorage from '../hooks/useLocalStorage'
```

**After:**
```typescript
// Removed - using direct localStorage instead
```

#### 2. Changed Token Storage
**Before:**
```typescript
const [accessToken, setAccessToken] = useLocalStorage<string | null>('accessToken', null)
const [refreshToken, setRefreshToken] = useLocalStorage<string | null>('refreshToken', null)
```

**After:**
```typescript
const accessToken = localStorage.getItem('accessToken')
// No state needed - read directly from localStorage
```

#### 3. Updated Login Function
**Before:**
```typescript
setAccessToken(response.accessToken)
setRefreshToken(response.refreshToken)
```

**After:**
```typescript
localStorage.setItem('accessToken', response.accessToken)
localStorage.setItem('refreshToken', response.refreshToken)
```

#### 4. Updated Signup Function
**Before:**
```typescript
setAccessToken(response.accessToken)
setRefreshToken(response.refreshToken)
```

**After:**
```typescript
localStorage.setItem('accessToken', response.accessToken)
localStorage.setItem('refreshToken', response.refreshToken)
```

#### 5. Updated Logout Function
**Before:**
```typescript
setAccessToken(null)
setRefreshToken(null)
```

**After:**
```typescript
localStorage.removeItem('accessToken')
localStorage.removeItem('refreshToken')
```

#### 6. Updated Initialize Auth
**Before:**
```typescript
setAccessToken(null)
setRefreshToken(null)
```

**After:**
```typescript
localStorage.removeItem('accessToken')
localStorage.removeItem('refreshToken')
```

#### 7. Updated Token Refresh
**Before:**
```typescript
localStorage.setItem('accessToken', response.accessToken)
setAccessToken(response.accessToken)
```

**After:**
```typescript
localStorage.setItem('accessToken', response.accessToken)
localStorage.setItem('refreshToken', response.refreshToken)
```

## Why This Happened

1. **useLocalStorage hook** was designed for complex objects that need JSON serialization
2. **JWT tokens are strings** that don't need JSON.stringify
3. **JSON.stringify on strings** adds quotes: `JSON.stringify("token")` → `"\"token\""`
4. **Backend was fixed** to strip quotes, but the real issue was in the frontend

## Testing the Fix

### Step 1: Clear Old Tokens
```javascript
// In browser console
localStorage.clear()
```

### Step 2: Restart Frontend
```bash
cd frontend
npm run dev
```

### Step 3: Login Again
Login through the UI to get fresh tokens stored without quotes.

### Step 4: Verify Token Format
```javascript
// In browser console
const token = localStorage.getItem('accessToken')
console.log('Token:', token)
console.log('Has quotes:', token.startsWith('"'))
```

Should output:
```
Token: eyJhbGci...
Has quotes: false ✅
```

### Step 5: Check Network Request
Open DevTools → Network → Find any API request → Check Headers:
```
Authorization: Bearer eyJhbGci... ✅
```

NOT:
```
Authorization: Bearer "eyJhbGci..." ❌
```

## Impact

This fix resolves:
- ✅ 401 errors on all authenticated endpoints
- ✅ Token validation failures
- ✅ Authorization header formatting
- ✅ User creation, expense management, and all other API calls

## Files Modified

1. `frontend/src/contexts/AuthContext.tsx` - Replaced useLocalStorage with direct localStorage calls

## Related Fixes

This complements the backend fix in `backend/src/utils/jwt.ts` that strips quotes as a defensive measure. Now:
- **Frontend**: Stores tokens without quotes (primary fix)
- **Backend**: Strips quotes if present (defensive fallback)

## Lesson Learned

Don't use JSON.stringify for simple string values like JWT tokens. Use direct localStorage.setItem/getItem instead.

## Date
December 2024
