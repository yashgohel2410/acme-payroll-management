# ACME Payroll Management — Product Requirements Document

**Primary user:** HR Manager  
**Tech stack:** React + TypeScript · Node.js + Express + TypeScript · SQLite · Prisma ORM

## 1. Objective

Replace Excel-based salary tracking with a centralized web application that stores employee compensation data and delivers actionable insights for an organization of 10,000+ employees across multiple countries.

## 2. Problem

Spreadsheet-based salary management does not scale. With 10,000+ employees, Excel files become slow, error-prone, and difficult to version or share safely. Concurrent edits cause conflicts; multi-currency amounts lack consistent structure; historical revisions are hard to audit; and filtering by country, department, or designation is manual and unreliable. Leadership lacks a single source of truth for compensation KPIs and trends.

## 3. Core Features

- **HR dashboard & salary KPIs:** Summary metrics (headcount, average/total compensation views) for quick oversight.
- **Employee CRUD:** Create, read, update, and deactivate/delete employee records.
- **Employee profiles:** Core identity and organizational attributes (name, country, department, designation, and related fields).
- **Salary records & revision history:** Current salary with ISO currency code; append-only or versioned history of salary changes.
- **Filters:** Country, department, and designation.
- **Multi-currency support:** Persist amounts with ISO currency codes; no automatic conversion in v1.
- **Compensation analytics:** Aggregations and breakdowns useful to an HR Manager (e.g., by country/department).
- **Search, sorting, pagination:** Efficient browsing of large employee sets.
- **CSV export:** Export filtered or full result sets for offline review.

## 4. Non-Functional Requirements

- **Scalability:** UI and API must remain usable with 10,000+ employee records.
- **Security considerations:** Protect sensitive compensation data in transit/at rest as feasible; authentication is a future requirement, not in scope for the initial release.
- **Validation:** Enforce required fields, numeric salary rules, and valid ISO currency codes.
- **Responsive UI:** Usable on desktop and common tablet/mobile viewports.
- **Database performance:** Indexed queries, pagination at the data layer, and Prisma/SQLite patterns that avoid full-table scans for list views.
- **Maintainability & testability:** Clear module boundaries, typed contracts between client and server, and automated tests for critical API and domain logic.

## 5. Scope Exclusions

Excluded from the initial release:

- **Payroll processing** — Disbursement runs and pay-cycle workflows are out of scope; this product focuses on compensation records and insights.
- **Tax calculations** — Jurisdiction-specific tax rules vary widely and require dedicated compliance tooling.
- **Bank integrations** — Payment rails and ACH/wire connectivity are deferred until core data management is proven.
- **Advanced role management** — Initial release assumes a single HR Manager persona; multi-role RBAC comes later with authentication.

## 6. Acceptance Criteria

| Area | Measurable outcome |
|------|--------------------|
| Employee management | HR Manager can create, view, update, and remove employee records; profiles show required organizational fields. |
| Salary updates | Salary changes persist with ISO currency code and appear in revision history. |
| Filtering | Country, department, and designation filters return correct subsets; combined filters work as expected. |
| Analytics | Dashboard KPIs and compensation analytics reflect current data after CRUD operations. |
| Scale (10,000+) | List views support search, sort, and pagination without client-side loading of the full dataset; CSV export completes for large result sets within acceptable interactive time. |

## Assumptions

- One HR Manager persona for the initial release.
- Salary amounts are stored with their ISO currency codes.
- Currency conversion is not included unless explicitly implemented later.
- Authentication is a future security requirement, not an implemented feature.
