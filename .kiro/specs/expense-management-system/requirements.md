# Requirements Document

## Introduction

This document outlines the requirements for an Expense Management System designed to streamline and automate the expense reimbursement process for companies. The system addresses manual, time-consuming, and error-prone processes by providing automated approval workflows, multi-level approvals, flexible approval rules, and OCR-based receipt scanning. The system supports multi-currency operations and provides role-based access control for Admins, Managers, and Employees.

## Requirements

### Requirement 1: Company and Admin Auto-Creation with Country and Currency Selection

**User Story:** As a new user signing up for the first time, I want to select my country from a dropdown and have the system automatically set my company's base currency, so that I can immediately start managing my organization's expenses in the correct currency.

#### Acceptance Criteria

1. WHEN a user accesses the signup form THEN the system SHALL fetch country data from https://restcountries.com/v3.1/all?fields=name,currencies
2. WHEN the country data is loaded THEN the system SHALL display a dropdown list of countries using the "name.common" field
3. WHEN a user selects a country THEN the system SHALL examine the "currencies" object for that country
4. IF the selected country has exactly one currency THEN the system SHALL automatically select that currency code (e.g., "EUR" for Lithuania)
5. IF the selected country has multiple currencies (e.g., Cambodia with "KHR" and "USD") THEN the system SHALL display a currency dropdown for the user to choose
6. WHEN a user completes first-time signup THEN the system SHALL automatically create a new Company entity with the selected country and currency
7. WHEN a Company is created THEN the system SHALL store the selected currency code as the company's base currency
8. WHEN a Company is created THEN the system SHALL automatically create an Admin User account associated with that company
9. WHEN the company creation process completes THEN the system SHALL grant the user full admin privileges
10. IF a user attempts to sign up with an existing email THEN the system SHALL prevent duplicate account creation and display an appropriate error message

### Requirement 2: User and Role Management with On-the-Fly Creation

**User Story:** As an Admin, I want to create users on-the-fly with automatic password generation and email delivery, so that I can quickly onboard employees and managers into the system.

#### Acceptance Criteria

1. WHEN an Admin accesses the user management interface THEN the system SHALL display options to create Employees and Managers
2. WHEN an Admin creates a new user THEN the system SHALL require basic information (first name, last name, email, role)
3. WHEN an Admin assigns a role THEN the system SHALL support Employee and Manager role types
4. WHEN an Admin selects "Employee" role THEN the system SHALL display a "Manager" dropdown field to assign the employee's direct manager
5. WHEN an Admin selects "Manager" or "Admin" role THEN the system SHALL hide the "Manager" dropdown field as these roles do not require manager assignment
6. WHEN an Admin clicks the "Send Password" button THEN the system SHALL generate a random password meeting security requirements
7. WHEN a random password is generated THEN the system SHALL send it to the user's email address
8. WHEN an Admin changes a user's role THEN the system SHALL update the user's permissions immediately
9. IF an Admin attempts to delete a user with pending expense approvals THEN the system SHALL prevent deletion and display a warning message
10. WHEN an Admin views the user list THEN the system SHALL display all users with their roles and manager relationships
11. WHEN the system is initialized with a new company THEN the system SHALL ensure only one Admin user exists per company
12. WHEN an Admin opens the user creation form THEN the system SHALL NOT display "Admin" as a selectable role option
13. WHEN viewing the role dropdown during user creation THEN the system SHALL only display "Employee" and "Manager" as available options
14. IF a non-admin user attempts to access user creation functionality THEN the system SHALL prevent access and hide or disable the "Create User" button
15. WHEN a non-admin user attempts to access the user creation endpoint THEN the backend SHALL return a 403 Forbidden error

### Requirement 3: Expense Submission by Employees with Multi-Currency Support

**User Story:** As an Employee, I want to submit expense claims in any currency and track them through different stages, so that I can manage my business expense reimbursements effectively.

#### Acceptance Criteria

1. WHEN an Employee accesses the expense submission form THEN the system SHALL display fields for Amount, Currency, Category, Description, and Date
2. WHEN an Employee submits an expense THEN the system SHALL accept amounts in any currency different from the company's default currency
3. WHEN an Employee submits an expense THEN the system SHALL validate that all required fields are completed
4. WHEN an expense is submitted THEN the system SHALL move it to the "Waiting Approval" category
5. WHEN an Employee views their expense dashboard THEN the system SHALL display three categories: "Amount to Submit" (drafts), "Waiting Approval" (submitted), and "Approved" (approved expenses)
6. WHEN an Employee saves an expense without submitting THEN the system SHALL store it in the "Amount to Submit" category as a draft
7. WHEN an expense is approved THEN the system SHALL move it to the "Approved" category
8. WHEN an Employee views their expense history THEN the system SHALL display all expenses with their current status and category
9. WHEN an Employee views expense details THEN the system SHALL show approval history and any comments from approvers
10. IF an Employee submits an expense with invalid data THEN the system SHALL display specific validation error messages
11. WHEN an Employee has the "Manager must approve expenses first" setting enabled THEN the system SHALL route their submitted expenses to their assigned manager first before other approvers
12. WHEN creating or editing an Employee user THEN the system SHALL display a "Manager must approve expenses first" checkbox option
13. WHEN creating or editing a Manager or Admin user THEN the system SHALL hide the "Manager must approve expenses first" checkbox since these roles do not submit expenses

### Requirement 4: Flexible Approval Workflow with Sequential and Parallel Options

**User Story:** As an Admin, I want to configure approval workflows with both sequential and parallel approval options, including required approvers, so that I can implement flexible approval processes that match my company's needs.

#### Acceptance Criteria

1. WHEN an Admin configures approval workflows THEN the system SHALL display three configuration sections: "Is Manager Approver" checkbox, "Required Approvers" list with checkmarks, and "Approvers Sequence" checkbox
2. WHEN an Admin enables "Is Manager Approver" for an employee THEN the system SHALL route that employee's expenses to their assigned manager first before any other approvers
3. WHEN an Admin marks specific managers as "Required Approvers" with checkmarks THEN the system SHALL ensure those approvers must approve regardless of other approval combinations
4. WHEN an Admin enables "Approvers Sequence" checkbox THEN the system SHALL send approval requests sequentially in the defined order (e.g., John → Mitchell → Sarah)
5. WHEN "Approvers Sequence" is enabled and sequential approval is in progress THEN the system SHALL wait for each approver's response before sending to the next approver
6. WHEN an Admin disables "Approvers Sequence" checkbox THEN the system SHALL send approval requests to all approvers simultaneously (parallel approval)
7. WHEN a required approver rejects an expense THEN the system SHALL immediately mark the expense as Rejected and halt the workflow
8. WHEN sequential approval is enabled and any approver rejects THEN the system SHALL halt the workflow and mark the expense as Rejected
9. WHEN parallel approval is enabled and all required approvers approve THEN the system SHALL mark the expense as Approved
10. WHEN "Is Manager Approver" is enabled and manager approves THEN the system SHALL proceed to the configured approvers (sequential or parallel) based on the "Approvers Sequence" setting
11. WHEN combining all three approval configurations THEN the system SHALL process in order: Manager (if enabled) → Required Approvers (sequential or parallel based on sequence setting)
12. WHEN an approval request is generated THEN the system SHALL create a notification or approval record in the approver's account

### Requirement 5: Manager Approval Actions with Currency Conversion

**User Story:** As a Manager, I want to view pending expenses with automatic currency conversion and approve or reject them with comments, so that I can control expense reimbursements for my team in a consistent currency.

#### Acceptance Criteria

1. WHEN a Manager accesses the approval interface THEN the system SHALL display all expenses awaiting their approval
2. WHEN a Manager views an expense submitted in a foreign currency THEN the system SHALL fetch current exchange rates from https://api.exchangerate-api.com/v4/latest/{COMPANY_BASE_CURRENCY}
3. WHEN exchange rates are fetched THEN the system SHALL convert the expense amount to the company's base currency using the "rates" object from the API response
4. WHEN a Manager views an expense THEN the system SHALL display the amount converted to the company's default currency
5. WHEN a Manager views an expense THEN the system SHALL show the original amount and currency alongside the converted amount
6. WHEN a Manager approves an expense THEN the system SHALL store the converted amount with the expense record
7. WHEN a Manager approves an expense THEN the system SHALL allow adding optional comments
8. WHEN a Manager rejects an expense THEN the system SHALL require a comment explaining the rejection reason
9. WHEN a Manager takes an approval action THEN the system SHALL update the expense status immediately
10. WHEN a Manager views team expenses THEN the system SHALL display all expenses submitted by their direct reports with converted amounts

### Requirement 6: Required Approvers and Approval Completion Logic

**User Story:** As an Admin, I want to mark specific approvers as required and configure whether approvals happen sequentially or in parallel, so that I can ensure critical approvers review expenses while maintaining workflow flexibility.

#### Acceptance Criteria

1. WHEN an Admin configures approval workflows THEN the system SHALL allow marking specific managers as "Required Approvers" using checkmarks
2. WHEN a manager is marked as a required approver THEN the system SHALL ensure that manager's approval is mandatory for expense approval
3. WHEN all required approvers have approved an expense THEN the system SHALL mark the expense as Approved
4. WHEN "Approvers Sequence" is enabled and all required approvers approve in sequence THEN the system SHALL mark the expense as Approved
5. WHEN "Approvers Sequence" is disabled and all required approvers approve in parallel THEN the system SHALL mark the expense as Approved
6. WHEN any required approver rejects an expense THEN the system SHALL immediately mark the expense as Rejected regardless of other approvals
7. WHEN combining required approvers with "Is Manager Approver" setting THEN the system SHALL process manager approval first, then required approvers
8. WHEN an expense has multiple required approvers THEN the system SHALL track each approver's response status independently

### Requirement 7: Role-Based Permissions

**User Story:** As a system user, I want my access and capabilities to be restricted based on my assigned role, so that security and proper authorization are maintained.

#### Acceptance Criteria

1. WHEN a user has Admin role THEN the system SHALL allow creating companies, managing users, setting roles, configuring approval rules, viewing all expenses, and overriding approvals
2. WHEN a user has Manager role THEN the system SHALL allow approving/rejecting expenses, viewing team expenses, and escalating per rules
3. WHEN a user has Employee role THEN the system SHALL allow submitting expenses, viewing own expenses, and checking approval status
4. IF a user attempts to access functionality outside their role permissions THEN the system SHALL deny access and display an authorization error
5. WHEN a Manager views expense amounts THEN the system SHALL display amounts in the company's default currency
6. WHEN an Admin overrides an approval THEN the system SHALL log the override action with timestamp and reason

### Requirement 8: OCR Receipt Scanning

**User Story:** As an Employee, I want to scan receipts using OCR technology to auto-populate expense details, so that I can submit expenses quickly without manual data entry.

#### Acceptance Criteria

1. WHEN an Employee uploads a receipt image THEN the system SHALL process it using OCR technology
2. WHEN OCR processing completes THEN the system SHALL auto-populate fields including amount, date, description, expense type, and vendor name
3. WHEN OCR extracts expense lines THEN the system SHALL populate multiple line items if present on the receipt
4. WHEN OCR auto-populates fields THEN the system SHALL allow the Employee to review and edit the extracted data before submission
5. IF OCR fails to extract certain fields THEN the system SHALL leave those fields empty for manual entry
6. WHEN OCR detects a currency symbol THEN the system SHALL set the appropriate currency for the expense
7. IF OCR processing fails completely THEN the system SHALL allow manual expense entry as a fallback

### Requirement 9: Multi-Currency Support with Real-Time Conversion

**User Story:** As a user working with international expenses, I want the system to support multiple currencies with automatic conversion at approval time, so that all expenses can be viewed and approved in a consistent company currency.

#### Acceptance Criteria

1. WHEN the system initializes during signup THEN it SHALL fetch country and currency data from https://restcountries.com/v3.1/all?fields=name,currencies
2. WHEN a company is created THEN the system SHALL set a base currency code (e.g., "EUR", "USD") based on the selected country and currency choice
3. WHEN an Employee submits an expense in any currency THEN the system SHALL store the original amount and currency code without conversion
4. WHEN a Manager or Admin views an expense for approval THEN the system SHALL fetch current exchange rates from https://api.exchangerate-api.com/v4/latest/{COMPANY_BASE_CURRENCY}
5. WHEN exchange rates are fetched THEN the system SHALL use the "rates" object to convert the expense amount to the company's base currency
6. WHEN displaying expenses to Managers and Admins THEN the system SHALL show both the converted amount in company currency and the original amount with currency
7. WHEN a Manager approves an expense THEN the system SHALL store the converted amount alongside the original amount
8. WHEN exchange rates are fetched THEN the system SHALL cache them for a reasonable period (e.g., 1 hour) to minimize API calls
9. IF currency conversion API is unavailable THEN the system SHALL display an error and allow manual entry of conversion rate or retry
10. WHEN an expense is in the company's base currency THEN the system SHALL not perform conversion and display the amount as-is

### Requirement 10: Expense Status Tracking and History

**User Story:** As an Employee, I want to track the status of my submitted expenses and view their approval history, so that I know where my reimbursement requests stand.

#### Acceptance Criteria

1. WHEN an Employee views their expense list THEN the system SHALL display status indicators (Pending, Approved, Rejected)
2. WHEN an Employee clicks on an expense THEN the system SHALL show detailed approval history with timestamps
3. WHEN an expense is in approval workflow THEN the system SHALL indicate which approver currently has the request
4. WHEN an expense is rejected THEN the system SHALL display the rejector's comments
5. WHEN an expense is approved THEN the system SHALL display all approvers who approved and their comments
6. WHEN an expense moves through workflow stages THEN the system SHALL maintain a complete audit trail
7. WHEN an Admin overrides an approval THEN the system SHALL record this in the expense history

### Requirement 11: Automated Password Generation and Email Delivery

**User Story:** As an Admin creating a new user, I want the system to automatically generate a secure password and email it to the user, so that users can access the system immediately without manual password setup.

#### Acceptance Criteria

1. WHEN an Admin clicks the "Send Password" button during user creation THEN the system SHALL generate a random password
2. WHEN a password is generated THEN it SHALL meet minimum security requirements (minimum 8 characters, including uppercase, lowercase, numbers, and special characters)
3. WHEN a password is generated THEN the system SHALL send an email to the user's provided email address containing the password
4. WHEN the password email is sent THEN it SHALL include the user's login credentials and a link to the login page
5. WHEN a user receives their password email THEN they SHALL be able to log in immediately using the provided credentials
6. IF the email delivery fails THEN the system SHALL display an error message to the Admin and allow retry
7. WHEN a user logs in for the first time with the generated password THEN the system SHOULD prompt them to change their password (optional security enhancement)
8. WHEN an Admin creates a user without clicking "Send Password" THEN the system SHALL still create the user account but not send credentials via email

### Requirement 12: User Form State Management and Validation

**User Story:** As an Admin using the user creation form, I want the form to dynamically adjust based on the selected role, so that I only see relevant fields and the form remains consistent.

#### Acceptance Criteria

1. WHEN switching from "Employee" to "Manager" role in the user form THEN the system SHALL clear the isManagerApprover checkbox value to false
2. WHEN switching from "Manager" to "Employee" role in the user form THEN the system SHALL reset the isManagerApprover checkbox to its default unchecked state
3. WHEN the role changes in the user form THEN the system SHALL maintain all other form field values (firstName, lastName, email, password, managerId)
4. WHEN validation errors exist and the role changes THEN the system SHALL clear validation errors for fields that are no longer visible
5. WHEN editing an existing admin user THEN the system SHALL display "Admin" as the selected role in a disabled state
6. WHEN the selected role is "Manager" THEN the system SHALL hide the "Manager must approve expenses first" checkbox and its description text
7. WHEN the selected role is "Employee" THEN the system SHALL display the "Manager must approve expenses first" checkbox and its description text

