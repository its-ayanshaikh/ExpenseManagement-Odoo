# Backend Debug - Quick Start

## 🎯 3 Steps to Debug Backend

### Step 1: Set Breakpoint
Open `backend/src/routes/auth.ts` and click left of **line 180**

### Step 2: Press F5
Select: **"🚀 Debug Backend (tsx)"**

### Step 3: Make API Call
Login from frontend → Breakpoint hits! ✅

---

## 🔧 Available Debug Scripts

```bash
# Method 1: VS Code (Press F5)
# Select: "🚀 Debug Backend (tsx)"

# Method 2: Manual with Chrome DevTools
cd backend
npm run dev:debug

# Then open: chrome://inspect

# Method 3: Debug with breakpoint on start
npm run dev:debug-brk
```

---

## 📍 Best Places to Set Breakpoints

### 1. Login Route
**File**: `backend/src/routes/auth.ts`
**Line**: 180
```typescript
router.post('/login', async (req: Request, res: Response) => {
  // ← Set breakpoint here (line 180)
  const { email, password } = req.body;
```

### 2. Auth Middleware
**File**: `backend/src/middleware/auth.ts`
**Line**: 20
```typescript
export async function authenticateToken(req, res, next) {
  // ← Set breakpoint here (line 20)
  const token = extractTokenFromHeader(req.headers.authorization);
```

### 3. Pending Approvals
**File**: `backend/src/routes/expenses.ts`
**Line**: 304
```typescript
router.get('/pending-approvals', async (req, res) => {
  // ← Set breakpoint here (line 304)
  const expenses = await ExpenseService.getPendingApprovalsForUser(req.user!.id);
```

---

## 🎮 Debug Controls

| Key | Action |
|-----|--------|
| **F5** | Continue / Start |
| **F10** | Step Over (next line) |
| **F11** | Step Into (enter function) |
| **Shift+F11** | Step Out (exit function) |
| **Ctrl+Shift+F5** | Restart |
| **Shift+F5** | Stop |

---

## 💡 Quick Tips

### Use `debugger;` Statement
```typescript
router.post('/login', async (req, res) => {
  debugger;  // ← Execution pauses here
  const { email, password } = req.body;
});
```

### Check Variables in Debug Console
While paused, type in Debug Console:
```typescript
req.body
req.user
req.headers.authorization
```

### Add Watch Expressions
In Debug panel → Watch → Add:
```typescript
req.user.role
req.body.email
process.env.DB_PASSWORD
```

---

## 🐛 Troubleshooting

### Breakpoint Not Hitting?

1. **Restart backend**: Ctrl+C, then F5 again
2. **Check API is called**: Look at Network tab in browser
3. **Use `debugger;`**: Always works!
4. **Add console.log**: Verify code runs

### "Cannot connect to runtime"?

```bash
# Make sure backend is running with debug flag
cd backend
npm run dev:debug
```

### Breakpoint Gray/Unbound?

- **Restart VS Code**: Ctrl+Shift+P → "Reload Window"
- **Check file path**: Make sure you're in correct file
- **Rebuild**: `npm run build` in backend folder

---

## ✅ Test Your Setup

1. **Set breakpoint** in `backend/src/routes/auth.ts` line 180
2. **Press F5** → Select "🚀 Debug Backend (tsx)"
3. **Login from frontend** with `admin@techcorp.com` / `password123`
4. **Breakpoint should hit!** ✅

If it works, you're all set! 🎉

---

## 🆘 Need More Help?

See **`BACKEND_DEBUG_GUIDE.md`** for detailed troubleshooting.

---

## 🎯 Debug Configurations in VS Code

Press **F5** and choose:

- **🚀 Debug Backend (tsx)** ← Use this one!
- **🔗 Attach to Backend** - Attach to running process
- **🎯 Full Stack Debug** - Debug frontend + backend together

---

## 📊 What You'll See When Debugging

### Variables Panel
- **Local** - Current function variables
- **req.body** - Request data
- **req.user** - Authenticated user

### Call Stack
- Shows function call hierarchy
- Click to jump to different frames

### Debug Console
- Evaluate expressions
- Call functions
- Inspect objects

---

## 🚀 Pro Tip: Full Stack Debugging

Debug both frontend and backend at once:

1. **Press F5**
2. **Select**: "🎯 Full Stack Debug"
3. **Set breakpoints** in both frontend and backend
4. **Both pause** when hit!

---

## 🎉 Happy Debugging!

Remember: **F5** to start, **F10** to step, **`debugger;`** always works!
