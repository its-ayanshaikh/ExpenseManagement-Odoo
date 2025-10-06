# Debugging Setup Guide - Fix Breakpoints Not Working

## 🔧 Fixes Applied

### 1. Frontend Configuration Updated

**File: `frontend/vite.config.ts`**
- ✅ Added `sourcemap: true` to build config
- ✅ Added `devSourcemap: true` for CSS

**File: `frontend/tsconfig.json`**
- ✅ Added `"sourceMap": true`
- ✅ Added `"inlineSourceMap": false`

### 2. Backend Configuration
**File: `backend/tsconfig.json`**
- ✅ Already has `"sourceMap": true` (no changes needed)

## 🚀 How to Enable Debugging

### For Frontend (React/Vite)

#### Option 1: Chrome DevTools (Recommended)

1. **Restart your frontend dev server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open Chrome DevTools** (F12)

3. **Go to Sources tab**

4. **Find your source files**:
   - Look under: `webpack://` or `vite://` or your domain
   - Navigate to: `src/pages/DashboardPage.tsx`

5. **Set breakpoints**:
   - Click on line numbers in the Sources panel
   - Breakpoints should appear as blue markers

6. **Refresh the page** to trigger breakpoints

#### Option 2: VS Code Debugger

1. **Create `.vscode/launch.json`** in your project root:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost (Frontend)",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*",
        "/./*": "${webRoot}/*",
        "/src/*": "${webRoot}/*",
        "/*": "*",
        "/./~/*": "${webRoot}/node_modules/*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

2. **Set breakpoints** in VS Code (click left of line numbers)

3. **Press F5** or go to Run → Start Debugging

4. **Select configuration**:
   - "Launch Chrome against localhost (Frontend)" for React debugging
   - "Debug Backend" for Node.js debugging

### For Backend (Node.js/Express)

#### Option 1: VS Code Debugger (Recommended)

1. **Use the launch.json config above**

2. **Set breakpoints** in your backend files

3. **Press F5** and select "Debug Backend"

4. **Make API calls** to trigger breakpoints

#### Option 2: Chrome DevTools for Node.js

1. **Start backend with inspect flag**:
   ```bash
   cd backend
   node --inspect node_modules/.bin/tsx watch src/index.ts
   ```

2. **Open Chrome** and go to: `chrome://inspect`

3. **Click "Open dedicated DevTools for Node"**

4. **Set breakpoints** in the Sources tab

## 🐛 Troubleshooting Breakpoints

### Issue 1: Breakpoints Show as Gray/Unbound

**Cause**: Source maps not loaded or path mismatch

**Solutions**:
1. **Hard refresh** browser (Ctrl+Shift+R)
2. **Clear browser cache**
3. **Restart dev server**
4. **Check Console** for source map errors
5. **Verify file paths** match in debugger

### Issue 2: Breakpoints Skip/Don't Hit

**Cause**: Code is optimized or minified

**Solutions**:
1. **Check you're in development mode**:
   ```bash
   # Frontend
   npm run dev  # NOT npm run build
   
   # Backend
   npm run dev  # NOT npm start
   ```

2. **Disable browser extensions** that might interfere

3. **Check if code is actually executing**:
   - Add `console.log()` before breakpoint
   - If console.log doesn't show, code isn't running

### Issue 3: Source Files Not Found

**Cause**: Source map path configuration

**Solutions**:
1. **Check webRoot in launch.json** matches your project structure

2. **Update sourceMapPathOverrides**:
   ```json
   "sourceMapPathOverrides": {
     "webpack:///./src/*": "${webRoot}/*",
     "webpack:///./*": "${webRoot}/*",
     "webpack:///src/*": "${webRoot}/*"
   }
   ```

3. **Check Vite config** has correct base path

### Issue 4: Breakpoints Work in Some Files But Not Others

**Cause**: File not included in source maps

**Solutions**:
1. **Check tsconfig.json include/exclude** patterns

2. **Verify file is imported** and actually used

3. **Check for TypeScript errors** in the file

## 📝 Quick Debugging Checklist

### Before Setting Breakpoints:

- [ ] Dev server is running (not production build)
- [ ] Source maps are enabled in config
- [ ] Browser DevTools is open
- [ ] Page is loaded/refreshed after setting breakpoints
- [ ] Code is actually executing (verify with console.log)

### If Breakpoints Don't Work:

1. [ ] Restart dev server
2. [ ] Hard refresh browser (Ctrl+Shift+R)
3. [ ] Clear browser cache
4. [ ] Check Console for errors
5. [ ] Verify source maps are loading (Sources tab)
6. [ ] Try `debugger;` statement instead
7. [ ] Check file paths match
8. [ ] Disable browser extensions
9. [ ] Try different browser

## 🎯 Alternative: Using `debugger;` Statement

If breakpoints still don't work, use the `debugger;` statement:

```typescript
// In your code
const handleLogin = async () => {
  debugger;  // ← Execution will pause here
  console.log('Login started');
  // ... rest of code
}
```

**Advantages**:
- Always works (doesn't depend on source maps)
- Can be committed to code temporarily
- Works in all browsers

**Remember to remove** `debugger;` statements before committing!

## 🔍 Verify Source Maps Are Working

### Check in Browser:

1. **Open DevTools** (F12)
2. **Go to Sources tab**
3. **Look for your source files**:
   - Should see `.tsx` and `.ts` files (not just `.js`)
   - File structure should match your project
4. **Check Console** for warnings like:
   - "Source map not found"
   - "Failed to load source map"

### Check Source Map Files:

After building, check if `.map` files exist:
```bash
# Frontend (after build)
ls frontend/dist/assets/*.js.map

# Backend (after build)
ls backend/dist/**/*.js.map
```

## 🚀 Best Practices

1. **Always use dev mode** for debugging
2. **Keep DevTools open** while developing
3. **Use meaningful variable names** for easier debugging
4. **Add console.logs** strategically
5. **Use React DevTools** extension for component debugging
6. **Use Redux DevTools** if using Redux
7. **Check Network tab** for API issues
8. **Use Breakpoints panel** to manage all breakpoints

## 📚 Additional Tools

### React Developer Tools
- Install: [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- Features: Component tree, props, state inspection

### Redux DevTools (if using Redux)
- Install: [Chrome Extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- Features: Action history, state time-travel

### Network Tab
- Monitor API calls
- Check request/response data
- Verify authentication headers

## 🎓 Debugging Tips

### Frontend Debugging:
```typescript
// Log component renders
useEffect(() => {
  console.log('Component mounted/updated', { user, isAuthenticated });
}, [user, isAuthenticated]);

// Log API calls
console.log('API Request:', { url, method, data });

// Log state changes
console.log('State updated:', { oldState, newState });
```

### Backend Debugging:
```typescript
// Log middleware execution
console.log('Middleware:', req.method, req.path, req.user);

// Log database queries
console.log('DB Query:', query, params);

// Log errors with stack trace
console.error('Error:', error.message, error.stack);
```

## ✅ Verification

After applying fixes, verify debugging works:

1. **Set a breakpoint** in `DashboardPage.tsx`
2. **Refresh the page**
3. **Execution should pause** at breakpoint
4. **You should see**:
   - Variables panel with current values
   - Call stack
   - Scope information
   - Ability to step through code

If it works, you're all set! 🎉

## 🆘 Still Not Working?

If breakpoints still don't work after all fixes:

1. **Try a different browser** (Chrome, Edge, Firefox)
2. **Check for conflicting extensions**
3. **Try incognito/private mode**
4. **Update your browser** to latest version
5. **Update VS Code** to latest version
6. **Reinstall node_modules**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

7. **Ask for help** with:
   - Browser version
   - Node.js version
   - Error messages from Console
   - Screenshot of Sources tab
