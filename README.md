## 📸 Application Preview

NazMart provides a modern and intuitive Point of Sale (POS) interface designed for retail businesses. The application enables fast barcode scanning, efficient billing, inventory-friendly workflows, recent bill management, and seamless receipt printing through a clean and responsive user interface.

| Billing Dashboard | Recent Bills |
| ----------------- | ------------ |
| ![Billing Dashboard](assets/screenshots/billing-dashboard.png) | ![Recent Bills](assets/screenshots/recent-bills.png) |

| Billing Workflow | Printer Settings |
| ---------------- | ---------------- |
| ![Billing Workflow](assets/screenshots/billing-workflow.png) | ![Printer Settings](assets/screenshots/printer-settings.png) |

---

# ✨ Features

## 🛒 Smart Billing
- Fast barcode-based product scanning
- Manual product creation during billing
- Automatic quantity management
- Real-time subtotal and grand total calculation
- Percentage-based discount support

---

## 📦 Inventory Management
- Barcode product lookup
- Create new products instantly
- Update existing products
- Inventory-friendly product structure

---

## 🧾 Bill Management
- View recent transactions
- Edit previously created bills
- Reprint receipts anytime
- Search bills by Bill ID or Cashier

---

## 🖨️ Printing
- Browser printing support
- Bluetooth thermal printer support
- ESC/POS compatible printing
- Receipt preview before printing

---

## 📱 Modern Experience
- Progressive Web App (PWA)
- Responsive desktop interface
- Mobile-ready with Capacitor
- Fast and lightweight React application

---

## 🔒 Reliability
- Production-ready architecture
- Modular component structure
- Centralized API layer
- Shared utilities and reusable hooks
- Clean separation of business logic

---

# 🏗️ Frontend Architecture

NazMart follows a modular and scalable React architecture that separates UI components, business logic, API communication, and shared utilities. This structure keeps the codebase maintainable, reusable, and easy to extend.

```text
                           User
                             │
                             ▼
                    React Application
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
      Pages              Components            Services
        │                    │                    │
        ▼                    ▼                    ▼
     Custom Hooks ─────► Shared Utilities ◄──── API Layer
                             │
                             ▼
                    Express.js REST API
                             │
                             ▼
                      PostgreSQL Database
```

### Architecture Overview

- **Pages** handle application-level screens and route composition.
- **Components** provide reusable UI elements across the application.
- **Custom Hooks** encapsulate business logic and state management.
- **Services** manage printing and external integrations.
- **API Layer** centralizes all backend communication through reusable modules.
- **Shared Utilities** provide common helpers, calculations, formatting, and constants.
- **Backend** exposes REST APIs built with Express.js.
- **Database** persists products and billing data using PostgreSQL.