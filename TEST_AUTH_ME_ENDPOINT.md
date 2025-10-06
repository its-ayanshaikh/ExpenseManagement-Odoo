# Testing the /auth/me Endpoint

## Quick Test Steps

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```

### 2. Login to Get a Token
Use any REST client (Postman, curl, or browser console) to login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@techcorp.com",
    "password": "password123"
  }'
```

Copy the `accessToken` from the response.

### 3. Test the /auth/me Endpoint
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

Expected response:
```json
{
  "status": "success",
  "message": "User retrieved successfully",
  "data": {
    "id": "...",
    "email": "admin@techcorp.com",
    "firstName": "Alice",
    "lastName": "Johnson",
    "role": "ADMIN",
    "companyId": "...",
    "isManagerApprover": false
  }
}
```

### 4. Test with Frontend
1. Start both backend and frontend:
   ```bash
   # Terminal 1
   cd backend
   npm run dev
   
   # Terminal 2
   cd frontend
   npm run dev
   ```

2. Open browser to `http://localhost:5173`

3. Login with:
   - **Admin**: `admin@techcorp.com` / `password123`
   - **Manager**: `manager1@techcorp.com` / `password123`
   - **Employee**: `employee1@techcorp.com` / `password123`

4. Check browser console for any errors

5. Verify you stay on the dashboard after login

## What to Look For

### Success Indicators
- ✅ Login redirects to dashboard
- ✅ Dashboard shows user information
- ✅ No automatic redirect back to login
- ✅ Page refresh keeps you logged in
- ✅ No 404 errors in browser console for `/auth/me`

### Failure Indicators
- ❌ Redirect back to login after successful login
- ❌ 404 error for `/auth/me` in console
- ❌ "User not found" errors
- ❌ Token cleared unexpectedly

## Browser Console Debugging

Open browser DevTools (F12) and check:

1. **Network Tab**: Look for `/auth/me` request
   - Should return 200 OK
   - Should have user data in response

2. **Console Tab**: Look for errors
   - No "Failed to initialize auth" errors
   - No 404 errors

3. **Application Tab > Local Storage**: Check tokens
   - `accessToken` should be present
   - `refreshToken` should be present
   - Tokens should persist after page refresh

## Common Issues

### Issue: Still getting 404 for /auth/me
**Solution**: Make sure backend server restarted after adding the endpoint

### Issue: 401 Unauthorized
**Solution**: Check that token is being sent in Authorization header

### Issue: User data not showing
**Solution**: Check that backend User model has `toSafeObject()` method

### Issue: Still redirecting to login
**Solution**: Clear browser localStorage and try again:
```javascript
// In browser console
localStorage.clear()
location.reload()
```
