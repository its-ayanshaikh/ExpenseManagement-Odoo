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
    - Fetch country currency data from REST Countries API
    - Auto-create Company with selected country's currency
    - Auto-create Admin user associated with company
    - Return JWT tokens on successful signup
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2_
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
-

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
    - Implement GET /api/users (Admin only)
    - Implement GET /api/users/:id
    - Implement PUT /api/users/:id (Admin only)
    - Implement DELETE /api/users/:id (Admin only)
    - Implement PUT /api/users/:id/role (Admin only)
    - Implement PUT /api/users/:id/manager (Admin only)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1_
  - [ ]* 5.4 Write unit tests for UserService
    - Test user creation with valid data
    - Test role assignment and updates
    - Test manager relationship assignment
    - Test deletion prevention with pending approvals
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

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
  - [ ]* 6.4 Write unit tests for CurrencyService
    - Test currency conversion with mocked API responses
    - Test caching behavior
    - Test error handling when APIs are unavailable
    - _Requirements: 9.3, 9.6, 9.7_


- [x] 7. Implement Expense Service and basic API




  - [x] 7.1 Create ExpenseService with CRUD operations


    - Implement createExpense method with currency conversion
    - Implement getExpenseById method
    - Implement getExpensesByUser method
    - Implement getExpensesByCompany method (Admin only)
    - Implement getPendingApprovalsForUser method (Manager)
    - Implement updateExpense method (only before approval)
    - Implement deleteExpense method (only before approval)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.7_
  - [x] 7.2 Add currency conversion on expense creation


    - Convert expense amount to company default currency
    - Store both original and converted amounts
    - Handle conversion errors gracefully
    - _Requirements: 9.3, 9.4, 9.5_
  - [x] 7.3 Create expense submission API endpoints


    - Implement POST /api/expenses (Employee)
    - Implement GET /api/expenses (filtered by role)
    - Implement GET /api/expenses/:id
    - Implement PUT /api/expenses/:id (Employee, before approval)
    - Implement DELETE /api/expenses/:id (Employee, before approval)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.7, 7.2, 7.3_
  - [ ]* 7.4 Write unit tests for ExpenseService
    - Test expense creation with currency conversion
    - Test filtering expenses by user and company
    - Test update and delete restrictions after approval
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.3, 9.4_

- [x] 8. Implement Approval Rule configuration




-


  - [x] 8.1 Create ApprovalRule model and service




    - Implement createApprovalRule method
    - Implement getApprovalRulesByCompany method
    - Implement updateApprovalRule method
    - Implement deleteApprovalRule method
    - Add validation for rule types and thresholds
    - _Requirements: 6.1, 6.2, 6.3_


  - [x] 8.2 Create approval rule API endpoints










    - Implement POST /api/approval-rules (Admin only)
    - Implement GET /api/approval-rules (Admin only)
    - Implement PUT /api/approval-rules/:id (Admin only)
    - Implement DELETE /api/approval-rules/:id (Admin only)
    - _Requirements: 6.1, 6.2, 6.3, 7.1_
  - [ ]* 8.3 Write unit tests for ApprovalRule service
    - Test rule creation with different types
    - Test validation for percentage thresholds
    - Test hybrid rule configuration
    - _Requirements: 6.1, 6.2, 6.3_
- [x] 9. Implement Workflow Engine




- [ ] 9. Implement Workflow Engine

  - [x] 9.1 Create WorkflowEngine service


    - Implement initiateWorkflow method to start approval process
    - Check IS_MANAGER_APPROVER flag and route accordingly
    - Create initial approval request(s) based on rules
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 9.2 Implement sequential approval logic


    - Implement processApproval method
    - Implement getNextApprover method
    - Handle approval and rejection decisions
    - Update expense status based on workflow completion
    - _Requirements: 4.5, 4.6, 4.7, 4.8_
  - [x] 9.3 Implement conditional rule evaluation


    - Implement evaluateConditionalRules method
    - Check percentage-based rules
    - Check specific approver rules
    - Check hybrid rules (percentage OR specific approver)
    - Auto-approve when conditions are met
    - _Requirements: 6.4, 6.5, 6.6, 6.7_
  - [x] 9.4 Integrate workflow engine with expense creation


    - Call initiateWorkflow when expense is submitted
    - Set initial expense status to PENDING
    - _Requirements: 3.4, 4.1, 4.4_
  - [ ]* 9.5 Write unit tests for WorkflowEngine
    - Test sequential approval flow with multiple approvers
    - Test conditional rule evaluation (percentage, specific, hybrid)
    - Test rejection handling at different stages
    - Test manager approval combined with rule-based approval
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.4, 6.5, 6.6, 6.7_
-

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
  - [ ]* 10.4 Write unit tests for ApprovalService
    - Test approval request creation
    - Test approval and rejection with comments
    - Test approval history logging
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 10.2, 10.3, 10.4, 10.5_

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
  - [ ]* 11.4 Write unit tests for OCRService
    - Test receipt scanning with sample images
    - Test data extraction accuracy
    - Test error handling for invalid images
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.7_


- [x] 12. Set up frontend project structure






  - Initialize React project with TypeScript and Vite
  - Install dependencies (React Router, Axios, TanStack Query, Tailwind CSS, React Hook Form, Zod)
  - Configure Tailwind CSS
  - Set up folder structure (components, pages, services, hooks, types)
  - Create API client with Axios and base configuration
  - _Requirements: All frontend requirements_
-

- [-] 13. Implement frontend authentication



  - [x] 13.1 Create authentication context and hooks


    - Create AuthContext with user state and auth methods
    - Create useAuth hook for accessing auth state
    - Implement token storage in localStorage
    - Add automatic token refresh logic
    - _Requirements: 1.1, 1.3, 1.4, 7.1_
  - [x] 13.2 Create SignupPage component


    - Create signup form with country selection
    - Fetch countries from API
    - Implement form validation with Zod
    - Call signup API and store tokens
    - Redirect to dashboard on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2_
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
  - [x] 14.2 Create UserForm component


    - Create form for adding/editing users
    - Include fields for name, email, role, manager
    - Implement form validation
    - Call user API endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 14.3 Implement role and manager assignment


    - Create role selector dropdown
    - Create manager selector dropdown (filtered by role)
    - Handle role changes


    - Handle manager assignment
    - _Requirements: 2.3, 2.4, 2.5_


- [x] 15. Implement Admin approval rule configuration UI





  - [x] 15.1 Create ApprovalRuleConfig page


    - Display list of approval rules
    - Add create rule button
    - Add edit and delete actions
    - _Requirements: 6.1, 6.2, 6.3, 7.1_
  - [x] 15.2 Create ApprovalRuleForm component


    - Create form for rule configuration
    - Add rule type selector (Sequential, Percentage, Speci

fic Approver, Hybrid)
    - Add percentage threshold input (for percentage rules)
    - Add specific approver selector (for specific approver rule
s)
    - Add approver sequence configuration (for sequential rules)
    - Implement form validation
    - _Requirements: 6.1, 6.2, 6.3, 4.1, 4.2_

- [x] 16. Implement Employee expense submission UI





  - [x] 16.1 Create ExpenseSubmissionForm component


    - Create form with amount, currency, category, description, date fields
    - Add currency selector using countries API
    - Add receipt upload with preview
    - Implement form validation with Zod
    - Call expense creation API
    - _Requirements: 3.1, 3.2, 3.3, 3.7_
  - [x] 16.2 Integrate OCR receipt scanning


    - Add OCR scan button to receipt uploader
    - Call OCR API when receipt is uploaded
    - Auto-populate form fields with OCR results
    - Allow user to review and edit extracted data
    - Handle OCR failures with fallback to manual entry

    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [x] 16.3 Create ExpenseHistoryView component


    - Display list of user's submitted expenses
    - Show expense status badges (Pending, Approved, Rejected)
    - Add filters for status and date range
    - Add click to view expense details
    - _Requirements: 3.5, 10.1_

- [x] 17. Implement expense detail and approval history UI





  - [x] 17.1 Create ExpenseDetailView component


    - Display all expense details
    - Show original amount and currency
    - Show converted amount in company currency
    - Display receipt image if available


    - Show current approval status
    - _Requirements: 3.6, 5.2, 5.3, 9.4, 9.5, 10.1, 10.2, 10.3_
  - [x] 17.2 Create ApprovalTimeline component


    - Display visual timeline of approval workflow
    - Show completed approvals with timestamps
    - Show pending approvals
    - Show approver comments
    - Highlight current approver
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 18. Implement Manager approval UI





  - [x] 18.1 Create PendingApprovalsView component


    - Display list of expenses awaiting manager's approval
    - Show expense details with converted amounts
    - Add approve and reject buttons
    - _Requirements: 5.1, 5.2, 5.3, 7.2_
  - [x] 18.2 Create ExpenseApprovalDetail component



    - Display full expense details for approval

    - Show amounts in company default currency
    - Add approve button with optional comments
    - Add reject button with required comments
    - Call approval API endpoints
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 7.2_
  - [x] 18.3 Create TeamExpensesView component


    - Display all expenses from manager's direct reports
    - Filter by status and date range
    - Show expense summaries
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








- [ ] 23. Add responsive design and accessibility

  - Ensure all components are mobile-responsive
  - Add proper ARIA labels and roles
  - Implement keyboard navigation
  - Test with screen readers
  - Add focus management for modals and forms
  - _Requirements: All UI requirements_
-

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

- [-] 27. Perform integration testing


  - Test complete signup and company creation flow
  - Test user management by admin
  - Test expense submission with OCR
  - Test sequential approval workflow
  - Test conditional approval rules
  - Test manager approval combined with rules
  - Test rejection flow
  - Test currency conversion display
  - Test admin override functionality
  - _Requirements: All requirements_

- [ ] 28. Final polish and deployment preparation
  - Review and fix any remaining bugs
  - Optimize performance (lazy loading, code splitting)
  - Add production build configuration
  - Create deployment documentation
  - Set up environment for production deployment
  - _Requirements: All requirements_
