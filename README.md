# 🚚 Smart Logistics Platform (SLP) — Enterprise Logistics & AI Routing Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)](https://socket.io/)

A production-grade, distributed logistics management platform designed with **Clean Architecture** and **Domain-Driven Design (DDD)** principles. The system orchestrates end-to-end supply chain operations, featuring multi-echelon warehouse network routing, AI-powered Capacitated Vehicle Routing Problem (CVRP) optimization, low-latency GPS telemetry streaming, and tamper-resistant digital Proof of Delivery (POD).

---

## 📌 Table of Contents

1. [Architectural Overview](#-architectural-overview)
2. [Key Engineering Highlights](#-key-engineering-highlights)
3. [Database Architecture & Domain Modules](#-database-architecture--domain-modules)
4. [System Architecture Diagram](#-system-architecture-diagram)
5. [End-to-End Fulfillment Lifecycle](#-end-to-end-fulfillment-lifecycle)
6. [Technology Stack](#-technology-stack)
7. [Repository Structure](#-repository-structure)
8. [Getting Started & Local Development](#-getting-started--local-development)
9. [API Surface & Postman Collection](#-api-surface--postman-collection)
10. [Engineering Standards & Best Practices](#-engineering-standards--best-practices)

---

## 🏛️ Architectural Overview

Smart Logistics Platform is built as a highly modular, decoupled backend service engineered to handle mission-critical logistics pipelines:

* **Layered Clean Architecture**: Separation of concerns across Controller, DTO Validation, Service/Domain Logic, and Data Access Layers.
* **Separation of PII (Defense-in-Depth Security)**: User authentication credentials (`users`) are decoupled from Personally Identifiable Information (PII) profiles (`customers`, `staff`), preventing unauthorized data exposure and enabling 1-query bulk lookups without joins.
* **In-Memory Telemetry Pipeline**: High-frequency driver GPS coordinates are ingested via WebSockets, buffered and geo-indexed in Redis In-Memory hashes, and asynchronously persisted to PostgreSQL in batches to prevent database write saturation.
* **Algorithmic Routing Solver**: Multi-stop route generation utilizing K-Means Spatial Clustering, Hungarian Bipartite Matching for driver affinity, and Genetic Algorithms for vehicle routing optimization under capacity and time-window constraints.
* **Strict State Transition Safety**: Stateful finite state machines (FSM) managing order and shipment transitions with audit logging (`order_status_history`, `route_adjustment_logs`, `tracking_events`).

---

## ⚙️ Key Engineering Highlights

### 1. High-Concurrency Telemetry & Real-Time Geospatial Indexing
* **Telemetry Decoupling**: Drivers stream GPS coordinates every 5 seconds. The backend writes directly to Redis geospatial structures (`GEOADD`, `HSET`), providing sub-millisecond retrieval for dispatchers and real-time live map tracking via Socket.io rooms.
* **Geospatial Processing**: PostGIS and Goong/MapLibre APIs calculate accurate road-network distances, ETA projections, and bounding boxes for spatial queries.

### 2. Algorithmic Optimization & Heuristic VRP Engine
* **K-Means Spatial Clustering**: Partitions large sets of delivery packages into geographically dense clusters based on origin and destination coordinates.
* **Capacitated VRP Solver**: Solves vehicle-load constraints (volume $m^3$, weight $kg$, vehicle temperature specifications) to produce optimized route sequences (`route_stops`).
* **Dynamic Route Intervention**: Supports mid-trip driver reassignment, stop sequence modification, and automated exception triggers with comprehensive audit trail logging (`route_adjustment_logs`).

### 3. Supply Chain State Machine & Inter-Hub Handshakes
* **Strict Package Isolation**: Unique constraint enforcement (`package_id UNIQUE` on `shipment_packages`) guarantees a package cannot be simultaneously assigned to multiple active transit shipments.
* **Inter-Hub Custody Transfers**: Multi-party confirmation workflows for inter-facility transfers (`shipment_transfers`) with dispatch timestamps, arrival verification, and warehouse scan audits (`warehouse_scans`, `tote_bags`).
* **Digital Proof of Delivery (POD)**: Multi-factor delivery verification supporting geofenced GPS coordinate validation, image proof attachments, digital recipient confirmation, and on-site Cash-on-Delivery (`actual_cod_collected`) financial reconciliation.

---

## 🗄️ Database Architecture & Domain Modules

The database schema is structured into **10 core domain modules** comprising **38 normalized tables** in PostgreSQL via Prisma ORM:

```mermaid
graph LR
    subgraph Core["Core & Identity"]
        M1["Module 1: Auth & RBAC<br/>(users, roles, permissions)"]
        M2["Module 2: Customers & Addresses<br/>(customers, addresses, customer_addresses)"]
    end
    
    subgraph Network["Logistics Network"]
        M3["Module 3: Facility Network<br/>(facilities, facility_types, facility_zones)"]
        M6["Module 6: Fleet & Resource<br/>(staff, vehicles, driver_assignments, driver_locations)"]
        M10["Module 10: Administrative Units<br/>(regions, units, provinces, wards)"]
    end

    subgraph Operations["Execution & Routing"]
        M4["Module 4: Orders & Packages<br/>(orders, packages, order_payments, history)"]
        M5["Module 5: Shipments & Transfers<br/>(shipments, shipment_packages, transfers)"]
        M7["Module 7: Routing & AI Engine<br/>(routes, route_stops, dispatch_tasks, optimizations)"]
        M8["Module 8: Tracking & POD<br/>(tracking_events, warehouse_scans, tote_bags, proofs)"]
        M9["Module 9: System Configuration<br/>(system_settings)"]
    end

    M1 --> M2
    M2 --> M4
    M3 --> M4
    M4 --> M5
    M5 --> M7
    M6 --> M7
    M7 --> M8
```

| Module | Purpose | Key Models (`schema.prisma`) |
| :--- | :--- | :--- |
| **Module 1: Auth & RBAC** | Identity authentication & fine-grained role-based permissions | `User`, `Role`, `Permission`, `RolePermission` |
| **Module 2: Customers & Addresses** | B2B/B2C profiles & normalized master address registry | `Customer`, `Address`, `CustomerAddress` |
| **Module 3: Facility Network** | Hierarchical warehouse tree & functional warehouse zones | `Facility`, `FacilityType`, `FacilityZone` |
| **Module 4: Orders & Services** | Order lifecycle snapshots, package metrics & financial auditing | `Order`, `Package`, `Service`, `OrderPayment`, `OrderStatusHistory` |
| **Module 5: Shipment Management** | Inter-facility transfer lots & strict package-to-shipment batches | `Shipment`, `ShipmentPackage`, `ShipmentTransfer` |
| **Module 6: Fleet & Drivers** | Fleet management, driver vehicle assignments & live telemetry | `Staff`, `StaffDriverType`, `Vehicle`, `VehicleType`, `DriverVehicleAssignment`, `DriverLocation` |
| **Module 7: Routing & AI Engine** | AI-optimized routes, stop sequencing, dispatching & audit logs | `Route`, `RouteStop`, `DispatchTask`, `RouteOptimization`, `RouteAdjustmentLog` |
| **Module 8: Tracking, Scan & POD** | Event timelines, warehouse barcode scans, tote containers & POD | `TrackingEvent`, `WarehouseScan`, `ToteBag`, `DeliveryProof` |
| **Module 9: System Configuration** | Dynamic runtime parameters (AI hyperparameters, GPS intervals) | `SystemSetting` |
| **Module 10: Administrative Units** | Standardized 2-tier national administrative divisions | `AdministrativeRegion`, `AdministrativeUnit`, `Province`, `Ward` |

---

## 📐 System Architecture Diagram

```mermaid
flowchart TD
    ClientWeb["Web Admin / Dispatch Portal (React + Vite)"]
    ClientMobile["Driver / Customer App (Flutter)"]
    
    subgraph GatewayLayer["API & Ingestion Layer"]
        APIGateway["Express.js HTTP Gateway (Port 3000)"]
        WSServer["WebSocket / Socket.io Real-time Hub"]
    end

    subgraph ServiceLayer["Core Backend Business Services"]
        AuthSvc["Auth & RBAC Service"]
        OrderSvc["Order Fulfillment Service"]
        ShipmentSvc["Shipment & Transfer Service"]
        RoutingSvc["Routing & Dispatch Service"]
        TrackingSvc["Tracking & Telemetry Service"]
        FacilitySvc["Facility & Inventory Service"]
    end

    subgraph AsyncPipeline["Asynchronous & Optimization Engine"]
        RedisCache["Redis 7 (In-Memory Cache & Geospatial Index)"]
        RabbitMQ["RabbitMQ Message Broker"]
        AIOptimizer["AI Service / OR-Tools VRP Solver"]
    end

    subgraph PersistenceLayer["Data Persistence"]
        PrismaORM["Prisma ORM Client"]
        PostgreSQL[("PostgreSQL 15 + PostGIS Database")]
    end

    ClientWeb -->|REST API| APIGateway
    ClientMobile -->|REST API| APIGateway
    ClientMobile -->|High-frequency GPS Ping| WSServer
    
    APIGateway --> ServiceLayer
    WSServer --> TrackingSvc
    
    TrackingSvc -->|Real-time Cache & GEOADD| RedisCache
    ServiceLayer -->|Async Event Publishing| RabbitMQ
    RabbitMQ --> AIOptimizer
    AIOptimizer -->|Optimized Routes| RoutingSvc

    ServiceLayer --> PrismaORM
    PrismaORM --> PostgreSQL
```

---

## 🔄 End-to-End Fulfillment Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Shop
    actor ShipperPickup as Pickup Driver
    participant Backend as Backend Core Service
    participant AI as AI Routing Engine
    participant Hub as Origin Facility / Hub
    actor ShipperDelivery as Delivery Driver
    actor Recipient as End Recipient

    Customer ->> Backend: 1. Place Order (ORD-xxx, Pickup & Delivery details)
    Backend ->> AI: 2. Request Optimal Pickup Route & Stop Sequence
    AI -->> Backend: Return Optimized Route (RouteStops, Sequences, ETAs)
    Backend ->> ShipperPickup: 3. Dispatch Pickup Task via Mobile App
    ShipperPickup ->> Customer: Arrive & Scan Barcode on Package (PKG-xxx)
    ShipperPickup ->> Hub: 4. Inbound Handover & Scan at Origin Facility
    Hub ->> Backend: Facility Sorting & Aggregate into Shipment Batch (SHP-xxx)
    Backend ->> Backend: Inter-Hub Linehaul Transfer (ShipmentTransfer)
    Backend ->> ShipperDelivery: 5. Assign Last-Mile Delivery Route
    ShipperDelivery ->> Recipient: 6. Handover Package, Collect COD & Upload POD Proof
    ShipperDelivery ->> Backend: 7. Submit DeliveryProof (Photo, Signature, Verified GPS, COD)
    Backend ->> Customer: 8. Broadcast DELIVERED status & Reconcile COD
```

---

## 🛠️ Technology Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v20+ LTS), TypeScript 5.x | Strongly typed business logic, asynchronous non-blocking I/O |
| **Framework & API** | Express.js, `class-validator`, `class-transformer` | Layered architecture, declarative DTO validation, centralized error handling |
| **Relational Database** | PostgreSQL 15 | 38 normalized 3NF tables, transactional integrity, foreign key cascades |
| **ORM & Migrations** | Prisma ORM 5.x | Declarative schema mapping, type-safe query building, automated database seeders |
| **Caching & In-Memory** | Redis 7 | Sub-millisecond GPS caching, geospatial indexing (`GEOADD`/`GEORADIUS`), rate limiting |
| **Real-time Streaming** | Socket.io 4.x | Bidirectional telemetry streaming, room-based broadcast for live tracking |
| **Message Broker** | RabbitMQ / Redis PubSub | Asynchronous task decoupling for compute-heavy AI optimization |
| **Optimization Solver** | Python / OR-Tools / TypeScript Heuristics | Capacitated VRP Solver, K-Means Clustering, Genetic Algorithm |
| **Geospatial & Maps** | Goong Maps API / MapLibre GL / PostGIS | Reverse geocoding, distance matrix calculation, route polyline geometry |
| **Containerization** | Docker, Docker Compose | Multi-container environment orchestration for database and cache services |

---

## 📂 Repository Structure

```text
smart-logistics-platform/
├── backend/                         # Core Backend API Service (TypeScript + Express)
│   ├── prisma/
│   │   ├── migrations/              # Automated database migration history
│   │   ├── schema.prisma            # Comprehensive 38-table Prisma Schema
│   │   └── seed.ts                  # Production-ready Master & Lookup Data Seeder
│   ├── src/
│   │   ├── config/                  # Environment & connection configurations (DB, Redis, Logger)
│   │   ├── constants/               # System enums, error codes, and business constants
│   │   ├── controllers/             # HTTP Route handlers & Request/Response coordination
│   │   ├── dtos/                    # Input Data Transfer Objects with validation rules
│   │   ├── gateways/                # Socket.io Real-time Telemetry gateways
│   │   ├── middlewares/             # Auth JWT, RBAC guards, rate-limiters, global error handler
│   │   ├── routes/                  # Express REST API route definitions
│   │   ├── services/                # Core business logic (Order, Shipment, Routing, Pricing)
│   │   ├── utils/                   # Coordinate projection, math utilities, response formatters
│   │   ├── workers/                 # Background task workers & queue processors
│   │   └── index.ts                 # Server entrypoint (HTTP + Socket.io Server)
│   ├── package.json
│   └── tsconfig.json
├── ai-service/                      # AI Routing & VRP Optimization Service
├── frontend/                        # Web Operations & Dispatch Portal (React + Vite + TailwindCSS)
├── mobile/                          # Driver & Field Execution Mobile App (Flutter)
├── Design DB/                       # Formal Database Design & Data Dictionary Documentation
│   ├── database_dictionary.md       # Complete 38-table Data Dictionary
│   ├── STATUS_ENUMS_EXPLANATION.md  # Detailed documentation of all 28 System Enums
│   ├── DATABASE_DESIGN_RULES.md     # 3NF normalization & PII separation rules
│   ├── erd_diagram.mmd              # Mermaid Entity-Relationship Diagram
│   └── module 1..10 database.md     # Module-by-module technical specification files
├── docker-compose.yml               # Container orchestration (PostgreSQL 15, Redis 7)
├── development_standards.md         # Engineering & code quality standards
└── README.md                        # Primary project documentation
```

---

## 🚀 Getting Started & Local Development

### Prerequisites

Ensure the following tools are installed on your workstation:
* **Docker Desktop** (Engine 24.x+)
* **Node.js** (`>= 18.x` or `>= 20.x LTS`) & **npm** (`>= 9.x`)

---

### Step 1: Spin Up Infrastructure Containers (PostgreSQL & Redis)

Start the containerized PostgreSQL and Redis services via Docker Compose:

```bash
# From the root directory
docker compose up -d

# Verify container health status
docker compose ps
```

* **PostgreSQL** runs on port `5432` (`smart_logistics_db`)
* **Redis** runs on port `6379`

---

### Step 2: Configure Environment Variables

Navigate to the `backend/` directory and configure `.env`:

```bash
cd backend
cp .env.example .env
```

Ensure the configuration matches your local container credentials:

```env
# Application
NODE_ENV=development
PORT=3000

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:admin_password@localhost:5432/smart_logistics_db?schema=public"

# Redis Cache & Telemetry
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="redis_password"

# JWT Secret & Expiry
JWT_SECRET="super_secret_enterprise_jwt_key_2026"
JWT_EXPIRES_IN="7d"

# External Maps API
GOONG_API_KEY="your_goong_maps_api_key"
```

---

### Step 3: Install Dependencies & Run Database Migrations

```bash
# Install backend dependencies
npm install

# Push schema to database and generate Prisma Client
npx prisma db push

# Execute database seeder (Seeds Roles, Permissions, Vehicle Types, Services, Facilities)
npx prisma db seed
```

---

### Step 4: Launch Backend Server

Start the development server with live reload:

```bash
npm run dev
```

* **REST API Gateway**: `http://localhost:3000/api/v1`
* **Real-time WebSocket**: `ws://localhost:3000`

---

### Step 5: Visual Data Management (Prisma Studio)

Launch Prisma Studio to inspect, query, and manage database records interactively:

```bash
npx prisma studio
```

Access the web interface at **`http://localhost:5555`**.

---

## 📡 API Surface & Postman Collection

The API follows RESTful specifications (RFC 7231) with consistent JSON response wrappers:

```json
{
  "success": true,
  "message": "Operation executed successfully",
  "data": { ... },
  "errors": []
}
```

### Core API Endpoints

| Resource | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate user credentials & issue JWT |
| **Auth** | `GET` | `/api/v1/auth/me` | Retrieve active authenticated user profile |
| **Orders** | `POST` | `/api/v1/orders` | Create new delivery order with snapshot freeze |
| **Orders** | `GET` | `/api/v1/orders/:id` | Fetch order details, financial breakdown & tracking status |
| **Orders** | `PATCH` | `/api/v1/orders/:id/status` | Transition order status with history audit logging |
| **Shipments** | `POST` | `/api/v1/shipments` | Create consolidated shipment batch for linehaul transit |
| **Shipments** | `POST` | `/api/v1/shipments/:id/transfers` | Initiate inter-hub warehouse custody transfer |
| **Routing** | `POST` | `/api/v1/routing/optimize` | Trigger AI VRP optimization for pending shipments |
| **Routing** | `GET` | `/api/v1/routes/:id` | Retrieve planned route stops, sequences, and polyline |
| **Drivers** | `POST` | `/api/v1/drivers/location` | Telemetry endpoint for GPS coordinate sync |
| **POD** | `POST` | `/api/v1/deliveries/proof` | Submit digital Proof of Delivery with GPS & COD verification |

*A complete Postman Collection is provided in the repository at [Design DB/velocity_api_collection.json](file:///d:/smart-logistics-platform/Design%20DB/velocity_api_collection.json).*

---

## 🏆 Engineering Standards & Best Practices

* **Schema-Driven Type Safety**: 100% strict TypeScript types generated from Prisma Schema models and DTO class validators.
* **Database Normalization (3NF)**: Zero data anomalies, isolated PII profiles, parameterized SQL queries via Prisma to eliminate SQL Injection risks.
* **ISO 8601 UTC-0 Timestamps**: All server and database timestamps are strictly recorded in UTC-0 to prevent cross-timezone daylight synchronization issues.
* **Deterministic Auditing**: State changes emit immutable historical events recorded in `OrderStatusHistory`, `RouteAdjustmentLog`, and `TrackingEvent` tables.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
