# Requirements Document

## Introduction

This feature enhances the user management system by implementing proper role-based restrictions for user creation and form behavior. The system currently allows unrestricted user creation, but business rules require that only one admin exists per company, managers cannot submit expenses (so manager approval settings are irrelevant for them), and only admins can create users and managers. These changes ensure proper organizational hierarchy and prevent unauthorized user creation.

## Requirements

### Requirement 1: Single Admin Restriction

**User Story:** As a system administrator, I want to ensure only one admin exists per company, so that administrative control remains centralized and secure.

#### Acceptance Criteria

1. WHEN an admin user opens the user creation form THEN the system SHALL NOT display "Admin" as a selectable role option in the role dropdown
2. WHEN viewing the role dropdown during user creation THEN the system SHALL only display "Employee" and "Manager" as available options
3. WHEN editing an existing admin user THEN the system SHALL allow the admin role to remain but SHALL NOT allow changing to admin role for non-admin users
4. IF the user being edited is already an admin THEN the system SHALL display "Admin" as the selected role in a disabled state

### Requirement 2: Manager Approval Checkbox Visibility

**User Story:** As an admin creating a manager, I want the "Manager must approve expenses first" checkbox to be hidden, so that the form only shows relevant options since managers cannot submit expenses.

#### Acceptance Criteria

1. WHEN the selected role is "Manager" THEN the system SHALL hide the "Manager must approve expenses first" checkbox and its description text
2. WHEN the selected role is "Employee" THEN the system SHALL display the "Manager must approve expenses first" checkbox and its description text
3. WHEN the selected role is "Admin" THEN the system SHALL hide the "Manager must approve expenses first" checkbox and its description text
4. WHEN switching between roles in the form THEN the system SHALL dynamically show or hide the checkbox based on the selected role
5. WHEN creating or editing a manager user THEN the system SHALL set isManagerApprover to false by default

### Requirement 3: Admin-Only User Creation Access

**User Story:** As a system owner, I want only admin users to create new users and managers, so that user provisioning is controlled and follows proper authorization.

#### Acceptance Criteria

1. WHEN a non-admin user attempts to access the user creation functionality THEN the system SHALL prevent access to the create user form
2. WHEN a non-admin user views the user management page THEN the system SHALL hide or disable the "Create User" button
3. WHEN an admin user views the user management page THEN the system SHALL display an enabled "Create User" button
4. WHEN an admin user clicks "Create User" THEN the system SHALL open the user creation form with appropriate role options
5. IF a non-admin user somehow accesses the user creation endpoint THEN the backend SHALL return a 403 Forbidden error

### Requirement 4: Form State Management

**User Story:** As an admin user, I want the form to properly manage state when switching between roles, so that irrelevant fields are cleared and the form remains consistent.

#### Acceptance Criteria

1. WHEN switching from "Employee" to "Manager" role THEN the system SHALL clear the isManagerApprover checkbox value to false
2. WHEN switching from "Manager" to "Employee" role THEN the system SHALL reset the isManagerApprover checkbox to its default unchecked state
3. WHEN the role changes THEN the system SHALL maintain all other form field values (firstName, lastName, email, password, managerId)
4. WHEN validation errors exist and the role changes THEN the system SHALL clear validation errors for fields that are no longer visible
