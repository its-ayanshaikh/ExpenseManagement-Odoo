# Performance Optimization Guide

This guide covers performance optimizations implemented in the Expense Management System and recommendations for further improvements.

## Implemented Optimizations

### Frontend Optimizations

#### 1. Code Splitting and Lazy Loading

**Implementation:**
- All route components are lazy-loaded using React.lazy()
- Development-only components (AccessibilityTester) are conditionally loaded
- Suspense boundaries with loading states

**Benefits:**
- Reduced initial bundle size
- Faster initial page load
- Better caching strategy

**Files:**
- `frontend/src/App.tsx` - Lazy loading configuration

#### 2. Build Optimizations

**Implementation:**
- Manual chunk splitting for vendor libraries
- Separate chunks for React, React Query, and Form libraries
- Minification with esbuild
- Modern browser targeting (ES2015)

**Configuration:**
```javascript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      'react-vendor': ['react', 'react-dom', 'react-router-dom'],
      'query-vendor': ['@tanstack/react-query'],
      'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
    },
  },
}
```

**Benefits:**
- Better caching (vendor code changes less frequently)
- Parallel loading of chunks
- Smaller individual file sizes

#### 3. React Query Configuration

**Implementation:**
- Optimized retry logic (only for retryable errors)
- Exponential backoff for retries
- 5-minute stale time to reduce unnecessary refetches
- Disabled refetch on window focus

**Configuration:**
```javascript
// App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const appError = parseApiError(error)
        return appError.retryable === true && failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})
```

**Benefits:**
- Reduced API calls
- Better user experience with cached data
- Intelligent retry strategy

#### 4. Production Logging

**Implementation:**
- Custom logger utility that respects environment
- Console logs only in development
- Structured logging with context
- Log levels (debug, info, warn, error)

**Usage:**
```typescript
import { logger } from './utils/logger'

logger.debug('Debug message', { context: 'value' })
logger.info('Info message')
logger.error('Error occurred', error, { userId: '123' })
```

**Benefits:**
- No console pollution in production
- Easier to integrate with logging services
- Better debugging in development

### Backend Optimizations

#### 1. Database Connection Pooling

**Implementation:**
- Knex.js connection pool configuration
- Min/max pool size settings
- Connection timeout handling

**Benefits:**
- Efficient database connection reuse
- Better handling of concurrent requests
- Reduced connection overhead

#### 2. Redis Caching

**Implementation:**
- Exchange rate caching (1-hour TTL)
- Country/currency data caching
- Connection pooling

**Benefits:**
- Reduced external API calls
- Faster response times
- Lower API costs

#### 3. Cluster Mode with PM2

**Implementation:**
- PM2 cluster mode for multi-core utilization
- Automatic load balancing
- Zero-downtime restarts

**Configuration:**
```javascript
// ecosystem.config.js
{
  instances: 'max',
  exec_mode: 'cluster',
  max_memory_restart: '500M',
}
```

**Benefits:**
- Better CPU utilization
- Higher throughput
- Improved reliability

### Infrastructure Optimizations

#### 1. Nginx Configuration

**Implementation:**
- Gzip compression for text assets
- Static asset caching with long expiry
- No-cache for index.html
- Security headers

**Benefits:**
- Reduced bandwidth usage
- Faster asset loading
- Better browser caching

#### 2. Docker Multi-Stage Builds

**Implementation:**
- Separate build and runtime stages
- Minimal production images
- Non-root user execution

**Benefits:**
- Smaller image sizes
- Better security
- Faster deployments

## Performance Metrics

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Initial Load Time | < 2s | TBD |
| Time to Interactive | < 3s | TBD |
| First Contentful Paint | < 1.5s | TBD |
| Lighthouse Performance | > 90 | TBD |
| API Response Time (p95) | < 500ms | TBD |
| Bundle Size (Initial) | < 500KB | TBD |

### Measuring Performance

#### Frontend Performance

```bash
# Build and analyze
npm run build:frontend

# Check bundle sizes
cd frontend/dist
ls -lh assets/

# Run Lighthouse
npx lighthouse http://localhost:5173 --view
```

#### Backend Performance

```bash
# Use Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/health

# Use autocannon
npx autocannon -c 10 -d 30 http://localhost:3000/api/health
```

## Further Optimization Recommendations

### High Priority

#### 1. Image Optimization

**Current State:** Receipt images uploaded without optimization

**Recommendation:**
- Implement image compression on upload
- Generate thumbnails for list views
- Use WebP format with fallbacks
- Lazy load images in lists

**Implementation:**
```typescript
// Use sharp for image processing
import sharp from 'sharp'

const optimizeImage = async (buffer: Buffer) => {
  return await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}
```

#### 2. Database Query Optimization

**Current State:** Basic queries without optimization

**Recommendation:**
- Add database indexes for frequently queried columns
- Use query result caching for expensive queries
- Implement pagination for all list endpoints
- Use database query analysis tools

**Implementation:**
```sql
-- Add indexes
CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_submitter_id ON expenses(submitter_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_approval_requests_expense_id ON approval_requests(expense_id);
```

#### 3. API Response Caching

**Current State:** Limited caching (only exchange rates)

**Recommendation:**
- Cache user permissions
- Cache approval rules
- Cache company settings
- Implement ETags for conditional requests

**Implementation:**
```typescript
// Add cache middleware
app.use('/api/approval-rules', cacheMiddleware(300), approvalRuleRoutes)
```

### Medium Priority

#### 4. Virtual Scrolling

**Current State:** All list items rendered at once

**Recommendation:**
- Implement virtual scrolling for long lists
- Use react-window or react-virtual

**Implementation:**
```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={expenses.length}
  itemSize={80}
  width="100%"
>
  {ExpenseRow}
</FixedSizeList>
```

#### 5. Service Worker for Offline Support

**Current State:** No offline support

**Recommendation:**
- Implement service worker for offline functionality
- Cache API responses
- Queue actions when offline

**Implementation:**
```typescript
// Use Workbox
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
```

#### 6. CDN for Static Assets

**Current State:** Assets served from application server

**Recommendation:**
- Use CDN for static assets (images, fonts, CSS, JS)
- Configure proper cache headers
- Use CloudFlare, AWS CloudFront, or similar

**Benefits:**
- Reduced server load
- Faster asset delivery
- Better global performance

### Low Priority

#### 7. GraphQL Instead of REST

**Current State:** REST API

**Recommendation:**
- Consider GraphQL for complex queries
- Reduce over-fetching
- Better client-side caching

**Trade-offs:**
- More complex setup
- Learning curve
- May be overkill for current needs

#### 8. Server-Side Rendering (SSR)

**Current State:** Client-side rendering only

**Recommendation:**
- Consider Next.js for SSR
- Better SEO
- Faster initial page load

**Trade-offs:**
- More complex deployment
- Higher server costs
- May not be necessary for authenticated app

## Monitoring Performance

### Tools to Use

1. **Frontend:**
   - Chrome DevTools Performance tab
   - Lighthouse
   - WebPageTest
   - Bundle Analyzer

2. **Backend:**
   - New Relic or DataDog APM
   - PostgreSQL slow query log
   - Redis monitoring
   - PM2 monitoring

3. **Infrastructure:**
   - Server monitoring (CPU, RAM, Disk)
   - Network monitoring
   - Log analysis

### Setting Up Monitoring

#### 1. Frontend Performance Monitoring

```typescript
// Add performance observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Send to analytics
    logger.performance(entry.name, entry.duration)
  }
})

observer.observe({ entryTypes: ['measure', 'navigation'] })
```

#### 2. Backend Performance Monitoring

```typescript
// Add request timing middleware
app.use((req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.api(req.method, req.path, duration, res.statusCode)
  })
  
  next()
})
```

## Performance Budget

Set and enforce performance budgets:

```json
{
  "budgets": [
    {
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "stylesheet", "budget": 50 },
        { "resourceType": "image", "budget": 200 },
        { "resourceType": "total", "budget": 500 }
      ]
    }
  ]
}
```

## Checklist

Before deploying performance optimizations:

- [ ] Measure baseline performance
- [ ] Implement optimization
- [ ] Measure new performance
- [ ] Verify improvement (at least 10%)
- [ ] Test for regressions
- [ ] Document changes
- [ ] Update monitoring dashboards

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
