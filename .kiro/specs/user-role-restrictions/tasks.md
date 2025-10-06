# Implementation Plan

- [x] 1. Implement role dropdown filtering logic






  - Create helper function `getAvailableRoles()` that filters role options based on existing users and editing context
  - Function should check if admin exists in users array
  - Function should preserve admin role option when editing existing admin user
  - Function should hide admin option when creating new user and admin already exists
  - Return array of role options with visibility and disabled states
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Update UserForm role dropdown rendering
  - Modify role dropdown JSX to use filtered role options from `getAvailableRoles()`
  - Implement conditional rendering to hide admin option when appropriate
  - Add disabled state styling for admin role when editing existing admin
  - Ensure dropdown maintains proper accessibility attributes
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Implement manager approval checkbox conditional visibility
  - Create helper function `shouldShowManagerApprovalCheckbox()` that returns boolean based on selected role
  - Function should return true only for Employee role
  - Function should return false for Manager and Admin roles
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Update UserForm manager approval checkbox rendering
  - Wrap manager approval checkbox and description in conditional rendering
  - Use `shouldShowManagerApprovalCheckbox()` to control visibility
  - Ensure checkbox section is completely hidden (not just disabled) for non-employee roles
  - Maintain proper form spacing when checkbox is hidden
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Enhance form state management for role changes
  - Update `handleInputChange` function to detect role changes
  - Add logic to clear `managerId` when role changes to Admin
  - Add logic to reset `isManagerApprover` to false when role changes to Manager or Admin
  - Clear validation errors for fields that become hidden after role change
  - Ensure all other form fields remain unchanged during role transitions
  - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Add admin uniqueness validation
  - Update `validateForm()` function to check for existing admin when creating new user
  - Add validation error when attempting to create admin role and admin already exists
  - Validation should only apply to new user creation, not editing existing users
  - Set appropriate error message: "An admin already exists for this company"
  - Display error under role dropdown field
  - _Requirements: 1.1_

- [ ] 7. Add manager requirement validation for manager approval
  - Update `validateForm()` function to check manager assignment when manager approval is enabled
  - Add validation error when Employee has `isManagerApprover` checked but no `managerId` assigned
  - Set appropriate error message: "Manager must be assigned when manager approval is required"
  - Display error under manager dropdown field
  - _Requirements: 2.1_

- [ ] 8. Verify UserManagementPage access control
  - Confirm existing `canManageUsers()` permission check is working correctly
  - Verify Create User button is only visible to admin users
  - Verify non-admin users see access denied message
  - Ensure permission check happens before rendering user management interface
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 9. Add unit tests for role filtering logic
  - Write test for hiding admin option when creating new user with existing admin
  - Write test for showing admin option when editing existing admin user
  - Write test for showing all roles when no admin exists in company
  - Write test for proper disabled state on admin role when editing admin
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 10. Add unit tests for manager approval checkbox visibility
  - Write test verifying checkbox is visible for Employee role
  - Write test verifying checkbox is hidden for Manager role
  - Write test verifying checkbox is hidden for Admin role
  - Write test for dynamic visibility when switching between roles
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 11. Add unit tests for form state management
  - Write test for clearing managerId when role changes to Admin
  - Write test for resetting isManagerApprover when role changes to Manager
  - Write test for maintaining other form fields during role changes
  - Write test for clearing validation errors when fields become hidden
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 12. Add unit tests for form validation
  - Write test for admin uniqueness validation error
  - Write test for manager requirement when manager approval enabled
  - Write test for successful validation with proper role and settings
  - Write test for validation error clearing when issues are resolved
  - _Requirements: 1.1, 2.1_

- [ ]* 13. Add integration tests for user creation flow
  - Write test for complete employee creation with manager approval
  - Write test for complete manager creation without manager approval
  - Write test for admin restriction when admin already exists
  - Write test for successful form submission with proper role settings
  - _Requirements: 1.1, 2.1, 2.5, 3.4_

- [ ] 14. Manual testing and verification
  - Test admin access to user management page
  - Test non-admin access denial to user management page
  - Test role dropdown behavior when creating new user with existing admin
  - Test role dropdown behavior when editing existing admin user
  - Test manager approval checkbox visibility for all three roles
  - Test form state transitions when switching between roles
  - Test validation errors for admin uniqueness
  - Test validation errors for manager requirement with manager approval
  - Test successful user creation for Employee and Manager roles
  - Test successful user editing without breaking role restrictions
  - _Requirements: All_
