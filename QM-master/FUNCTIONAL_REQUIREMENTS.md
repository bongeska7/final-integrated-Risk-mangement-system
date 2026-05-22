# Functional Requirements (FR) Specification
## Risk Management & Incident Tracking System

This document outlines the detailed **Functional Requirements (FR)** of the application, detailing the features, workflows, validation rules, and business logic.

---

## 1. User Identity & Access Management (IAM)

### FR-1.1: Authentication & Session Control
* The system **shall** authenticate users using JWT (JSON Web Tokens).
* The system **shall** support token refreshing via refresh tokens with an expiration window (default 7 days).
* The system **shall** restrict endpoint access using Role-Based Access Control (RBAC).

### FR-1.2: Dynamic Hierarchy & Subordinates
* The system **shall** enforce a hierarchical structure:
  * Initiators **shall** report to a designated Manager (`ManagerId`).
  * Managers **shall** report to other Managers or Admins.
* User profiles **shall** contain a unique 6-digit Employee ID.

### FR-1.3: Duplicate Username Flexibility
* The system **shall** allow non-unique usernames to support flexible logins, provided that other specific validation criteria (e.g., uniqueness of email or custom rules) are met.

### FR-1.4: Admin User Curation
* Admins **shall** have the ability to:
  * Create new users with designated roles, passwords, and reporting managers.
  * Update user roles and manager assignments.
  * Delete users.

---

## 2. Risk Management & Catalog Curation

### FR-2.1: Logging Risk Suggestions
* Initiators and Managers **shall** be able to suggest new risks.
* Submissions **shall** include: Risk Name, Description, Location, Likelihood level (1-5), Impact level (1-5), Category, Department, and Responsible Owner.
* New submissions by non-admins **shall** default to `Custom = true` (indicating it is a suggestion, not a catalog item).

### FR-2.2: Mapping Mitigation Measures
* Users **shall** be able to link risks with:
  * **Mitigating Actions**: Avoidance or Reduction strategies.
  * **Root Causes**: Specific conditions triggering the risk.
  * **Strategic Goals**: High-level organizational goals impacted.
* If a suggested Action or Cause does not exist in the master library, the system **shall** create a new custom definition (`Custom = true`).

### FR-2.3: Admin Curation & Library Approvals
* Admins **shall** review suggested risks, actions, and causes.
* When an Admin approves (`Status = Accepted`) a suggestion:
  * The system **shall** convert the item to a library catalog item (`Custom = false`).
  * The item **shall** become visible in dropdown menus for all users when logging future records.

---

## 3. Incident Request & Workflow Processing

### FR-3.1: Incident Logging
* Users **shall** be able to report incidents (Requests) that occur.
* Incident logs **shall** record: Description, Associated Risk ID, Pre-Incident Likelihood/Impact, Post-Incident Likelihood/Impact, expected resolution times, and occurrence confirmation.

### FR-3.2: Status Workflow Transitions
* The system **shall** transition requests through the following states:
  1. **In Progress**: Default starting state for new submissions.
  2. **Under Review**: State set when a Manager forwards a request to the Admin queue (`ReDirected = true`).
  3. **Accepted**: Set when an Admin approves the incident report.
  4. **Rejected**: Set when an Admin rejects the report.
* On rejection, the Admin **shall** provide a mandatory rejection reason (`rejectReason`).

### FR-3.3: Data Visibility Scoping
* The system **shall** filter list queries based on role clearance:
  * **Initiators** can only view records they created.
  * **Managers** can view their own records plus those of their direct reports.
  * **Admins** can only view records explicitly forwarded by managers (`ReDirected = true`).

---

## 4. Notifications & Alerts

### FR-4.1: Automated Notifications
* The system **shall** trigger database notification logs when:
  * A new risk or incident is logged by an Initiator.
  * A request is forwarded by a Manager (`underReview`).
  * A request is approved (`Accepted`) or rejected (`Rejected`) by an Admin.
* Notifications **shall** target the creator of the request (for updates/approvals) or all Admins (for incoming reviews).

---

## 5. Automated Audit Logs

### FR-5.1: Transaction Auditing
* The system **shall** intercept database saves and automatically log changes.
* Every logged audit entry **shall** capture:
  * The Table name and Action Type (Create, Update, Delete).
  * Pre-change values (`OldValues`) and post-change values (`NewValues`) formatted as JSON.
  * The ID of the user performing the change.
* Admins **shall** be able to search and filter all system audit logs.
* Non-admins **shall** be able to view their own personal activity logs.
