# Testing the Refresh Token Endpoint

## Quick Test Steps

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```

### 2. Login and Get Tokens
```bash
# Login to get initial tokens
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@innovate.co.uk\",\"password\":\"your-password\"}"
```

Copy the `refreshToken` from the response.

### 3. Test Refresh Endpoint
```bash
# Replace YOUR_REFRESH_TOKEN with the actual token from step 2
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

### Expected Response
```json
{
  "status": "success",
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### 4. Test with Frontend
1. Start frontend: `cd frontend && npm run dev`
2. Login as admin or manager
3. Open browser DevTools > Application > Local Storage
4. Note the `accessToken` value
5. Wait 15+ minutes OR manually delete the access token
6. Perform any action (navigate to expenses, etc.)
7. Check Local Storage - you should see a NEW `accessToken`
8. You should NOT be logged out

## Troubleshooting

### 404 Not Found
- Make sure backend server is running
- Check that auth routes are properly registered in `backend/src/index.ts`
- Verify the route is `/api/auth/refresh` not `/auth/refresh`

### 401 Unauthorized
- Refresh token might be expired (7 days default)
- Refresh token might be invalid
- Check JWT_REFRESH_SECRET in .env file

### 500 Internal Server Error
- Check backend console for error details
- Verify database connection
- Check that User.findById works correctly

## What Should Happen

### Before Fix
1. Access token expires after 15 minutes
2. Next API call returns 401
3. Frontend tries to refresh at `/api/auth/refresh`
4. **404 Not Found** - endpoint missing
5. User gets logged out immediately

### After Fix
1. Access token expires after 15 minutes
2. Next API call returns 401
3. Frontend calls `/api/auth/refresh` with refresh token
4. **200 OK** - new tokens returned
5. Original API call retries with new token
6. User stays logged in seamlessly
