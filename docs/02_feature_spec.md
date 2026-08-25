# DevOS — Feature Specification Bible

This document details the functional specifications for the 17 core modules of DevOS.

---

## 1. Authentication Module
- **Traditional Auth**: Email/password registration and login. Passwords must be hashed using `bcrypt` (10 rounds).
- **GitHub OAuth**: Authentication via standard OAuth 2.0. Redirects to `/auth/github` and callbacks to `/auth/github/callback`. Automatically resolves existing accounts via matching email or generates a new user.
- **JWT & Session Security**: 
  - Access Token: Extracted from headers as bearer tokens, valid for 1 hour.
  - Refresh Token: Stored securely in database and HTTP-only cookies, valid for 7 days.
  - Token Rotation: Issuing a new refresh token whenever the access token is refreshed, invalidating the old one to prevent reuse attacks.
  - Session Revocation: Endpoints to clear active sessions (`POST /auth/logout` and `/auth/logout-all`).

---

## 2. Organization Module
- **Workspace Isolation**: Multi-tenant database schema. All queries (repositories, sprints, tasks, logs) must filter by `orgId`.
- **Role-Based Access Control (RBAC)**: Enforces access bounds based on Membership Roles:
  - `OWNER`: full workspace management, billing permissions, ownership transfers, delete workspace.
  - `ADMIN`: manage repositories, add/invite users, remove users, update sprint details.
  - `MEMBER`: create/edit tasks, update task statuses, link issues, request AI reviews.
  - `VIEWER` (future): read-only access to boards and charts.
- **Invitation Flow**: Invitation endpoints (`POST /orgs/:id/members`) that validate target user exists and creates membership.

---

## 3. Repository Management Module
- **Repository Import**: Users view a list of their GitHub repositories via REST API (`GET /repositories/github-list`) and select which ones to import into DevOS.
- **Synchronization Service**:
  - Initial Sync: Import up to 100 commits, 50 pull requests, and 50 issues.
  - Webhook Setup: Automatically registers an active webhook on the target GitHub repository utilizing a secure webhook secret.
  - Readme Viewer: Fetches and displays the repository's main `README.md` file dynamically using MDX rendering.

---

## 4. GitHub Webhook Engine
- **Signature Verification**: Validates the `x-hub-signature-256` header on incoming payloads using the configured Webhook HMAC secret.
- **Supported Events**:
  - `push`: Syncs new commits.
  - `pull_request`: Upserts pull request status (`OPEN`, `CLOSED`, `MERGED`) and author details.
  - `issues`: Syncs issue titles, descriptions, assignees, and states (`OPEN`, `CLOSED`).
  - `workflow_run`: Logs CI/CD pipelines.
- **Idempotency**: Webhook payloads are logged in the `webhook_events` table using the `X-GitHub-Delivery` ID. Duplicate delivery IDs are immediately ignored with an HTTP 200 response to prevent double-processing.

---

## 5. Sprint Planner Module
- **Backlog Management**: A centralized, unassigned list of tasks.
- **Sprint Management**: Admin users create Sprints with start and end dates. Status transitions: `PLANNED` → `ACTIVE` → `COMPLETED`. Only one sprint can be `ACTIVE` per organization at a time.
- **Story Points**: Assignable estimates using the Fibonacci sequence (1, 2, 3, 5, 8, 13, 21) or custom numbers.
- **Subtasks & Comments**: Nested task checklists and discussion threads.

---

## 6. Kanban Module
- **Drag-and-Drop Interface**: Integrated board showing columns: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`.
- **State Persistence**: Moving cards triggers a debounced API request `PATCH /tasks/:id` to update the task status.
- **Swimlanes**: Ability to group issues by assignee or epic.

---

## 7. Roadmap & Timeline Module
- **Gantt Chart**: Interactive timeline displaying tasks, milestones, and epics chronologically.
- **Dependency Mapping**: Visually connects task dependencies. Blocked tasks display warning states in the UI.
- **Milestone Tracking**: Checkpoints representing target release goals.

---

## 8. Analytics Module
- **Metrics Catalog**: Calculates 35 key developer metrics:
  - Commit Frequency, Pull Request Lead Time, Cycle Time, Review Latency.
  - Sprint Velocity (Average story points completed per sprint).
  - DORA Metrics: Deployment Frequency, Lead Time for Changes, Change Failure Rate, Time to Restore Service.
- **Visual Charts**: Renders contribution heatmaps, burndown charts, and line graphs.

---

## 9. AI Code Review Module
- **Webhook Integration**: On `pull_request.opened` or `pull_request.synchronize`, the server retrieves the PR diff from GitHub.
- **Diff Parsing**: Chunks the raw file diffs, filters out lock files, and maps changes to file paths and line numbers.
- **LLM Review Pipeline**: Sends diff chunks to the AI Service which analyzes code for security issues (SQL injection, XSS), performance bottlenecks, style guidelines, and missing tests.
- **Comment Insertion**: Automatically posts review comments directly to the GitHub Pull Request lines using the GitHub Pull Request Review API.

---

## 10. Repository AI Chat (RAG)
- **Vector Indexing**: Background workers slice repository files into chunks, calculate vector embeddings using OpenAI `text-embedding-3-small`, and save them to the `AiDocument` table using a vector column type.
- **Search & Synthesis**: User questions are embedded, matched via pgvector cosine similarity, and fed to an LLM context window. The LLM generates code explanations, locates bugs, or designs unit tests.

---

## 11. AI Documentation Generator
- **Auto-Docs**: Scans codebase paths to generate technical reference sheets.
- **UML & Diagrams**: Leverages LLMs to output Mermaid.js code blocks representing system UMLs, sequence flows, and ERDs.

---

## 12. AI Release Notes Module
- **Changelog Structuring**: Analyzes all pull requests merged between two tags/commits.
- **Summarization**: Groups changes into categories (`Features`, `Bug Fixes`, `Performance`, `Changelog Updates`) and produces a developer-friendly, polished summary.

---

## 13. Knowledge Graph Module
- **Entity Linking**: Builds relational maps connecting developers, commits, PRs, issues, and code files.
- **RAG Boosting**: Enhances LLM RAG capabilities by analyzing path relationships (e.g. knowing which commits modified which database tables to help debug issue tickets).

---

## 14. CI/CD Monitor Module
- **Workflow Auditing**: Integrates with GitHub Actions webhook payloads to log build runs.
- **Log Streamer**: Displays active build logs from GitHub directly in the dashboard UI.
- **Triggers**: Allows admin users to trigger manual workflow reruns.

---

## 15. Notification Module
- **Event Broadcaster**: Dispatches real-time events on PR merges, failed builds, and mentions.
- **Channels**: Supports In-app notifications, Emails (via AWS SES), and webhook pushes to Slack/Teams channels.

---

## 16. Incident Management
- **Incident Logger**: Create tickets with severity rankings (`P0`, `P1`, `P2`).
- **Post-Mortem Timeline**: Captures chats, deployment timestamps, and logs in an incident timeline to trace root causes.
- **Status Page**: A public-facing web page showing current system status and historic uptime.

---

## 17. Billing Module (Future-Ready)
- **Tier Scoping**: Scaffolds structure for Free vs Team subscription tiers.
- **Stripe Webhooks**: Configured schema and controller stubs to manage subscriptions, license seats, and payment portals.
