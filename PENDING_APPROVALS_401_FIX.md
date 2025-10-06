# Pending Approvals 401 Error - Fix Summary

## Problem
The `/api/expenses/pending-approvals` endpoint was returning 401 Unauthorized when called with a valid token from curl on Windows.

## Root Cause Analysis

### The Issue
The curl command on Windows was escaping quotes in the Authorization header:
```bash
-H "Authorization: Bearer ^\^"eyJhbGci...^\^""
```

This resulted in the backend receiving:
```
Authorization: Bearer "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Notice the **quotes around the token**. The token extraction function was doing:
```typescript
const parts = authHeader.split(' ');  // ["Bearer", '"eyJhbGci..."']
return parts[1];  // Returns: "eyJhbGci..." (with quotes!)
```

The JWT verification then failed because it tried to verify `"eyJhbGci..."` instead of `eyJhbGci...`

### Why This Happened
1. Windows cmd shell requires different escaping than bash
2. The curl command had unnecessary quote escaping
3. The backend token extraction wasn't defensive against malformed headers

## Solution

### Backend Fix (jwt.ts)
Made the `extractTokenFromHeader` function more robust:

**Before:**
```typescript
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
```

**After:**
```typescript
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Trim whitespace
  const trimmedHeader = authHeader.trim();
  
  const parts = trimmedHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  // Extract token and remove any surrounding quotes (single or double)
  let token = parts[1].trim();
  
  // Remove surrounding quotes if present
  if ((token.startsWith('"') && token.endsWith('"')) || 
      (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1);
  }

  return token;
}
```

### What Changed
1. **Trim whitespace** from the header
2. **Trim whitespace** from the extracted token
3. **Remove surrounding quotes** (both single and double) if present
4. More defensive against malformed headers

## Correct Curl Usage

### Windows CMD (Correct)
```cmd
curl "http://localhost:3000/api/expenses/pending-approvals" ^
  -H "Accept: application/json" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ^
  -H "Origin: http://localhost:5173"
```

### Windows PowerShell (Correct)
```powershell
curl "http://localhost:3000/api/expenses/pending-approvals" `
  -H "Accept: application/json" `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." `
  -H "Origin: http://localhost:5173"
```

### Bash/Linux (Correct)
```bash
curl "http://localhost:3000/api/expenses/pending-approvals" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Origin: http://localhost:5173"
```

## Edge Cases Now Handled

The fix now handles these malformed Authorization headers:

1. **Quoted tokens**: `Bearer "token"` → extracts `token`
2. **Single quoted tokens**: `Bearer 'token'` → extracts `token`
3. **Extra whitespace**: `Bearer   token  ` → extracts `token`
4. **Combined**: `Bearer  "token"  ` → extracts `token`

## Testing

### Test Valid Token
```bash
# Should return 200 with pending approvals
curl "http://localhost:3000/api/expenses/pending-approvals" \
  -H "Authorization: Bearer YOUR_VALID_TOKEN"
```

### Test with Quotes (Now Works)
```bash
# Should also return 200 (quotes are stripped)
curl "http://localhost:3000/api/expenses/pending-approvals" \
  -H "Authorization: Bearer \"YOUR_VALID_TOKEN\""
```

### Test Invalid Token
```bash
# Should return 401 with "Invalid access token"
curl "http://localhost:3000/api/expenses/pending-approvals" \
  -H "Authorization: Bearer invalid_token"
```

### Test Missing Token
```bash
# Should return 401 with "Access token is required"
curl "http://localhost:3000/api/expenses/pending-approvals"
```

## Additional Notes

### Why Admin Role Got 401
Looking at your token payload:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655441001",
  "email": "admin@techcorp.com",
  "role": "ADMIN",
  "companyId": "550e8400-e29b-41d4-a716-446655440001",
  "iat": 1759650772,
  "exp": 1759651672
}
```

The role is `ADMIN`, and the endpoint requires `ADMIN` or `MANAGER` role via `requireAdminOrManager` middleware. So the role was correct - the issue was purely the quoted token.

### Middleware Chain
The endpoint uses this middleware chain:
1. `authenticateToken` - Verifies JWT (was failing due to quotes)
2. `requireAdminOrManager` - Checks role (never reached due to #1 failing)
3. `enforceCompanyIsolation` - Ensures company isolation (never reached)

## Files Modified
- `backend/src/utils/jwt.ts` - Enhanced `extractTokenFromHeader` function

## Date
December 2024
