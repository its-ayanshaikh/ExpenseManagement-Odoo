# ProtectedRoute Component

The `ProtectedRoute` component provides comprehensive route protection based on authentication and role-based permissions, implementing **Requirement 7: Role-Based Permissions**.

## Features

- **Authentication Protection**: Redirects unauthenticated users to login
- **Role-Based Access Control**: Supports Admin, Manager, and Employee role restrictions
- **Flexible Permission Checking**: Multiple ways to define access requirements
- **User-Friendly Error Messages**: Clear feedback when access is denied
- **Loading States**: Shows loading spinner during authentication checks

## Requirements Implementation

### Requirement 7.1 - Admin Permissions
Admin users can access functionality for:
- Creating companies
- Managing users
- Setting roles
- Configuring approval rules
- Viewing all expenses
- Overriding approvals

### Requirement 7.2 - Manager Permissions
Manager users can access functionality for:
- Approving/rejecting expenses
- Viewing team expenses
- Escalating per rules

### Requirement 7.3 - Employee Permissions
Employee users can access functionality for:
- Submitting expenses
- Viewing own expenses
- Checking approval status

### Requirement 7.4 - Access Denial
When users attempt to access functionality outside their role permissions, the system denies access and displays an authorization error.

## Usage Examples

### Basic Authentication Protection
```tsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

### Admin-Only Access
```tsx
<ProtectedRoute adminOnly>
  <AdminPanel />
</ProtectedRoute>
```

### Manager or Admin Access
```tsx
<ProtectedRoute managerOrAdmin>
  <ApprovalManagement />
</ProtectedRoute>
```

### Employee-Only Access
```tsx
<ProtectedRoute employeeOnly>
  <EmployeePanel />
</ProtectedRoute>
```

### Specific Role Requirement
```tsx
<ProtectedRoute requiredRole={UserRole.MANAGER}>
  <ManagerDashboard />
</ProtectedRoute>
```

### Multiple Role Requirements (Any)
```tsx
<ProtectedRoute 
  requiredRole={[UserRole.EMPLOYEE, UserRole.MANAGER]} 
  requireAnyRole
>
  <ExpenseSubmission />
</ProtectedRoute>
```

### Custom Permission Check
```tsx
<ProtectedRoute 
  customCheck={(user) => user?.isManagerApprover === true}
>
  <SpecialFeature />
</ProtectedRoute>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | The component(s) to render when access is granted |
| `requiredRole` | `UserRole \| UserRole[]` | - | Specific role(s) required for access |
| `requireAnyRole` | `boolean` | `false` | If true with role array, user needs ANY of the roles |
| `adminOnly` | `boolean` | `false` | Restrict access to Admin users only |
| `managerOrAdmin` | `boolean` | `false` | Allow Manager or Admin users |
| `employeeOnly` | `boolean` | `false` | Restrict access to Employee users only |
| `customCheck` | `(user: User \| null) => boolean` | - | Custom permission validation function |

## Permission Utilities

The component uses utility functions from `utils/permissions.ts`:

### Role Checking Functions
- `isAdmin(user)` - Check if user is Admin
- `isManager(user)` - Check if user is Manager  
- `isEmployee(user)` - Check if user is Employee
- `hasManagerPrivileges(user)` - Check if user is Admin or Manager
- `hasRole(user, role)` - Check if user has specific role
- `hasAnyRole(user, roles)` - Check if user has any of the specified roles

### Permission Functions
- `canManageUsers(user)` - Admin only
- `canConfigureApprovalRules(user)` - Admin only
- `canViewAllExpenses(user)` - Admin only
- `canOverrideApprovals(user)` - Admin only
- `canApproveRejectExpenses(user)` - Manager or Admin
- `canViewTeamExpenses(user)` - Manager or Admin
- `canSubmitExpenses(user)` - All authenticated users
- `canViewOwnExpenses(user)` - All authenticated users

## Error Handling

When access is denied, the component displays:
- Clear "Access Denied" message
- Required vs. actual role information
- Navigation options (Go Back, Go to Dashboard)
- Professional error UI with appropriate styling

## Loading States

While checking authentication:
- Shows loading spinner
- Prevents flash of unauthorized content
- Maintains good user experience

## Integration with Auth System

The component integrates with:
- `AuthContext` for authentication state
- `useAuth` hook for user data
- JWT token validation
- Automatic redirect to login for unauthenticated users

## Best Practices

1. **Use specific permission props** when possible (e.g., `adminOnly` vs generic `requiredRole`)
2. **Combine with navigation guards** for complete route protection
3. **Test all permission scenarios** to ensure proper access control
4. **Use custom checks sparingly** - prefer built-in role checks when possible
5. **Provide clear error messages** for better user experience

## Security Considerations

- All permission checks are performed on both client and server
- Client-side checks are for UX only - server enforces actual security
- JWT tokens are validated on each protected route access
- Role changes take effect immediately without requiring re-login