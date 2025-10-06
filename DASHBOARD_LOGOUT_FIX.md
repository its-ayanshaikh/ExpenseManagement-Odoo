# Dashboard Logout Issue - Fix Summary

## Problem
Users with ADMIN or MANAGER roles were being accidentally logged out when accessing the Dashboard page.

## Root Cause Analysis

### Primary Issue: Missing Refresh Token Endpoint
The `/api/auth/refresh` endpoint was **missing from the backend**, returning 404 Not Found. When tokens expired:
1. Frontend makes API call (e.g., `/api/expenses/pending-approvals`)
2. Backend returns 401 Unauthorized (token expired)
3. Axios interceptor tries to refresh token at `/api/auth/refresh`
4. **404 Not Found** - endpoint doesn't exist
5. Frontend treats this as authentication failure
6. Clears tokens and redirects to login
7. User is logged out unexpectedly

### Secondary Issue: Aggressive Error Handling
The `useApprovalNotifications` hook polls every 30 seconds, and the axios interceptor was logging users out on ANY refresh failure, not just authentication failures.

## Solution

### 1. Made `useApprovalNotifications` Hook More Resilient
**File:** `frontend/src/hooks/useApprovalNotifications.ts`

Added error handling to the React Query configuration:
- `retry: 1` - Only retry once instead of multiple times
- `retryDelay: 5000` - Wait 5 seconds before retrying
- `onError` handler - Silently log errors instead of propagating them

This prevents the hook from triggering multiple failed API calls that could cascade into logout.

### 2. Improved API Interceptor Error Handling
**File:** `frontend/src/services/api.ts`

Modified the 401 error handler to be less aggressive:
- Only clear tokens and redirect to login if the refresh token is actually invalid (401 response)
- Don't logout on network errors or other temporary issues (500, timeout, etc.)
- Added explicit check for refresh token existence before attempting refresh

## Changes Made

### 1. Added Missing Backend Endpoints
**File:** `backend/src/routes/auth.ts`

Added two critical endpoints:

#### POST /api/auth/refresh
- Accepts refresh token in request body
- Verifies refresh token validity
- Generates new access and refresh token pair
- Returns both tokens to client

```typescript
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);
  
  // Fetch user and generate new tokens
  const user = await User.findById(payload.userId);
  const tokens = generateTokenPair(user);
  
  res.status(200).json({
    status: 'success',
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});
```

#### POST /api/auth/logout
- Handles logout requests
- Provides consistent API for client-side token invalidation

### 2. Updated Frontend Auth Service
**File:** `frontend/src/services/authService.ts`

Updated `refreshToken` method to match backend response structure:
```typescript
async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await api.post<{
    status: string
    message: string
    data: {
      accessToken: string
      refreshToken: string
    }
  }>('/auth/refresh', { refreshToken })
  
  return response.data
}
```

### 3. Fixed API Interceptor
**File:** `frontend/src/services/api.ts`

Updated to:
- Store both new access and refresh tokens
- Only logout on actual authentication failures (401)
- Don't logout on network errors or other temporary issues

```typescript
const { accessToken, refreshToken: newRefreshToken } = response.data.data
localStorage.setItem('accessToken', accessToken)
localStorage.setItem('refreshToken', newRefreshToken)

// Only clear tokens on 401 from refresh endpoint
if (refreshError.response?.status === 401) {
  // Clear and redirect
}
```

### 4. Made Approval Notifications More Resilient
**File:** `frontend/src/hooks/useApprovalNotifications.ts
```typescript
const { data: pendingApprovals = [], isLoading } = useQuery<Expense[]>({
  queryKey: ['pendingApprovals'],
  queryFn: () => expenseService.getPendingApprovals(),
  enabled: shouldFetch,
  refetchInterval: 30000,
  refetchIntervalInBackground: false,
  retry: 1, // Only retry once
  retryDelay: 5000, // Wait before retrying
  onError: (error) => {
    // Silently handle errors
    console.warn('Failed to fetch pending approvals:', error)
  },
})
```

### api.ts
```typescript
catch (refreshError: any) {
  // Only clear tokens and redirect if refresh token is actually invalid (401)
  // Don't logout on network errors or other temporary issues
  if (refreshError.response?.status === 401) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
  
  return Promise.reject(refreshError)
}
```

## Testing

### 1. Test Token Refresh Flow
```bash
# Start backend
cd backend
npm run dev

# In another terminal, test refresh endpoint
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'

# Should return 200 with new tokens
```

### 2. Test Dashboard Persistence
1. Login as ADMIN or MANAGER
2. Navigate to Dashboard
3. Wait for 15+ minutes (access token expires)
4. Verify token auto-refreshes without logout
5. Dashboard should remain accessible

### 3. Test Polling Resilience
1. Login as ADMIN or MANAGER
2. Navigate to Dashboard
3. Stop backend server temporarily
4. Wait 30+ seconds (polling continues)
5. Restart backend
6. Verify no unexpected logout occurred

### 4. Test Actual Logout
1. Login with valid credentials
2. Manually clear refresh token from localStorage
3. Wait for access token to expire
4. Next API call should properly logout and redirect to login

## Impact
- **Token refresh now works** - Users stay logged in across sessions
- **No unexpected logouts** - Only logout on genuine authentication failures
- **Better error handling** - Temporary network issues don't cause logout
- **Improved UX** - Seamless token refresh in background
