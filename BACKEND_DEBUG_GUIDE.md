# Backend Debugging Guide

## 🚀 Quick Start - 3 Methods

### Method 1: VS Code Debugger (Easiest & Best)

#### **Step-by-Step:**

1. **Open backend file** (e.g., `backend/src/routes/auth.ts`)

2. **Set breakpoint** - Click left of line number (red dot appears)
   - Try line 180 in `auth.ts` (inside login route)

3. **Press F5** in VS Code

4. **Select**: "🚀 Debug Backend (tsx)"

5. **Terminal opens** - Backend starts with debugger attached

6. **Make API call** from frontend (e.g., login)

7. **Breakpoint hits!** ✅
   - Variables panel shows current values
   - Call stack shows execution path
   - You can step through code (F10, F11)

#### **Debug Controls:**
- **F5** - Continue
- **F10** - Step Over (next line)
- **F11** - Step Into (enter function)
- **Shift+F11** - Step Out (exit function)
- **Ctrl+Shift+F5** - Restart
- **Shift+F5** - Stop

---

### Method 2: Chrome DevTools for Node.js

#### **Step 1: Start Backend with Inspector**

```bash
cd backend
npm run dev:debug
```

Or manually:
```bash
node --inspect node_modules/.bin/tsx watch src/index.ts
```

You'll see:
```
Debugger listening on ws://127.0.0.1:9229/...
```

#### **Step 2: Open Chrome DevTools**

1. **Open Chrome** browser

2. **Go to**: `chrome://inspect`

3. **Click**: "Open dedicated DevTools for Node"

4. **New window opens** with DevTools

#### **Step 3: Set Breakpoints**

1. **Go to Sources tab**

2. **Navigate** to your file (e.g., `src/routes/auth.ts`)

3. **Click line number** to set breakpoint

4. **Make API call** - Breakpoint hits!

---

### Method 3: VS Code Attach to Running Process

#### **Step 1: Start Backend with Inspector**

```bash
cd backend
npm run dev:debug
```

#### **Step 2: Attach VS Code**

1. **Press F5** in VS Code

2. **Select**: "🔗 Attach to Backend"

3. **VS Code connects** to running process

4. **Set breakpoints** - They work immediately!

---

## 📍 Where to Set Breakpoints

### Authentication Flow:
```typescript
// backend/src/routes/auth.ts

// Line 180 - Login route handler
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  // Set breakpoint here ← Line 180
  const { email, password }: LoginRequest = req.body;
```

### Middleware:
```typescript
// backend/src/middleware/auth.ts

// Line 20 - Token authentication
export async function authenticateToken(req, res, next) {
  // Set breakpoint here ← Line 20
  const token = extractTokenFromHeader(req.headers.authorization);
```

### Expense Routes:
```typescript
// backend/src/routes/expenses.ts

// Line 304 - Pending approvals
router.get('/pending-approvals', async (req, res) => {
  // Set breakpoint here ← Line 304
  const expenses = await ExpenseService.getPendingApprovalsForUser(req.user!.id);
```

### Database Queries:
```typescript
// backend/src/services/ExpenseService.ts

// Set breakpoint before database query
const expenses = await db('expenses')
  .where('status', 'PENDING')
  .select('*');
```

---

## 🐛 Troubleshooting

### Issue 1: Breakpoints Show as Gray/Unbound

**Cause**: Source maps not loaded

**Solution**:
```bash
# Restart backend
cd backend
npm run dev:debug
```

### Issue 2: "Cannot connect to runtime process"

**Cause**: Backend not running with inspector

**Solution**:
```bash
# Make sure backend is running with --inspect flag
npm run dev:debug
```

### Issue 3: Breakpoints Don't Hit

**Cause**: Code not executing or wrong file

**Solutions**:
1. **Add console.log** to verify code runs:
   ```typescript
   console.log('🔍 Login route hit:', req.body);
   ```

2. **Check API is being called** in frontend Network tab

3. **Verify file path** matches in debugger

### Issue 4: "Debugger attached" but no breakpoints

**Cause**: Source maps not configured

**Solution**: Already fixed! `tsconfig.json` has `"sourceMap": true`

---

## 💡 Pro Tips

### 1. Use Conditional Breakpoints

**Right-click breakpoint** → "Edit Breakpoint" → Add condition:
```typescript
// Only break when email is specific value
email === 'admin@techcorp.com'

// Only break when error occurs
error !== null

// Only break after 5th iteration
i > 5
```

### 2. Use Logpoints (Console.log without code changes)

**Right-click line** → "Add Logpoint":
```typescript
// Logs without stopping execution
User: {email}, Status: {status}
```

### 3. Watch Expressions

In Debug panel, add expressions to watch:
```typescript
req.user
req.body
process.env.DB_PASSWORD
```

### 4. Debug Console

While paused, use Debug Console to:
```typescript
// Evaluate expressions
req.user.role

// Call functions
JSON.stringify(req.body, null, 2)

// Check variables
typeof password
```

### 5. Use `debugger;` Statement

Add directly in code (always works):
```typescript
router.post('/login', async (req, res) => {
  debugger;  // ← Execution pauses here
  const { email, password } = req.body;
  // ...
});
```

---

## 🔍 Debugging Specific Issues

### Debug Login Issues:

1. **Set breakpoint** in `backend/src/routes/auth.ts` line 180

2. **Login from frontend**

3. **When paused**, check:
   - `req.body` - Are credentials correct?
   - `user` - Was user found in database?
   - `isPasswordValid` - Did password match?
   - `tokens` - Were tokens generated?

### Debug API 404 Errors:

1. **Set breakpoint** in `backend/src/index.ts` (main file)

2. **Check registered routes**:
   ```typescript
   // In debug console
   app._router.stack
   ```

3. **Verify route path** matches frontend call

### Debug Database Queries:

1. **Set breakpoint** before query

2. **Step into** (F11) the query function

3. **Check query parameters**:
   ```typescript
   // In debug console
   console.log(query.toString())
   ```

### Debug Middleware:

1. **Set breakpoint** in middleware (e.g., `authenticateToken`)

2. **Check execution order**:
   - Does middleware run?
   - What's in `req.headers.authorization`?
   - Is token valid?

---

## 📊 Debug Panel Overview

### When Breakpoint Hits:

**Variables Panel:**
- **Local** - Current function variables
- **Closure** - Parent scope variables
- **Global** - Global variables

**Call Stack:**
- Shows function call hierarchy
- Click to jump to that frame

**Watch Panel:**
- Add expressions to monitor
- Updates automatically

**Breakpoints Panel:**
- List all breakpoints
- Enable/disable individually
- See hit count

---

## 🎯 Common Debugging Scenarios

### Scenario 1: Login Not Working

```typescript
// backend/src/routes/auth.ts - Line 180
router.post('/login', async (req, res) => {
  debugger;  // ← Start here
  
  const { email, password } = req.body;
  console.log('📧 Email:', email);  // Check email
  
  const user = await User.findByEmail(email);
  console.log('👤 User found:', !!user);  // Check if user exists
  
  if (!user) {
    // Breakpoint here to see why user not found
    debugger;
  }
  
  const isPasswordValid = await user.verifyPassword(password);
  console.log('🔐 Password valid:', isPasswordValid);  // Check password
  
  if (!isPasswordValid) {
    // Breakpoint here to see why password invalid
    debugger;
  }
});
```

### Scenario 2: API Returns Wrong Data

```typescript
// backend/src/routes/expenses.ts - Line 304
router.get('/pending-approvals', async (req, res) => {
  debugger;  // ← Start here
  
  console.log('👤 User ID:', req.user!.id);
  console.log('👤 User Role:', req.user!.role);
  
  const expenses = await ExpenseService.getPendingApprovalsForUser(req.user!.id);
  console.log('📊 Expenses count:', expenses.length);
  console.log('📊 First expense:', expenses[0]);
  
  // Check response structure
  debugger;  // ← Pause before sending response
});
```

### Scenario 3: Middleware Not Working

```typescript
// backend/src/middleware/auth.ts - Line 20
export async function authenticateToken(req, res, next) {
  debugger;  // ← Start here
  
  const token = extractTokenFromHeader(req.headers.authorization);
  console.log('🎫 Token:', token ? 'Present' : 'Missing');
  
  if (!token) {
    debugger;  // ← Why no token?
    return;
  }
  
  const payload = verifyAccessToken(token);
  console.log('📦 Payload:', payload);
  
  const user = await User.findById(payload.userId);
  console.log('👤 User:', user ? 'Found' : 'Not found');
  
  req.user = user;
  next();
}
```

---

## 🚀 Advanced Debugging

### Debug with Multiple Breakpoints:

1. **Set breakpoints** at key points:
   - Route handler entry
   - Before database query
   - After database query
   - Before response

2. **Use F5** to continue between breakpoints

3. **Watch variables** change at each step

### Debug Async Code:

```typescript
async function complexOperation() {
  debugger;  // ← Breakpoint 1
  
  const result1 = await step1();
  debugger;  // ← Breakpoint 2 - Check result1
  
  const result2 = await step2(result1);
  debugger;  // ← Breakpoint 3 - Check result2
  
  return result2;
}
```

### Debug Error Handling:

```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  debugger;  // ← Pause when error occurs
  console.error('Error details:', error);
  // Inspect error object
}
```

---

## ✅ Verification Checklist

Test your debugging setup:

- [ ] Set breakpoint in `backend/src/routes/auth.ts` line 180
- [ ] Start debug with F5 → "🚀 Debug Backend (tsx)"
- [ ] Make login request from frontend
- [ ] Breakpoint hits and execution pauses
- [ ] Variables panel shows `req.body`
- [ ] Can step through code with F10
- [ ] Can evaluate expressions in Debug Console
- [ ] Can continue with F5

If all checked, debugging is working! ✅

---

## 🆘 Still Not Working?

### Last Resort Options:

1. **Use console.log everywhere**:
   ```typescript
   console.log('🔍 Step 1: Route hit');
   console.log('🔍 Step 2: User found:', user);
   console.log('🔍 Step 3: Password valid:', isValid);
   ```

2. **Use `debugger;` statements** (always works)

3. **Check logs** in terminal where backend is running

4. **Use Postman/curl** to test API directly:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@techcorp.com","password":"password123"}'
   ```

5. **Ask for help** with:
   - Node.js version (`node --version`)
   - Error messages
   - What you're trying to debug
   - Screenshot of debug panel

---

## 📚 Additional Resources

### VS Code Debugging Docs:
https://code.visualstudio.com/docs/nodejs/nodejs-debugging

### Node.js Inspector:
https://nodejs.org/en/docs/guides/debugging-getting-started/

### Chrome DevTools for Node:
https://nodejs.org/en/docs/guides/debugging-getting-started/#chrome-devtools-55

---

## 🎉 Happy Backend Debugging!

Remember:
- **F5** to start debugging
- **F10** to step over
- **F11** to step into
- **Shift+F5** to stop
- **`debugger;`** always works!
