# 🏛️ BhumiAI — Digital Land Records Portal (Frontend Prototype)

> **National Digital Land Records & Spatial Indic AI Digitization Platform**  
> Built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**. Designed in accordance with official Indian Government public service digital aesthetics.

---

## 📌 Executive Summary

**BhumiAI** is a public-facing digital land records prototype designed to modernize and digitize physical land deeds, Record of Rights (RTC / Pahani registers), mutation extracts, and cadastral maps across Indian revenue jurisdictions. 

This repository contains the standalone **Frontend Prototype** equipped with:
- High-fidelity **Indian Government Public Service UI** (Warm Ivory `#FAF9F5`, Deep Navy `#12304A`, Primary Teal `#0F766E`, Verified Green `#059669`, Warning Saffron `#D97706`).
- **14 static and dynamic routes** covering Citizen Services, Document Digitization Wizards, RoR Title Certificates, Real-Time Tracking, Cryptographic Verification, and Active Learning queues.
- Centralized **Mock Data Architecture** (`src/lib/mock-data.ts`) and **Strict Domain Types** (`src/lib/types.ts`).
- Clean **API Abstraction Layer** (`src/lib/api.ts`) designed for seamless drop-in integration with FastAPI backend endpoints.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: [Next.js 14](https://nextjs.org/) (React Server & Client Components via App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: Google Fonts (*Plus Jakarta Sans*, *Inter*)

---

## 🧭 Application Route Catalog

| Route | Page Name | Description & Key Features |
| :--- | :--- | :--- |
| `/` | **Home / Citizen Portal** | Public landing page featuring the Hero section, Digital Title Record preview, 4 core service cards, 3-step guide, recent records list, and toll-free helpline. |
| `/search` | **Search Land Records** | Multi-tab query engine (*Survey Number*, *Property ID*, *Owner Name*) with State, District, Taluk, and Village dropdown filters and detailed search results. |
| `/search/[id]` | **Official Land Record (RoR/Pahani)** | Official Record of Rights certificate view with statutory seals, DigiLocker compliance badge, SHA-256 cryptographic signature, print, and PDF export. |
| `/digitize` | **Digitize Old Land Document** | Citizen document upload wizard with drag-and-drop, file type validation (PDF/Images up to 50MB), 4-stage progress stepper, and simulated OCR reading state. |
| `/digitize/review` | **Review Extracted Information** | 2-column citizen review screen: left document preview, right editable 8-field entity form with confidence scores, low-confidence warning alerts, statutory checks card, confirmation checkbox, draft saving, and instant digital certificate issue. |
| `/track` | **Track Application Request** | Application tracker queryable by Request ID or Mobile Number with real-time 5-stage timeline stepper and status badges. |
| `/verify` | **Verification & Validation** | Instant cryptographic hash & seal lookup desk with success verified title view and tampered/invalid alert state. |
| `/help` | **Help & Citizen Support** | Categorized FAQ accordion (*General*, *Digitization*, *Search*, *Verification*, *Legal*), interactive search bar, and toll-free citizen helpline (`1800-180-2024`). |
| `/dashboard` | **Records Registry** | Revenue officer records management dashboard with metric counters, status filters, search bar, and documents table. |
| `/documents/[id]` | **Document Details & OCR Explorer** | Multi-tab viewer with side-by-side original image preview, entity fields with bounding boxes, raw JSON, and active learning export. |
| `/review` | **Active Learning Review Queue** | Human-in-the-loop review queue for revenue inspectors to review low-confidence OCR predictions, select candidate transcriptions, and correct ground truth. |
| `/training` | **Model Registry & Retraining** | Model candidate evaluation registry showing Character Error Rate (CER), validation metrics, and promote/rollback actions. |

---

## 📦 Project Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root HTML shell with Navbar, Footer & Fonts
│   │   ├── page.tsx                # BhumiAI Home / Citizen Portal
│   │   ├── globals.css             # Tailwind base styles and color variables
│   │   ├── search/
│   │   │   ├── page.tsx            # Multi-criteria Land Record Search
│   │   │   └── [id]/page.tsx       # Official Record of Rights (RoR) Certificate
│   │   ├── digitize/
│   │   │   ├── page.tsx            # Digitize Document Wizard (Upload & OCR Reading)
│   │   │   └── review/page.tsx     # Review Extracted Information & Certificate Issue
│   │   ├── track/
│   │   │   └── page.tsx            # Citizen Application Tracking Stepper
│   │   ├── verify/
│   │   │   └── page.tsx            # Tamper-Proof Cryptographic Verification Desk
│   │   ├── help/
│   │   │   └── page.tsx            # Citizen FAQ & Support Desk
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Records Management Dashboard
│   │   ├── documents/[id]/
│   │   │   └── page.tsx            # Document Details & OCR Bounding Box Explorer
│   │   ├── upload/
│   │   │   └── page.tsx            # Upload & Extraction Processing Page
│   │   ├── review/
│   │   │   └── page.tsx            # Human-in-the-loop Active Learning Queue
│   │   └── training/
│   │       └── page.tsx            # Model Registry & Fine-Tuning Pipeline
│   ├── components/
│   │   ├── navbar.tsx              # Digital India utility strip, font scaler, language selector
│   │   ├── footer.tsx              # Deep navy government footer with helpline & DigiLocker badge
│   │   └── status-badge.tsx        # Institutional status badges
│   └── lib/
│       ├── api.ts                  # Typed API Client with FastAPI routes & mock fallback
│       ├── mock-data.ts            # Centralized Indian land records mock database
│       └── types.ts                # TypeScript domain interfaces
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 🔌 API Integration Guide for Teammates

All API communication is centralized in [`src/lib/api.ts`](./src/lib/api.ts). Each function includes explicit `// TODO:` markers indicating which backend FastAPI endpoint corresponds to each client action.

### Connecting to FastAPI Endpoints

| Frontend Function in `api.ts` | Target FastAPI Endpoint | Method | Purpose |
| :--- | :--- | :---: | :--- |
| `searchLandRecords(params)` | `/api/v1/land-records/search` | `GET` | Search land parcels by survey number, property ID, or owner name. |
| `fetchLandRecordById(id)` | `/api/v1/land-records/{id}` | `GET` | Fetch single official Record of Rights (RTC/Pahani) certificate. |
| `fetchExtractedLandFields(id)` | `/api/v1/digitize/{id}/fields` | `GET` | Retrieve OCR extracted key-value fields with confidence scores. |
| `trackApplicationStatus(id)` | `/api/v1/track/{request_id}` | `GET` | Fetch live 5-stage application processing status. |
| `verifyRecordSignature(hash)` | `/api/v1/verify` | `POST` | Check SHA-256 digital signature and seal authenticity. |
| `fetchDocuments(skip, limit)` | `/api/v1/documents/` | `GET` | Retrieve paginated documents from PostgreSQL. |
| `uploadDocumentFile(file)` | `/api/v1/documents/upload` | `POST` | Stream multipart file to MinIO and trigger Celery OCR worker. |
| `fetchReviewQueue()` | `/api/v1/review/queue` | `GET` | Load pending low-confidence OCR predictions for review. |
| `submitReviewDecision(id, d)` | `/api/v1/review/{id}/decision` | `POST` | Submit revenue officer correction to active learning dataset. |

> **Graceful Fallback Mode**: If the FastAPI backend is offline during development, the frontend automatically falls back to high-fidelity mock data from `src/lib/mock-data.ts` without throwing unhandled exceptions.

---

## ⚡ Setup & Local Development

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **npm** or **pnpm** / **yarn**

### 2. Installation
```bash
# Navigate to frontend directory
cd frontend

# Install all dependencies
npm install
```

### 3. Environment Configuration
Create or edit `.env.local` in the `frontend` folder:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
```
Verify that the production build completes with 0 errors and generates all 14 static and dynamic routes.

---

## 🧪 Build & Verification Summary

The frontend prototype has been verified with `npm run build`:
```text
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (14/14)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    6.4 kB         93.6 kB
├ ○ /dashboard                           3.8 kB         91.0 kB
├ ○ /digitize                            4.2 kB         91.4 kB
├ ○ /digitize/review                     6.8 kB         94.0 kB
├ λ /documents/[id]                      8.2 kB         95.4 kB
├ ○ /help                                4.1 kB         91.3 kB
├ ○ /review                              5.6 kB         92.8 kB
├ ○ /search                              4.9 kB         92.1 kB
├ λ /search/[id]                         5.4 kB         92.6 kB
├ ○ /track                               4.5 kB         91.7 kB
├ ○ /training                            6.1 kB         93.3 kB
├ ○ /upload                              4.2 kB         91.4 kB
└ ○ /verify                              4.6 kB         91.8 kB
+ First Load JS shared by all            87.2 kB
```

---

## 📜 Design Guidelines & Color Palette

| Token | Hex Value | Application |
| :--- | :--- | :--- |
| **Warm Ivory** | `#FAF9F5` | Background canvas, soft card containers, subtle borders |
| **Deep Navy** | `#12304A` | Main headers, government utility banner, institutional typography |
| **Primary Teal** | `#0F766E` | Primary action buttons, active navigation indicators, key highlights |
| **Verified Green** | `#059669` | High confidence badges, statutory verification seals, completed steps |
| **Warning Saffron** | `#D97706` | Low-confidence OCR alerts, pending review status badges |
| **Border Slate** | `#E2E8F0` / `#CBD5E1` | Card dividers, input outlines, table cell borders |

---

## 🚀 Git Deployment Commands

To commit and push the frontend prototype changes to your GitHub repository, run the following commands in your terminal:

```bash
# Check status of modified and new files
git status

# Stage frontend files
git add frontend/

# Commit with a descriptive message
git commit -m "feat(frontend): build BhumiAI digital land records portal prototype"

# Push to your remote repository branch
git push origin <your-branch-name>
```
