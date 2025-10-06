# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize monorepo with separate frontend and backend directories
  - Configure TypeScript for both frontend and backend
  - Set up ESLint and Prettier for code quality
  - Create .env.example files with required environment variables
  - Initialize Git repository with .gitignore
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Set up database and ORM configuration
  - Install and configure PostgreSQL connection
  - Set up database migration tool (e.g., Knex or TypeORM migrations)
  - Create initial migration for Company table
  - Create migration for User table with role enum and manager relationship
  - Create migration for Expense table with multi-currency support
  - Create migration for ApprovalRule and ApprovalRuleApprover tables
  - Create migration for ApprovalRequest table
  - Create migration for ApprovalHistory table
  - Add database indexes for foreign keys and frequently queried columns
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 6.1, 6.2, 10.1, 10.6_

- [x] 3. Implement authentication system
  - [x] 3.1 Create User model with password hashing using bcrypt
    - Implement User entity with all fields from design
    - Add password hashing method in User model
    - Add password comparison method for login
    - _Requirements: 1.3, 2.1_
  - [x] 3.2 Implement JWT token generation and validation
    - Create utility functions for generating access and refresh tokens
    - Implement token verification middleware
    - Add token expiration handling
    - _Requirements: 1.3, 7.1, 7.4_
  - [x] 3.3 Create signup endpoint with company auto-creation



    - Implement POST /api/auth/signup endpoint
    - Accept country name and currency code from signup form
    - Validate currency code is provided
    - Auto-create Company with selected currency code as base currency
    - Auto-create Admin user associated with company
    - Return JWT tokens on successful signup
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  - [x] 3.4 Create login endpoint
    - Implement POST /api/auth/login endpoint
    - Validate email and password
    - Return JWT tokens and user info on success
    - _Requirements: 1.3, 7.1_
  - [x] 3.5 Create authentication middleware
    - Implement middleware to verify JWT tokens
    - Extract user info from token and attach to request
    - Handle token expiration and invalid tokens
    - _Requirements: 7.1, 7.4_

- [x] 4. Implement role-based authorization
  - [x] 4.1 Create authorization middleware
    - Implement middleware to check user roles
    - Create role-checking utility functions (isAdmin, isManager, isEmployee)
    - Add company isolation checks to ensure users only access their company data
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 4.2 Apply authorization to protected routes
    - Add role-based middleware to user management endpoints
    - Add role-based middleware to expense endpoints
    - Add role-based middleware to approval rule endpoints
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5. Implement User Management Service and API
  - [x] 5.1 Create UserService with CRUD operations
    - Implement createUser method
    - Implement getUserById method
    - Implement getUsersByCompany method
    - Implement updateUser method
    - Implement deleteUser method with validation for pending approvals
    - _Requirements: 2.1, 2.2, 2.6, 2.7_
  - [x] 5.2 Implement role and manager assignment methods
    - Implement assignRole method
    - Implement assignManager method
    - Add validation to prevent circular manager relationships
    - _Requirements: 2.3, 2.4, 2.5_


  - [x] 5.3 Create user management API endpoints






    - Implement POST /api/users (Admin only)
    - Implement POST /api/users/generate-password (Admin only) - generates secure password and sends email
    - Implement GET /api/users (Admin only)
    - Implement GET /api/users/:id
    - Implement PUT /api/users/:id (Admin only)
    - Implement DELETE /api/users/:id (Admin only)
    - Implement PUT /api/users/:id/role (Admin only)
    - Implement PUT /api/users/:id/manager (Admin only)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.13, 2.14, 2.15, 7.1, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  - [x] 5.4 Add single admin constraint validation




    - Implement validateSingleAdminConstraint method in UserService
    - Add validation middleware to prevent creating admin users
    - Add database constraint or check to ensure only one admin per company
    - Update signup flow to validate single admin on company creation
    - _Requirements: 2.8, 2.9, 2.10_
  - [x] 5.5 Implement admin-only user creation authorization








    - Add canUserCreateUsers method to UserService
    - Update user creation endpoint to check creator role
    - Return 403 Forbidden error for non-admin user creation attempts
    - _Requirements: 2.14, 2.15_

-
-

  - [ ] 5.6 Implement password generation and email service





    - Create generateSecurePassword function (8+ chars, mixed case, numbers, special chars)
    - Create sendPasswordEmail function to email credentials to new users
    - Implement POST /api/users/generate-password endpoint
    - Handle email delivery failures with appropriate error messages
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [x] 6. Implement Currency Service
  - [x] 6.1 Create CurrencyService with external API integration
    - Implement getCountriesWithCurrencies method using REST Countries API
    - Implement getExchangeRate method using Exchange Rate API
    - Implement convertAmount method
    - Add error handling for API failures
    - _Requirements: 9.1, 9.3, 9.7_
  - [x] 6.2 Set up Redis caching for exchange rates
    - Configure Redis connection
    - Implement getCachedRates method
    - Implement cacheRates method with 1-hour TTL
    - Add cache invalidation logic
    - _Requirements: 9.6_
  - [x] 6.3 Create currency API endpoints
    - Implement GET /api/currencies/countries
    - Implement GET /api/currencies/convert with query params
    - _Requirements: 9.1, 9.3_

- [ ] 7. Implement Expense Service and basic API

  - [x] 7.1 Create ExpenseService with CRUD operations





    - Implement saveDraftExpense method (saves without submitting, status=DRAFT, category=AMOUNT_TO_SUBMIT)
    - Implement submitExpense method (changes status to PENDING, category=WAITING_APPROVAL, initiates workflow)
    - Implement getExpenseById method
    - Implement getExpensesByUser method
    - Implement getExpensesByCategory method (filters by AMOUNT_TO_SUBMIT, WAITING_APPROVAL, APPROVED)
    - Implement getExpensesByCompany method (Admin only)
    - Implement getPendingApprovalsForUser method (Manager)
    - Implement updateExpense method (only for draft expenses)
    - Implement deleteExpense method (only for draft expenses)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13_


  - [x] 7.2 Implement currency conversion at approval time



    - Remove currency conversion from expense creation
    - Store only original amount and currency on submission
    - Implement convertExpenseCurrency method called during approval
    - Fetch exchange rates from API when manager/admin views expense
    - Store converted amount when expense is approved
    - Cache exchange rates for 1 hour to minimize API calls
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9, 5.10, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_
  - [x] 7.3 Create expense submission API endpoints




    - Implement POST /api/expenses/draft (Employee) - saves draft
    - Implement POST /api/expenses/:id/submit (Employee) - submits draft for approval
    - Implement GET /api/expenses (filtered by role and category)
    - Implement GET /api/expenses/category/:category (Employee) - gets expenses by category
    - Implement GET /api/expenses/:id
    - Implement PUT /api/expenses/:id (Employee, only for drafts)
    - Implement DELETE /api/expenses/:id (Employee, only for drafts)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13_

- [x] 8. Implement Approval Rule configuration with 3-part system




  - [x] 8.1 Create ApprovalRule model and service


    - Update ApprovalRule model to include isSequentialApproval boolean field
    - Update ApprovalRuleApprover model to include isRequired boolean field
    - Implement createApprovalRule method with required approvers and sequence settings
    - Implement getApprovalRulesByCompany method
    - Implement updateApprovalRule method
    - Implement deleteApprovalRule method
    - Add validation for approver sequences and required flags
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - [x] 8.2 Create approval rule API endpoints


    - Implement POST /api/approval-rules (Admin only)
    - Implement GET /api/approval-rules (Admin only)
    - Implement PUT /api/approval-rules/:id (Admin only)
    - Implement DELETE /api/approval-rules/:id (Admin only)
    - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 7.1_


- [-] 9. Implement Workflow Engine with 3-part approval system

  - [x] 9.1 Create WorkflowEngine service with manager approval check


    - Implement initiateWorkflow method to start approval process
    - Check employee's isManagerApprover flag first
    - If true, send approval request to employee's manager (sequence 0)
    - If false, proceed directly to required approvers
    - Load approval rule to get required approvers and sequence setting
    - _Requirements: 3.11, 3.12, 3.13, 4.1, 4.2, 4.3, 4.4, 4.9, 4.10, 4.11_
  - [x] 9.2 Implement sequential and parallel approval logic


    - Implement processApproval method to handle approval/rejection
    - Check if approval is from manager (sequence 0) and proceed to required approvers
    - Implement checkAllRequiredApproversApproved method
    - For sequential: send to next approver in sequence after each approval
    - For parallel: send to all required approvers simultaneously
    - Auto-reject if any required approver rejects
    - Call convertExpenseCurrency when all required approvers approve
    - Update expense status to APPROVED and category to APPROVED
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - [ ] 9.3 Implement currency conversion integration



    - Implement convertExpenseCurrency method
    - Fetch exchange rates from API using company base currency
    - Convert expense amount to company currency
    - Store converted amount in expense record
    - Handle same-currency expenses (no conversion needed)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.10, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_
  - [ ] 9.4 Integrate workflow engine with expense submission
    - Call initiateWorkflow when expense is submitted (not created as draft)
    - Set initial expense status to PENDING and category to WAITING_APPROVAL
    - _Requirements: 3.4, 3.5, 4.1, 4.4_

- [x] 10. Implement Approval Service and API
  - [x] 10.1 Create ApprovalService
    - Implement createApprovalRequest method
    - Implement approveExpense method
    - Implement rejectExpense method with required comments
    - Implement getApprovalHistory method
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 10.2, 10.3, 10.4, 10.5_
  - [x] 10.2 Create ApprovalHistory logging
    - Log all approval actions with timestamps
    - Log rejection actions with comments
    - Log admin override actions
    - Store metadata for audit trail
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  - [x] 10.3 Create approval API endpoints
    - Implement POST /api/expenses/:id/approve (Manager/Admin)
    - Implement POST /api/expenses/:id/reject (Manager/Admin)
    - Implement GET /api/expenses/:id/history
    - Integrate with WorkflowEngine for approval processing
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 7.2, 7.3, 10.2, 10.3, 10.4, 10.5_

- [x] 11. Implement OCR Service
  - [x] 11.1 Set up OCR provider integration
    - Choose OCR provider (Tesseract.js for local or cloud service)
    - Configure OCR provider credentials
    - Set up file upload handling with Multer
    - _Requirements: 8.1_
  - [x] 11.2 Create OCRService
    - Implement scanReceipt method to process image
    - Implement extractExpenseData method to parse OCR results
    - Extract amount, date, description, vendor name, expense type
    - Handle multiple expense lines if present
    - Detect and extract currency symbols
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
  - [x] 11.3 Create OCR API endpoint
    - Implement POST /api/ocr/scan with file upload
    - Validate file type and size
    - Return extracted expense data
    - Handle OCR failures gracefully
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 12. Set up frontend project structure
  - Initialize React project with TypeScript and Vite
  - Install dependencies (React Router, Axios, TanStack Query, Tailwind CSS, React Hook Form, Zod)
  - Configure Tailwind CSS
  - Set up folder structure (components, pages, services, hooks, types)
  - Create API client with Axios and base configuration
  - _Requirements: All frontend requirements_

- [x] 13. Implement frontend authentication
  - [x] 13.1 Create authentication context and hooks
    - Create AuthContext with user state and auth methods
    - Create useAuth hook for accessing auth state
    - Implement token storage in localStorage
    - Add automatic token refresh logic
    - _Requirements: 1.1, 1.3, 1.4, 7.1_
  - [ ] 13.2 Create SignupPage component with country and currency selection
    - Create signup form with all required fields
    - Fetch countries from https://restcountries.com/v3.1/all?fields=name,currencies on mount
    - Display country dropdown using name.common field
    - When country selected, extract currencies from currencies object
    - If country has 1 currency: auto-select currency code
    - If country has 2+ currencies: show currency dropdown for user to choose
    - Implement form validation with Zod
    - Send country name and currency code to signup API
    - Store tokens and redirect to dashboard on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 9.1, 9.2_
  - [x] 13.3 Create LoginPage component
    - Create login form with email and password
    - Implement form validation
    - Call login API and store tokens
    - Redirect to dashboard on success
    - _Requirements: 1.3, 7.1_
  - [x] 13.4 Create ProtectedRoute component
    - Implement route protection based on authentication
    - Redirect to login if not authenticated
    - Add role-based route protection
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 14. Implement Admin user management UI
  - [x] 14.1 Create UserManagement page
    - Display list of all users in company
    - Show user roles and manager relationships
    - Add create user button
    - Add edit and delete actions
    - _Requirements: 2.1, 2.7, 7.1_
  - [ ] 14.2 Create UserForm component with password generation
    - Create form for adding/editing users
    - Include fields for first name, last name, email, role, manager
    - Add "Send Password" button that calls password generation API
    - Show success message when password email is sent
    - Handle email delivery failures with error messages
    - Conditionally show manager dropdown only for Employee role
    - Implement form validation
    - Call user API endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [x] 14.3 Implement role and manager assignment
    - Create role selector dropdown
    - Create manager selector dropdown (filtered by role)
    - Handle role changes
    - Handle manager assignment
    - _Requirements: 2.3, 2.4, 2.5_
  - [ ] 14.4 Implement role dropdown restrictions
    - Filter role options to exclude Admin in creation mode
    - Show Admin role only when editing existing admin user
    - Disable role dropdown when editing admin user
    - _Requirements: 2.9, 2.10, 11.5, 11.6_
  - [ ] 14.5 Implement dynamic manager approver checkbox visibility
    - Show "Manager must approve expenses first" checkbox only for Employee role
    - Hide checkbox when Manager or Admin role is selected
    - Add descriptive text explaining the checkbox purpose
    - _Requirements: 3.8, 3.9, 3.10, 11.6, 11.7_
  - [ ] 14.6 Implement form state management for role changes
    - Clear isManagerApprover value when switching from Employee to Manager
    - Reset isManagerApprover when switching from Manager to Employee
    - Maintain other form field values during role changes
    - Clear validation errors for hidden fields
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [ ] 14.7 Add admin-only access control to user creation
    - Hide or disable "Create User" button for non-admin users
    - Show "Create User" button only for admin users
    - Display authorization error if non-admin attempts to access form
    - _Requirements: 2.11, 2.12_

- [ ] 15. Implement Admin approval rule configuration UI with 3-part system
  - [ ] 15.1 Create ApprovalRuleConfig page
    - Display current approval rule configuration
    - Show three configuration sections clearly separated
    - Add edit button to modify configuration
    - Add save button to persist changes
    - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 7.1_
  - [ ] 15.2 Create ApprovalRuleForm component with 3-part configuration
    - Part 1: Display info about "Is Manager Approver" (configured per employee in User Form)
    - Part 2: Create "Required Approvers" section with manager list and checkboxes
    - Add sequence number input for each checked approver
    - Part 3: Create "Approvers Sequence" checkbox to toggle sequential vs parallel
    - Show descriptive text explaining sequential vs parallel behavior
    - Implement form validation (ensure sequence numbers are unique if sequential)
    - Call approval rule API to save configuration
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 16. Implement Employee expense submission UI with draft and categories
  - [ ] 16.1 Create ExpenseSubmissionForm component with draft/submit options
    - Create form with amount, currency, category, description, date fields
    - Add currency selector supporting any currency
    - Add receipt upload with preview
    - Add "Save as Draft" button (saves without submitting)
    - Add "Submit for Approval" button (submits and initiates workflow)
    - Implement form validation with Zod
    - Call appropriate API endpoint based on button clicked
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  - [x] 16.2 Integrate OCR receipt scanning
    - Add OCR scan button to receipt uploader
    - Call OCR API when receipt is uploaded
    - Auto-populate form fields with OCR results
    - Allow user to review and edit extracted data
    - Handle OCR failures with fallback to manual entry
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [ ] 16.3 Create ExpenseDashboard component with three categories
    - Create dashboard with three sections: "Amount to Submit", "Waiting Approval", "Approved"
    - Fetch expenses by category from API
    - Display expense count and total amount for each category
    - Show list of expenses in each category
    - Add click to view/edit expense details
    - Allow editing/deleting drafts in "Amount to Submit"
    - Show read-only view for "Waiting Approval" and "Approved"
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 10.1_

- [ ] 17. Implement expense detail and approval history UI
  - [ ] 17.1 Create ExpenseDetailView component with currency display
    - Display all expense details
    - Show original amount and currency prominently
    - Show converted amount in company currency (only if approved)
    - Display "Conversion pending approval" message for pending expenses
    - Display receipt image if available
    - Show current approval status and category
    - Add edit button for draft expenses
    - Add submit button for draft expenses
    - _Requirements: 3.6, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 5.2, 5.3, 5.4, 5.5, 9.4, 9.5, 9.10, 10.1, 10.2, 10.3_
  - [x] 17.2 Create ApprovalTimeline component
    - Display visual timeline of approval workflow
    - Show completed approvals with timestamps
    - Show pending approvals
    - Show approver comments
    - Highlight current approver
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 18. Implement Manager approval UI with real-time currency conversion
  - [ ] 18.1 Create PendingApprovalsView component
    - Display list of expenses awaiting manager's approval
    - Fetch and display converted amounts using current exchange rates
    - Show both original amount/currency and converted amount
    - Add approve and reject buttons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.10, 7.2_
  - [ ] 18.2 Create ExpenseApprovalDetail component with currency conversion
    - Display full expense details for approval
    - Fetch current exchange rates from API
    - Calculate and display converted amount in company default currency
    - Show original amount and currency alongside converted amount
    - Display exchange rate used for conversion
    - Add approve button with optional comments
    - Add reject button with required comments
    - Call approval API endpoints which will store the converted amount
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9, 5.10, 7.2, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_
  - [ ] 18.3 Create TeamExpensesView component
    - Display all expenses from manager's direct reports
    - Filter by status, category, and date range
    - Show expense summaries with converted amounts
    - _Requirements: 5.7, 7.2_

- [x] 19. Implement Admin override and all expenses view
  - [x] 19.1 Create AllExpensesView component
    - Display all expenses across the company
    - Add filters for status, submitter, date range
    - Show expense summaries with converted amounts
    - Add admin override actions
    - _Requirements: 7.1, 7.6_
  - [x] 19.2 Implement admin override functionality
    - Add override approve button (Admin only)
    - Add override reject button (Admin only)
    - Require comments for overrides
    - Log override actions in approval history
    - _Requirements: 7.1, 7.6, 10.7_

- [x] 20. Implement shared UI components
  - Create CurrencySelector component with country flags
  - Create ExpenseStatusBadge component with color coding
  - Create ReceiptUploader component with drag-and-drop
  - Create LoadingSpinner component
  - Create ErrorMessage component
  - Create ConfirmDialog component for delete actions
  - _Requirements: 3.1, 3.5, 8.1_
  - [ ] 20.1 Create RoleBasedGuard component
    - Implement component wrapper for role-based UI visibility
    - Accept allowedRoles prop to control access
    - Support optional fallback content
    - Use in UserManagement to guard Create User button
    - _Requirements: 2.11, 7.1, 7.2, 7.3_

- [x] 21. Add error handling and validation
  - Implement global error boundary in React
  - Add API error handling with user-friendly messages
  - Implement form validation error display
  - Add loading states for async operations
  - Handle network errors and timeouts
  - _Requirements: 3.7, 7.4, 8.5, 8.7, 9.7_

- [x] 22. Implement notifications
  - Set up notification system (toast notifications)
  - Add success notifications for actions
  - Add error notifications for failures
  - Add approval request notifications for managers
  - _Requirements: 4.8, 5.6_

- [x] 23. Add responsive design and accessibility
  - Ensure all components are mobile-responsive
  - Add proper ARIA labels and roles
  - Implement keyboard navigation
  - Test with screen readers
  - Add focus management for modals and forms
  - _Requirements: All UI requirements_

- [x] 24. Set up environment configuration
  - Create environment variable files for development and production
  - Configure API base URLs
  - Configure external API keys (OCR, currency APIs)
  - Configure database connection strings
  - Configure Redis connection
  - Configure JWT secrets
  - _Requirements: All requirements_

- [x] 25. Create database seed data for development
  - Create seed script for sample company
  - Create seed users with different roles
  - Create seed approval rules
  - Create seed expenses with various statuses
  - _Requirements: All requirements for testing_

- [ ] 26. Add API documentation
  - Document all API endpoints with request/response examples
  - Add authentication requirements for each endpoint
  - Document error responses
  - Create Postman collection or OpenAPI spec
  - _Requirements: All API requirements_

- [x] 27. Perform integration testing
  - [x] 27.1 Test authentication flows
    - Test complete signup and company creation flow
    - Test login with valid and invalid credentials
    - Test token refresh and expiration handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1_
  - [x] 27.2 Test user management
    - Test user creation by admin
    - Test role assignment and updates
    - Test manager relationship assignment
    - Test deletion prevention with pending approvals
    - Test authorization checks for different roles
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1_
  - [ ]* 27.6 Test single admin constraint and user creation restrictions
    - Test that only one admin exists per company after signup
    - Test that admin role is not available in user creation form
    - Test that non-admin users cannot create users (UI and API)
    - Test that admin role dropdown is disabled when editing admin user
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12_
  - [ ]* 27.7 Test form state management
    - Test manager approver checkbox visibility based on role selection
    - Test isManagerApprover value clearing when switching roles
    - Test form field persistence during role changes
    - Test validation error clearing for hidden fields
    - _Requirements: 3.8, 3.9, 3.10, 11.1, 11.2, 11.3, 11.4, 11.6, 11.7_
  - [x] 27.3 Test expense submission and management
    - Test expense submission with OCR
    - Test multi-currency expense handling
    - Test expense retrieval and filtering
    - Test expense modification restrictions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 9.3, 9.4_
  - [x] 27.4 Test approval workflows
    - Test sequential approval workflow
    - Test conditional approval rules (percentage, specific, hybrid)
    - Test manager approval combined with rules
    - Test rejection flow
    - Test admin override functionality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 5.3, 5.4, 5.5, 5.6, 6.4, 6.5, 6.6, 6.7, 7.6, 10.7_
  - [x] 27.5 Test currency conversion
    - Test real-time currency conversion
    - Test exchange rate caching
    - Test currency conversion display
    - Test API failure handling
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 28. Final polish and deployment preparation





  - Review and fix any remaining bugs
  - Optimize performance (lazy loading, code splitting)
  - Add production build configuration
  - Create deployment documentation
  - Set up environment for production deployment
  - _Requirements: All requirements_
