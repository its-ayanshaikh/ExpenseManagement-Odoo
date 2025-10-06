# Nodemon Auto-Restart Setup

## What Was Done

Installed and configured nodemon for automatic backend server restart on file changes.

## Installation

```bash
npm install --save-dev nodemon --workspace=backend
```

## Configuration

Created `backend/nodemon.json`:
```json
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.spec.ts", "src/**/*.test.ts", "node_modules"],
  "exec": "tsx src/index.ts",
  "env": {
    "NODE_ENV": "development"
  },
  "delay": 1000
}
```

### Configuration Explained

- **watch**: Monitors the `src` directory for changes
- **ext**: Watches TypeScript, JavaScript, and JSON files
- **ignore**: Ignores test files and node_modules
- **exec**: Runs the server using `tsx` (TypeScript executor)
- **delay**: Waits 1 second after file change before restarting (prevents multiple restarts)

## Updated Scripts

### Backend (backend/package.json)
```json
{
  "dev": "nodemon",           // Now uses nodemon (auto-restart)
  "dev:tsx": "tsx watch src/index.ts"  // Alternative using tsx watch
}
```

## Usage

### Start Backend with Auto-Restart
```bash
npm run dev:backend
```

Or from the backend directory:
```bash
cd backend
npm run dev
```

### Alternative (tsx watch)
If you prefer tsx watch instead:
```bash
npm run dev:tsx --workspace=backend
```

## How It Works

1. **File Change Detection**: Nodemon watches all `.ts`, `.js`, and `.json` files in the `src` directory
2. **Automatic Restart**: When you save a file, nodemon automatically restarts the server
3. **1-Second Delay**: Prevents multiple restarts if you save multiple files quickly
4. **Console Output**: Shows clear messages when restarting

## Example Output

```
[nodemon] 3.0.2
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/**/*
[nodemon] watching extensions: ts,js,json
[nodemon] starting `tsx src/index.ts`
Server running on port 3000
[nodemon] restarting due to changes...
[nodemon] starting `tsx src/index.ts`
Server running on port 3000
```

## Manual Restart

Type `rs` and press Enter in the terminal to manually restart the server without file changes.

## Benefits

✅ **No Manual Restarts**: Server automatically restarts on code changes
✅ **Fast Development**: See changes immediately without stopping/starting
✅ **Smart Watching**: Only watches relevant files, ignores tests and node_modules
✅ **Debounced Restarts**: 1-second delay prevents restart spam
✅ **TypeScript Support**: Works seamlessly with TypeScript via tsx

## Troubleshooting

### Server Not Restarting
- Check if nodemon is watching the correct directory
- Verify file extensions are included in the config
- Try manual restart with `rs`

### Too Many Restarts
- Increase the `delay` value in `nodemon.json`
- Add more patterns to the `ignore` array

### Port Already in Use
- Kill the existing process: `npx kill-port 3000`
- Or change the port in your `.env` file

## Comparison: nodemon vs tsx watch

| Feature | nodemon | tsx watch |
|---------|---------|-----------|
| Auto-restart | ✅ Yes | ✅ Yes |
| TypeScript support | ✅ Via tsx | ✅ Native |
| Configuration file | ✅ nodemon.json | ❌ CLI only |
| Manual restart | ✅ Type `rs` | ❌ No |
| Delay control | ✅ Configurable | ❌ Fixed |
| Ignore patterns | ✅ Flexible | ⚠️ Limited |
| Industry standard | ✅ Very popular | ⚠️ Newer |

Both work great! Nodemon offers more configuration options, while tsx watch is simpler and TypeScript-native.

## Files Modified

1. `backend/package.json` - Updated dev script to use nodemon
2. `backend/nodemon.json` - Created nodemon configuration

## Date
December 2024
