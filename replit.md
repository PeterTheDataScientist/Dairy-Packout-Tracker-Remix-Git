# YoMilk - Production & Packout Tracking System

## Overview

YoMilk is a web application designed for dairy businesses to track their production and packout processes. It aims to replace manual, spreadsheet-based tracking with a robust database-backed system. The application covers the entire production lifecycle from milk intake and supplier management to production batches (conversions and blends) and finished goods packout.

Key capabilities include:
- Configurable products and dynamic, formula-driven yield calculations.
- Immutable audit trails and a change request workflow for post-save edits requiring admin approval.
- Role-based access control (Admin, Data Entry).
- Comprehensive reporting on loss breakdowns, running stock, daily allocation, mass balance, and yield trends.
- Automated notifications for critical events like threshold breaches and carry-forward requests.

The project's vision is to provide a reliable, efficient, and transparent system for managing dairy production, improving data integrity, and enabling better decision-making through accurate reporting and real-time insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design Principles
The system is built as a full-stack web application with a clear separation between frontend and backend. It emphasizes data integrity, auditability, and a user-friendly interface. A strict sequential workflow (Intake → Production → Packout) is enforced to maintain data consistency.

### Frontend
- **Framework:** React 18 with TypeScript, using Vite for bundling.
- **Routing:** Wouter.
- **State Management & Data Fetching:** TanStack React Query.
- **UI Components:** shadcn/ui (New York style) built on Radix UI primitives and styled with Tailwind CSS v4.
- **Charting:** Recharts for data visualization in reports.
- **Authentication:** Custom React context for session-based authentication.
- **Key Features:** User-friendly interfaces for all stages of production, administrative tools for product, formula, and user management, and detailed reporting dashboards.

### Backend
- **Runtime:** Node.js with TypeScript.
- **Framework:** Express.js for RESTful JSON API.
- **Authentication & Authorization:** Passport.js with Local Strategy for session management, bcryptjs for password hashing. Role-based access control (ADMIN, DATA_ENTRY) implemented via Express middleware.
- **Storage Layer:** Drizzle ORM for PostgreSQL interaction, enforcing a structured data schema.
- **API Structure:** RESTful API under `/api/` prefix, with routes defined in `server/routes.ts`.

### Data Layer
- **Database:** PostgreSQL is the primary data store, used for both application data and session storage.
- **ORM:** Drizzle ORM with `drizzle-zod` for schema definition and validation.
- **Schema:** Defined in `shared/schema.ts`, including tables for users, suppliers, products, formulas, daily intakes, production batches, packouts, audit events, and change requests.
- **Migrations:** Managed with Drizzle Kit.

### Key System Features
- **Formula Engine:** Supports two configurable formula types: CONVERSION (one-to-one product transformation with ratio) and BLEND (combining multiple components by fraction). Drives yield calculations.
- **Loss Breakdown System:** Tracks four categories of losses: Receiving, Filling/Process, Draining, and Packing/Mixing, with detailed reporting.
- **Running Stock Report:** Monitors daily stock levels for Raw Milk and Yogurt Base, including data gap detection.
- **Daily Allocation Report:** Visualizes raw milk distribution across product categories.
- **Production Data Integrity:** Auto-fills input quantities based on formulas, tracks `inputQtyAutoFilled` flag, and detects data gaps.
- **Pack Size Tracking:** Handles product pack sizes for accurate unit conversions.
- **Workflow Enforcement:** Ensures sequential data entry (Intake → Production → Packout) with daily lock mechanisms.
- **Remaining Raw Milk & Carry-Forward:** Tracks remaining raw milk after batches and facilitates an admin-approved carry-forward workflow.
- **Loss Thresholds & Notifications:** Configurable thresholds for yield variances, triggering admin notifications.
- **Audit Log & Change Requests:** Immutable audit trail for all data modifications and an approval workflow for post-save edits.
- **Reporting:** Includes Dashboard KPIs, Mass Balance Reconciliation, Daily Summary, Supplier Scorecard, and Yield Trends.
- **User Management:** Admin-controlled user creation, role assignment, and password management.
- **Extensible Units:** Admin can define custom units of measure.

## External Dependencies

### Database
- **PostgreSQL:** The core relational database used for all application data and session storage. Connection string is configured via the `DATABASE_URL` environment variable.

### Key NPM Packages
- **drizzle-orm** & **drizzle-kit:** For ORM capabilities and database schema management.
- **express** & **express-session:** For building the backend API and managing user sessions.
- **passport** & **passport-local:** For user authentication.
- **bcryptjs:** For secure password hashing.
- **connect-pg-simple:** PostgreSQL store for Express sessions.
- **@tanstack/react-query:** For efficient server state management on the client-side.
- **recharts:** For rendering interactive charts in reports.
- **wouter:** A lightweight client-side router for React.
- **zod** & **drizzle-zod:** For schema validation.
- **shadcn/ui (Radix UI primitives):** Provides a comprehensive set of accessible UI components.

### Environment Variables
- `DATABASE_URL`: Essential for connecting to the PostgreSQL database.
- `SESSION_SECRET`: Used for encrypting session data.