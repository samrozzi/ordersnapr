# OrderSnapr Codebase Analysis Report

**Date:** November 15, 2025  
**Project:** OrderSnapr - Work Order Management System  
**Tech Stack:** React 18 + Vite + TypeScript + Supabase + Tailwind CSS

---

## 1. OVERALL ARCHITECTURE & STRUCTURE

### 1.1 Project Layout
```
src/
├── pages/              (28 pages - main route components)
├── components/        (200+ components including admin, forms, widgets, UI)
├── contexts/          (3 context providers - Feature, WorkOrder, EditorFocus)
├── hooks/             (54 custom hooks - data fetching, state management)
├── integrations/
│   └── supabase/      (Supabase client, auto-generated types)
├── lib/               (Utilities for PDF, DOCX, exports, offline sync)
└── types/             (Custom field type definitions)
```

### 1.2 Technology Stack
- **Frontend:** React 18.3.1 + TypeScript
- **Build:** Vite 5.4 with SWC compiler + PWA support
- **State Management:** TanStack React Query 5.90.6 + React Context
- **Backend:** Supabase (PostgreSQL + Auth)
- **Forms:** React Hook Form 7.61.1 + Zod validation
- **UI:** Radix UI primitives + shadcn/ui components
- **Styling:** Tailwind CSS 3.4
- **Rich Editors:** TipTap (rich text), custom block editors
- **Export:** jsPDF, jsPDF-AutoTable, DOCX, Excel
- **Charts:** Recharts 2.15.4
- **Drag & Drop:** @dnd-kit (multiple implementations)

### 1.3 Build Configuration
**Vite Config Highlights:**
- ✅ Code splitting with vendor chunks (React, UI, Forms, Supabase, PDF, Charts, DnD)
- ✅ PWA with offline support (Workbox caching strategy)
- ✅ Service Worker with network-first caching for API calls
- ✅ Lazy loading of pages (lazy() with Suspense)
- ✅ esbuild minification with console/debugger dropping in production
- ⚠️ Chunk size warning limit: 600KB (relatively high)
- ✅ Module preload optimization enabled

---

## 2. KEY FEATURES IMPLEMENTED

### 2.1 Core Modules
1. **Work Orders** - Full CRUD, status tracking, kanban view, PDF export
2. **Properties** - Property management, tracking, filtering
3. **Forms** - Dynamic form builder, templates, submissions
4. **Calendar** - Event scheduling, calendar views
5. **Invoicing** - Invoice creation, templates, payment tracking, recurring invoices
6. **Customers** - Customer database, relationships to orders/invoices
7. **Notes** - Rich text notes with templates, kanban board, favorites
8. **Reports** - Advanced reporting system with scheduling
9. **Dashboard** - Customizable widget grid (DnD)
10. **Admin** - Custom fields, templates, features management

### 2.2 Advanced Features
- **Custom Fields** - Per-entity custom field system with validation
- **Free Tier Model** - Differentiated feature access based on tier
- **Multi-Organization Support** - Personal workspace + org workspaces
- **Offline Support** - PWA + IndexedDB caching
- **Export Formats** - PDF, Excel, DOCX, CSV
- **Global Search** - Full-text search across work orders, properties, forms, etc.
- **Authentication** - Supabase Auth with approval workflow
- **Role-Based Access** - Super admin, org admin, user roles
- **Notifications** - Real-time notification system
- **Activities Feed** - Activity tracking and sharing

---

## 3. PERFORMANCE ANALYSIS

### 3.1 CRITICAL ISSUES

#### Issue #1: N+1 Query Pattern in `use-customers.ts`
**Location:** `/home/user/ordersnapr/src/hooks/use-customers.ts` (lines 75-110)

**Problem:**
```typescript
// Fetches ALL customers, then for EACH customer:
const customersWithStats = await Promise.all(
  data.map(async (customer) => {
    // Makes separate request for each customer's invoices
    const { data: invoiceStats } = await supabase
      .from("invoices")
      .select("total_cents, paid_amount_cents, status")
      .eq("customer_id", customer.id);
    
    // Makes separate request for each customer's work orders
    const workOrdersResult = await workOrdersQuery
      .select("id")
      .eq("customer_id", customer.id);
    
    // ... process stats
  })
);
```

**Impact:** 
- With 10 customers → 21 queries (1 base + 10 invoice + 10 work order queries)
- With 100 customers → 201 queries
- Severely impacts performance, especially on slower connections

**Solution:** Use aggregated queries or Supabase SQL functions to get stats in parallel, or paginate customers and lazy-load stats.

#### Issue #2: GlobalSearch Debounce Without Cleanup
**Location:** `/home/user/ordersnapr/src/components/GlobalSearch.tsx` (lines 81-88)

**Problem:**
```typescript
useEffect(() => {
  if (!search || search.length < 2) {
    setResults([]);
    return;
  }

  const performSearch = async () => {
    // ... search code
  };
  
  // Creates timeout but never returns cleanup!
  const debounce = setTimeout(performSearch, 300);
  // Missing: return () => clearTimeout(debounce);
}, [search]);
```

**Impact:** Memory leak from accumulated setTimeout callbacks

#### Issue #3: Conditional React Query Dependencies
**Location:** Multiple hooks (e.g., `use-invoices.ts`, `use-custom-fields.ts`)

**Problem:**
```typescript
// Dashboard data may not be filtered correctly by org
const { data: invoices = [] } = useQuery({
  queryKey: ["invoices", orgId],  // If orgId undefined, this still runs
  queryFn: async () => {
    if (!orgId) return [];  // Graceful fallback but inefficient
    // ... query
  },
  enabled: !!orgId && !!user,
});
```

**Impact:** Query invalidations could cause unnecessary refetches

#### Issue #4: Missing Memoization on Data Transformations
**Location:** `/home/user/ordersnapr/src/pages/Invoices.tsx` (lines 31-44)

**Problem:**
```typescript
// Filter operations happen on every render
const draftInvoices = invoices.filter((inv: any) => inv.status === 'draft');
const sentInvoices = invoices.filter((inv: any) => inv.status === 'sent');
const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid');
const overdueInvoices = invoices.filter((inv: any) => {...});

// Calculations happen every render
const totalOutstanding = sentInvoices.reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0);
```

**Impact:** With large datasets (1000+ invoices), this causes performance degradation. Should use `useMemo()`.

### 3.2 MODERATE ISSUES

#### Issue #5: WorkOrder Dialog Context Data Fetching
**Location:** `/home/user/ordersnapr/src/contexts/WorkOrderDialogContext.tsx` (lines 55-98)

**Problem:**
```typescript
const openWorkOrderDialog = async (id: string) => {
  try {
    // Separate query for work order
    const { data } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single();
    
    // Then separate query for profiles if needed
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(userIds));
      // ...
    }
  }
}
```

**Impact:** Sequential queries instead of parallel - could be optimized with JOIN on work orders table.

#### Issue #6: Large Component Files (Performance)
**Components exceeding 700+ lines:**
- `UnifiedPreferences.tsx` (837 lines)
- `WorkOrderDetails.tsx` (762 lines)
- `RichBlockEditor.tsx` (670 lines)
- `InteractiveNoteViewer.tsx` (670 lines)
- `WorkOrderForm.tsx` (656 lines)

**Impact:** Harder to optimize, potential unnecessary re-renders. Consider splitting into smaller sub-components.

#### Issue #7: Search Result Fetching
**Location:** `/home/user/ordersnapr/src/components/GlobalSearch.tsx` (lines 87-150+)

**Problem:**
- Searches multiple tables independently (work orders, properties, forms, customers)
- No pagination or result limiting (except `.limit(10)` for customer search)
- Performs multiple queries synchronously for each search term

**Impact:** Could be slow with large datasets. Consider a unified search index.

### 3.3 POSITIVE PERFORMANCE PATTERNS

✅ **Good:** React Query configuration with appropriate stale times
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 min - reasonable
      gcTime: 10 * 60 * 1000,          // 10 min - good cache duration
      refetchOnWindowFocus: false,      // Prevents unnecessary refetches
      refetchOnMount: false,
      retry: 1,
    },
  },
});
```

✅ **Good:** Lazy loading of pages
```typescript
const Admin = lazy(() => import("./pages/Admin"));
const OrgAdmin = lazy(() => import("./pages/OrgAdmin"));
// ... 13 more lazy-loaded pages
// Only eagerly loads Dashboard, Profile, WorkOrders, PropertyInfo, Notes
```

✅ **Good:** Suspense boundaries for loading states
```typescript
<Suspense fallback={<PageSkeleton />}>
  {/* Routes */}
</Suspense>
```

✅ **Good:** PWA caching strategy
```typescript
// Network-first for data (fallback to cache)
// Cache-first for static assets and fonts
// 30-day cache for Supabase Storage
```

✅ **Good:** Feature context memoization
```typescript
const contextValue = useMemo(() => ({
  features,
  isLoading,
  // ... values
}), [features, isLoading, /* dependencies */]);
```

---

## 4. UI COMPONENTS & PATTERNS

### 4.1 Component Organization
**UI Components** (50+ files in `/components/ui/`):
- Radix UI-based primitive components
- Full accessibility support
- Consistent shadcn/ui patterns

**Feature Components** (150+ in `/components/`):
- Organized by feature domain
- Admin components in `/admin/` subdirectory
- Custom field system in `/custom-fields/`
- Note components in `/notes/`
- Form components in `/forms/`
- Widget system in `/widgets/`

**Page Components** (28 files in `/pages/`):
- One component per route
- Lazy loaded for most pages

### 4.2 UI/UX Patterns

#### Good Patterns:
✅ Consistent button/badge styling
✅ Proper loading states (skeleton loaders)
✅ Toast notifications (via Sonner)
✅ Dialog/Modal system
✅ Sheet (drawer) navigation
✅ Responsive grid layout
✅ Dark theme support (via next-themes)

#### Areas for Improvement:
⚠️ Some tables show loading spinners instead of skeleton rows (less polished)
⚠️ Error handling could be more consistent (some components use try-catch, others rely on hook errors)
⚠️ No loading indicator during table data fetch in some places

### 4.3 Form Handling
**Excellent:** React Hook Form + Zod validation pattern
```typescript
const formSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  // ... more fields
});

type FormData = z.infer<typeof formSchema>;

const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
});
```

**Custom Field System:**
- Dynamic field rendering per entity type
- Separate input components for each field type
- Validation in field config

---

## 5. STATE MANAGEMENT

### 5.1 Approach
- **Server State:** TanStack React Query (primary)
- **UI State:** React useState hooks
- **Global State:** React Context (FeatureContext, WorkOrderDialogContext)
- **Form State:** React Hook Form
- **Client Cache:** IndexedDB for offline support

### 5.2 Feature Context
**Strengths:**
- Centralizes feature access control
- Checks localStorage preferences before database
- Supports super admin override
- Memoized context value prevents unnecessary re-renders

**Concerns:**
- Listens to storage events and custom events for updates (potential race conditions)
- localStorage key relies on org_id being part of key (good)
- Multiple refresh mechanisms (event listener + manual refresh)

### 5.3 Query Client Management
**Good Patterns:**
- Invalidation after mutations (creates/updates/deletes)
- Conditional queries with `enabled` flag
- Proper dependency arrays in queryKey

**Issues Found:**
- Some mutations don't invalidate all affected queries
- Manual refetch calls instead of relying on invalidation

---

## 6. DATABASE & QUERIES

### 6.1 Database Schema Highlights
**Tables Observed:**
- `profiles` - User accounts with org associations
- `organizations` - Organization/company data
- `org_memberships` - User-org relationships
- `work_orders` - Main business entity
- `customers` - Customer records
- `invoices` - Invoice data with line items
- `properties` - Properties/locations
- `forms` - Form definitions
- `form_submissions` - Form response data
- `notes` - User notes with rich content
- `custom_fields` - Flexible field system
- `dashboard_widgets` - User dashboard config
- `saved_reports` - Saved report configs
- `org_features` - Feature access per org
- `user_preferences` - User UI preferences

### 6.2 Query Patterns

**Good:**
```typescript
// Selective column selection
.select("id, name, email, phone")

// Proper filtering
.eq("org_id", orgId)
.is('archived_at', null)

// Ordering
.order("created_at", { ascending: false })

// Limiting
.limit(10)
```

**Issues:**
- Some queries use `*` (select all columns) - inefficient
- Work orders table relationships not always populated efficiently
- Custom field values require separate queries

### 6.3 Security (RLS Policies)
**Observed:**
- Row Level Security policies on sensitive tables
- Organization-based access control
- User-based access control
- Approval status checks

**Risk:** Not all tables may have RLS - needs verification

---

## 7. RECENT CHANGES & CURRENT STATE

### 7.1 Latest Commits
```
9a7e45e - Fix null org filter queries (most recent)
e73a6e6 - Changes
465ad73 - Changes
5df3a5a - Changes
```

### 7.2 Most Recent Fix (9a7e45e)
**Title:** "Fix null org filter queries"

**Changes:**
- Updated `Dashboard.tsx` to handle `null` org_id properly
- Updated `use-water-tracker.ts` to use conditional filters
- Applied org_id = activeOrgId when set, otherwise org_id IS NULL

**Impact:** Fixes issues with personal workspace (null org) data queries

### 7.3 Known Documentation
Several markdown files indicate recent fixes:
- `LATEST_FIXES.md` - Global search wildcard fixes, cmdk filtering, quick add button
- `AUDIT_REPORT.md` - Comprehensive system audit
- `DEPLOYMENT_READY.md` - Production deployment information

---

## 8. BUGS & ANTI-PATTERNS

### 8.1 CONFIRMED BUGS

#### 🔴 Critical: N+1 Query in Customer Stats (use-customers.ts)
- Severity: HIGH
- Frequency: Every load of customer list with stats enabled
- Impact: App slows with more customers

#### 🔴 Critical: GlobalSearch Memory Leak
- Severity: HIGH
- Frequency: Every search
- Impact: Memory accumulation over time

#### 🟡 Moderate: Large Component Files
- Severity: MEDIUM
- Frequency: Every render of these components
- Impact: Harder to maintain, potential re-render issues

#### 🟡 Moderate: Missing useMemo on Data Transformations
- Severity: MEDIUM
- Frequency: Page renders
- Impact: Unnecessary recalculations

#### 🟡 Moderate: Sequential Queries in WorkOrder Dialog
- Severity: MEDIUM
- Frequency: Every work order dialog open
- Impact: Slower user experience

### 8.2 CODE ANTI-PATTERNS

#### Pattern 1: Unclear Type Casting
```typescript
const { data, error } = await query;
return data as any[];  // Using 'any' defeats TypeScript benefits
```

#### Pattern 2: Inconsistent Error Handling
- Some components use try-catch
- Some rely on hook error handling
- Some don't handle errors at all

#### Pattern 3: Mixed State Management
- Query state from React Query
- Local state from useState
- Storage state from localStorage
- Context state from React Context
- Makes it hard to trace data flow

#### Pattern 4: Over-reliance on Side Effects
- useEffect with multiple dependencies
- Multiple separate queries instead of combined
- Manual refetch instead of automatic invalidation

---

## 9. PERFORMANCE OPTIMIZATIONS CHECKLIST

### Currently Implemented ✅
- [x] Code splitting with lazy loading
- [x] React Query for data caching
- [x] PWA with offline support
- [x] Workbox caching strategy
- [x] Vendor code splitting
- [x] Tree-shaking optimization
- [x] esbuild minification
- [x] SVG/Image optimization (browser-image-compression)
- [x] Pagination support in some tables

### Missing/Needed ⚠️
- [ ] Memoization of filtered/computed data (useMemo)
- [ ] Component-level memoization where needed (React.memo)
- [ ] Virtualization for large lists (would use react-virtual)
- [ ] Image lazy loading
- [ ] Database query optimization (avoid N+1)
- [ ] API request consolidation
- [ ] Debounce/throttle in search (partially done, but leaking)
- [ ] Pagination defaults for large queries
- [ ] GraphQL or API routes instead of direct DB access from client

---

## 10. CODE QUALITY OBSERVATIONS

### TypeScript Configuration
⚠️ **Loose TypeScript Settings:**
```json
{
  "noImplicitAny": false,        // Allows any without explicit types
  "noUnusedParameters": false,   // Allows unused params
  "noUnusedLocals": false,       // Allows unused variables
  "strictNullChecks": false      // Allows null/undefined without checks
}
```

**Impact:** Less type safety than strict mode would provide. Many `any` types found in code.

### Code Organization
✅ Good:
- Clear separation of concerns (components, hooks, lib)
- Consistent naming conventions
- Proper use of TypeScript interfaces

⚠️ Could improve:
- Some hooks are doing too much (mixing data fetch + mutations + subscriptions)
- Utility functions scattered across lib folder
- Some redundant code in similar components

### Error Handling
⚠️ Issues:
- Some errors logged but not shown to user
- Inconsistent error recovery patterns
- Missing error boundaries in some sections
- Toast error messages sometimes cut off

### Memory Management
⚠️ Concerns:
- Supabase subscriptions not always unsubscribed
- Timer cleanup missing in some useEffect hooks
- Event listeners properly cleaned up in most cases

---

## 11. SPECIFIC FILE ANALYSIS

### Critical Files

#### `/src/App.tsx`
- ✅ Good: Clean routing structure
- ✅ Good: Proper context provider nesting
- ⚠️ Could improve: Consider extracting route configuration

#### `/src/hooks/use-invoices.ts`
- ✅ Good: Comprehensive invoice CRUD operations
- ⚠️ Issue: Missing aggregation queries for reports

#### `/src/components/GlobalSearch.tsx`
- ⚠️ Issue: Memory leak from setTimeout
- ⚠️ Issue: Multiple simultaneous queries
- ⚠️ Issue: No result limiting except customers

#### `/src/contexts/FeatureContext.tsx`
- ✅ Good: Proper memoization
- ✅ Good: Handles super admin case
- ⚠️ Could improve: Event listener approach could be simpler

#### `/src/pages/Dashboard.tsx`
- ✅ Good: Parallel data fetching
- ⚠️ Could improve: Widget migration logic is complex

---

## 12. RECOMMENDATIONS

### High Priority (Do First)
1. **Fix N+1 Query in use-customers.ts**
   - Create aggregated query or use Supabase SQL function
   - Load customer stats in parallel, not sequential

2. **Fix Memory Leak in GlobalSearch**
   - Add cleanup to setTimeout in useEffect
   - Consider using useDebounce hook instead

3. **Add useMemo to Filtered Data**
   - Wrap filter/reduce operations in useMemo
   - Measure performance improvement

4. **Improve TypeScript Strictness**
   - Enable strictNullChecks at minimum
   - Replace 'any' types with proper interfaces

### Medium Priority
5. **Split Large Components**
   - Break UnifiedPreferences, WorkOrderDetails into smaller pieces
   - Easier to optimize and test

6. **Optimize GlobalSearch**
   - Add result pagination
   - Consider single aggregated query instead of multiple
   - Implement proper request cancellation

7. **Add Virtualization for Large Lists**
   - Tables with 100+ rows should virtualize
   - Use react-window or TanStack's virtual

8. **Improve Error Boundaries**
   - Add more granular error boundaries
   - Better error recovery strategies

### Low Priority (Nice to Have)
9. **Consider Database Views**
   - Create views for commonly aggregated data
   - Reduce client-side computation

10. **Implement Analytics**
    - Track slow queries
    - Monitor component render times
    - Find performance bottlenecks in production

11. **Add Request Cancellation**
    - Cancel previous search requests when new search starts
    - Prevent race conditions

12. **API Routes Instead of Direct DB Access**
    - Move complex queries to API routes
    - Better security and performance control

---

## 13. SUMMARY

**Strengths:**
- Well-structured architecture with clear separation of concerns
- Good use of modern React patterns (hooks, context, React Query)
- Comprehensive feature set with multiple data visualizations
- PWA support with offline capabilities
- Good TypeScript fundamentals (though loose config)
- Responsive design with Tailwind CSS

**Weaknesses:**
- Critical N+1 query performance issue in customer stats
- Memory leak in GlobalSearch component
- Missing memoization for filtered/computed data
- Large component files that are hard to optimize
- Loose TypeScript configuration reduces type safety
- Some sequential operations that should be parallel

**Overall Assessment:**
OrderSnapr is a mature, feature-rich SaaS application with solid fundamentals. The codebase demonstrates good architectural decisions and use of modern tooling. However, there are several performance issues that should be addressed, particularly the N+1 query problem and memory leaks. The recent work on fixing null org filter queries shows active maintenance and problem-solving. The application is production-ready but could benefit from the optimization recommendations above.

**Estimated User Impact (Current):**
- Small orgs (< 50 customers): No noticeable issues
- Medium orgs (50-500 customers): Slower customer list loads
- Large orgs (500+ customers): Significant slowdowns when loading customer stats

**Time to Implement High Priority Fixes:**
- N+1 Query Fix: 2-4 hours
- GlobalSearch Memory Leak: 1 hour
- useMemo Additions: 2-3 hours
- TypeScript Strictness: 4-6 hours
