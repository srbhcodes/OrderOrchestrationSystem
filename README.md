# Telecom Order Orchestration System

This repo is a **simplified** implementation of an order orchestration system inspired by real telecom OSS/BSS (Operations Support Systems / Business Support Systems). The idea is to capture the same core concepts—order lifecycle, task dependencies, async execution, failure handling—without the full scope of a production platform. Below is the enterprise picture that inspired it, then what this project actually does.

---

## The enterprise system (what this is based on)

In telecom, order management is not "create order, mark done." Real platforms (e.g. ServiceNow BOSS-OM, or similar OSS/BSS order management systems) do the following.

### What they handle

A single customer order (e.g. "upgrade my internet speed") turns into **many backend tasks** that must run in a **specific order**. For example: validate the customer, reserve inventory (port/device), schedule a technician if needed, provision the service in the network (e.g. RADIUS/Calix), then trigger billing. Billing cannot run before the service is activated; provisioning often depends on inventory being reserved. So the system has to **decompose an order into a graph of tasks**, enforce **dependencies** between them, and run them in the right sequence—often asynchronously via queues and workers.

Orders also go through a **lifecycle**: not just "pending" vs "done," but states like CREATED, IN_PROGRESS, WAITING (e.g. for an external system or manual step), COMPLETED, FAILED, and sometimes PARTIALLY_COMPLETED or retry states. Transitions between these states are **validated** so you can't move an order into an invalid state. In many systems this is implemented as a **state machine**.

In production you typically have:

- **Multiple order types**: new install, speed/plan change, add-on, suspend (e.g. non-payment), restore, disconnect. A large share of real traffic is **change** orders (e.g. speed upgrades), not new installs. The system has to treat those differently—e.g. skip inventory or dispatch when the customer already has service.
- **Multiple task types**: validate, inventory reserve/release, provision, billing, notify, dispatch. Each can depend on others; the execution engine resolves a **DAG (directed acyclic graph)** and runs tasks when their dependencies are satisfied.
- **Failure handling**: if a step fails (e.g. provisioning times out), the system may **retry** with backoff, and in some cases **roll back** earlier steps (e.g. undo billing if provisioning fails). That implies thinking in terms of transactions or compensating actions.
- **Observability**: operations need to see why an order is stuck. So you get **dashboards**, **task timelines**, **dependency views**, and sometimes **SLA/jeopardy** so that late orders are visible.
- **Extra concerns**: inventory locking so two orders don't reserve the same resource, subscription/account state for change detection, **audit logs**, and often **multi-tenant** isolation.

So the "enterprise" mental model is: **orders drive a state machine**, **orders decompose into dependent tasks**, and a **separate execution layer** runs those tasks asynchronously with clear rules, retries, and visibility.

### Example flows in the enterprise world

**New internet installation**  
Customer request → order created → tasks generated: validate eligibility, reserve inventory (port/device), schedule technician dispatch, provision service (e.g. RADIUS), activate billing, close order. Each step may call external systems; dependencies ensure order (e.g. billing only after provisioning).

**Speed upgrade (change order)**  
Order created with type "change." System detects existing service: skip inventory (already assigned), skip dispatch (no truck roll), update provisioning profile, update billing plan, close order. So the **same orchestration engine** runs a **different graph** of tasks depending on order type and context.

**Suspend (e.g. non-payment)**  
Suspend order → stop billing, suspend service in provisioning, notify customer, mark order complete. Restore is the reverse: validate payment, restore provisioning, resume billing, notify.

In a full system you'd also have **inventory** and **subscription** models: e.g. which port is assigned to which customer, and what the current plan is, so that "change" logic can decide what to skip or what to update.

### Architecture (enterprise level)

Conceptually you get layers like:

- **UI**: customer/agent portals and an **ops dashboard** (orders, task timeline, dependency view, manual actions).
- **API**: REST (and often WebSocket for live updates).
- **Business logic**: **order engine** (state machine, validation, task blueprint generation), **task engine** (dependency resolution, execution), **orchestration engine** (coordinates order + tasks, handles completion/failure).
- **Background processing**: **job queue** (e.g. Redis + BullMQ), **workers** that run tasks, **retry/rollback** logic.
- **Data**: orders, tasks, inventory, subscriptions, audit/history.
- **External integrations**: inventory, billing, provisioning (and sometimes dispatch) are often separate systems; the order system calls them or simulates them.

All of the above is what the **full** enterprise version would look like. This repo is a **reduced** version of that.

---

## What this project is (simplified version)

This codebase keeps the same **ideas** but scopes them down so one person can build and understand it in a few weeks. It's not a production system; it's a learning/portfolio implementation of the same patterns.

### What we simplified

| Enterprise | This repo |
|------------|-----------|
| Many order states (incl. WAITING, PARTIALLY_COMPLETED, retries) | **4 states**: CREATED → IN_PROGRESS → COMPLETED or FAILED. Transitions validated; no WAITING. |
| Many order types (install, change, suspend, restore, disconnect, etc.) | **3 types**: INSTALL, CHANGE, DISCONNECT. No suspend/restore. |
| Many task types (validate, inventory, provision, billing, notify, dispatch) | **3 types**: VALIDATE, PROVISION, BILLING. No inventory, notify, or dispatch. |
| Full subscription/inventory models for change detection | **Simple conditional logic** (e.g. for CHANGE, skip or adjust provisioning). No subscription DB or payload diffs. |
| Complex rollback, transaction-aware | **Basic**: mark failed, allow retry; no multi-step rollback chains. |
| Multiple queues, priorities, SLA/jeopardy | **One queue**, one worker, **no** SLA timers. Basic metrics only. |
| Inventory, Subscription, AuditLog collections | **Only** Order and Task (and state history on the order). |
| D3.js / advanced dependency viz | **Text/list** dependency view. |

So: **same mental model** (state machine, DAG of tasks, async execution, retries, observability), but **fewer states, fewer types, and simpler rules**. The goal is to show how an orchestration system is **structured**, not to replicate a full OSS/BSS stack.

### What's implemented

The simplified pipeline is implemented **end to end**: order → state machine → task generation → dependency resolution → async execution → retries → real-time dashboard.

- **Order state machine** — Order CRUD with 4 validated states (CREATED → IN_PROGRESS → COMPLETED / FAILED). State history tracks the last 5 transitions with timestamps. Completion and failure timestamps are recorded.

- **Task system** — When an order moves to IN_PROGRESS, a **task blueprint generator** creates the right set of tasks based on order type (INSTALL: VALIDATE → PROVISION → BILLING; CHANGE / DISCONNECT: VALIDATE → BILLING). A **dependency resolver** runs topological sort (Kahn's algorithm) and checks for circular dependencies before persisting tasks.

- **Async execution** — A single **BullMQ queue** backed by Redis. One **worker** picks up tasks, runs them through a **task executor** that calls a **mock service** (1–3 s random delay, ~15% simulated failure). On completion the orchestration layer marks dependent tasks as READY and enqueues them; when all tasks finish the order moves to COMPLETED automatically.

- **Retry & failure handling** — Failed tasks are retried up to 3 times with a fixed 2 s delay. If retries are exhausted the task is marked FAILED and the order is marked FAILED.

- **Real-time updates** — Socket.io emits `order:updated` and `task:updated` events to a single room. The frontend subscribes on connect and refetches data on every event — order list, order detail, and dashboard all stay in sync without manual refresh.

- **Dashboard** — A `/dashboard` page shows: total orders, completion rate, total tasks, failed-order count, breakdowns by order status and task status, a recent-orders table, and a recent-tasks table. A live-connection indicator appears in the nav bar.

- **Frontend** — React + Vite + Tailwind. Pages: order list, create order, order detail (state transitions, state history, task list with dependency info), and dashboard.

---

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios, Socket.io client.
- **Backend:** Node.js, Express, TypeScript, Mongoose, BullMQ, Redis, Socket.io.
- **Database:** MongoDB.

No auth in this version; the focus is on the orchestration flow.

---

## How to run it

You need **Node 18+**, **MongoDB**, and **Redis**.

1. **Clone and install**
   ```bash
   cd telecom-order-orchestration
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment**
   - **Backend:** copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI` and `REDIS_URL`.
   - **Frontend:** copy `frontend/.env.example` to `frontend/.env` if you need a different API URL (defaults are fine for local dev with the proxy).

3. **Run**
   - **Backend:** from `backend/`, run `npm run dev` (default port 3001).
   - **Frontend:** from `frontend/`, run `npm run dev` (default port 3000). Vite proxies `/api` and Socket.io to the backend.

4. **Try it**
   - Create an order (INSTALL, CHANGE, or DISCONNECT).
   - Open the order and click **Start** — the order moves to IN_PROGRESS and tasks are generated and enqueued.
   - Watch tasks execute automatically (READY → RUNNING → COMPLETED, with retries on failure).
   - When all tasks complete, the order moves to COMPLETED. If a task exhausts retries, the order moves to FAILED.
   - Open the **Dashboard** to see live metrics and status breakdowns updating in real time.

---

## Repo layout

- **`backend/`** — Express app: models, state machine, task blueprint/dependency system, BullMQ queue and worker, orchestration layer, Socket.io events.
- **`frontend/`** — React app: order list, create form, order detail, dashboard, Socket.io client for real-time updates.
- **`shared/`** — Shared TypeScript types (orders and tasks) so frontend and backend stay in sync.

If you're used to telecom or BSS/OSS, this will feel like a **trimmed-down** order-management flow: same notions of order lifecycle, tasks, and dependencies, with fewer moving parts so the structure stays clear.
