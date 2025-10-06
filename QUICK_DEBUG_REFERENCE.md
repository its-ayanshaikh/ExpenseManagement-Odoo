# Quick Debug Reference Card

## ✅ Fixes Applied

1. **Frontend Vite Config** - Added source maps
2. **Frontend TypeScript Config** - Enabled source maps
3. **VS Code Launch Config** - Added debug configurations

## 🚀 Quick Start

### Method 1: Chrome DevTools (Easiest)

1. **Start dev server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open browser** → Press **F12**

3. **Go to Sources tab** → Find your file

4. **Click line number** to set breakpoint

5. **Refresh page** → Breakpoint should hit!

### Method 2: VS Code Debugger (Best)

1. **Start dev server** in terminal:
   ```bash
   cd frontend && npm run dev
   ```

2. **Set breakpoints** in VS Code (click left of line numbers)

3. **Press F5** → Select "🌐 Launch Chrome - Frontend"

4. **Browser opens** → Breakpoints should work!

### Method 3: Full Stack Debug

1. **Press F5** → Select "🎯 Full Stack Debug"

2. **Both frontend and backend** start with debugging enabled

3. **Set breakpoints** in any file

## 🐛 If Breakpoints Don't Work

### Quick Fixes (Try in order):

1. **Restart dev server**
2. **Hard refresh browser** (Ctrl+Shift+R)
3. **Clear browser cache**
4. **Close and reopen DevTools**
5. **Try `debugger;` statement** instead

### Use `debugger;` Statement:

```typescript
const handleLogin = async () => {
  debugger;  // ← Execution pauses here
  await login(credentials);
}
```

## 📍 Where to Set Breakpoints

### Frontend:
- `frontend/src/pages/LoginPage.tsx` - Line 45 (onSubmit)
- `frontend/src/pages/DashboardPage.tsx` - Line 14 (useApprovalNotifications)
- `frontend/src/contexts/AuthContext.tsx` - Line 45 (login function)
- `frontend/src/services/expenseService.ts` - Line 73 (getPendingApprovals)

### Backend:
- `backend/src/routes/auth.ts` - Line 180 (login route)
- `backend/src/routes/expenses.ts` - Line 304 (pending-approvals route)
- `backend/src/middleware/auth.ts` - Line 20 (authenticateToken)

## 🎯 Debug Configurations Available

### In VS Code (Press F5):

1. **🌐 Launch Chrome - Frontend** - Opens new Chrome window with debugging
2. **🔗 Attach to Chrome - Frontend** - Attaches to existing Chrome
3. **🚀 Debug Backend (tsx)** - Debugs Node.js backend
4. **🔗 Attach to Backend** - Attaches to running backend
5. **🎯 Full Stack Debug** - Debugs both frontend and backend

## 💡 Pro Tips

### Debugging React:
- Install **React Developer Tools** extension
- Use **Components tab** to inspect props/state
- Use **Profiler tab** to find performance issues

### Debugging API Calls:
- Use **Network tab** to see requests/responses
- Check **Headers** for authentication tokens
- Check **Response** for actual data returned

### Debugging State:
- Add `console.log` in useEffect to track changes
- Use React DevTools to inspect component state
- Check Redux DevTools if using Redux

## 🔍 Verify It's Working

### Test Frontend Debugging:

1. Open `frontend/src/pages/LoginPage.tsx`
2. Set breakpoint on line 45 (inside onSubmit)
3. Go to login page
4. Enter credentials and click "Sign In"
5. **Breakpoint should hit!** ✅

### Test Backend Debugging:

1. Open `backend/src/routes/auth.ts`
2. Set breakpoint on line 180 (inside login route)
3. Make login request from frontend
4. **Breakpoint should hit!** ✅

## 🆘 Still Not Working?

### Check These:

- [ ] Dev server is running (not production build)
- [ ] Browser DevTools is open
- [ ] Source maps are loading (check Sources tab)
- [ ] No errors in Console
- [ ] File paths match in debugger
- [ ] Code is actually executing (add console.log)

### Last Resort:

1. **Restart everything**:
   ```bash
   # Kill all processes
   # Restart backend
   cd backend && npm run dev
   
   # Restart frontend
   cd frontend && npm run dev
   ```

2. **Clear everything**:
   - Browser cache (Ctrl+Shift+Delete)
   - VS Code reload (Ctrl+Shift+P → "Reload Window")
   - node_modules (delete and `npm install`)

3. **Use `debugger;` statement** - Always works!

## 📚 More Help

See `DEBUGGING_SETUP_GUIDE.md` for detailed troubleshooting.

## ✨ Happy Debugging! 🐛
