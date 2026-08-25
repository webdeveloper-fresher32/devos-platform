# DevOS — API Contracts (Swagger Level)

This document details the REST API specifications, validation models, request payloads, and response structures.

---

## 1. Global API Standards
- **Base Path**: All endpoint routes are versioned and prefixed: `/api/v1`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <jwt_token>` (for all guarded endpoints)
- **Standard Envelope**:
  - Success responses return the requested object or list directly (with standard HTTP codes).
  - Error responses follow this structure:
    ```json
    {
      "statusCode": 400,
      "message": ["Password is too short", "Email must be a valid email address"],
      "error": "Bad Request",
      "timestamp": "2026-08-25T16:50:00Z"
    }
    ```

---

## 2. Core API Endpoint Specs

### A. Authentication Module

#### Traditional User Registration
- **Route**: `POST /api/v1/auth/register`
- **Auth Guard**: Public
- **Request Body**:
  ```json
  {
    "email": "dev@devos.io",
    "password": "secure_password_123",
    "name": "DevOS Engineer"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "a4d3b8f6-2c9d-4e8f-8b9a-7c8d9e0f1a2b",
    "email": "dev@devos.io",
    "name": "DevOS Engineer",
    "avatarUrl": null,
    "createdAt": "2026-08-25T16:51:20Z",
    "updatedAt": "2026-08-25T16:51:20Z"
  }
  ```

#### Traditional User Login
- **Route**: `POST /api/v1/auth/login`
- **Auth Guard**: Public
- **Request Body**:
  ```json
  {
    "email": "dev@devos.io",
    "password": "secure_password_123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "a4d3b8f6-2c9d-4e8f-8b9a-7c8d9e0f1a2b",
      "email": "dev@devos.io",
      "name": "DevOS Engineer",
      "avatarUrl": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### B. Organization Module

#### Create Organization
- **Route**: `POST /api/v1/orgs`
- **Auth Guard**: JWT Bearer
- **Request Body**:
  ```json
  {
    "name": "Acme Engineering",
    "slug": "acme-engineering"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "b9d8c7b6-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "name": "Acme Engineering",
    "slug": "acme-engineering",
    "createdAt": "2026-08-25T16:52:10Z",
    "updatedAt": "2026-08-25T16:52:10Z"
  }
  ```

#### Invite / Add Organization Member
- **Route**: `POST /api/v1/orgs/:id/members`
- **Auth Guard**: JWT Bearer + RolesGuard (`OWNER`, `ADMIN`)
- **Request Body**:
  ```json
  {
    "email": "teammate@acme.com",
    "role": "MEMBER"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
    "role": "MEMBER",
    "userId": "d9c8b7a6-5f4e-3d2c-1b0a-9e8d7c6b5a4f",
    "orgId": "b9d8c7b6-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "createdAt": "2026-08-25T16:53:30Z",
    "user": {
      "id": "d9c8b7a6-5f4e-3d2c-1b0a-9e8d7c6b5a4f",
      "email": "teammate@acme.com",
      "name": "Alice Teammate",
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345"
    }
  }
  ```

---

### C. Repository Module

#### Import Repository
- **Route**: `POST /api/v1/repositories/import`
- **Auth Guard**: JWT Bearer + RolesGuard (`OWNER`, `ADMIN`)
- **Request Body**:
  ```json
  {
    "orgId": "b9d8c7b6-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "githubRepoId": 87654321,
    "name": "main-api",
    "fullName": "acme/main-api",
    "owner": "acme"
  }
  ```
- **Response (202 Accepted)**:
  ```json
  {
    "id": "e2f1a0b9-8c7d-6e5f-4a3b-2c1d0e9f8a7b",
    "name": "main-api",
    "githubRepoId": 87654321,
    "orgId": "b9d8c7b6-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "status": "IMPORTING",
    "message": "Repository import job enqueued in worker queue."
  }
  ```

---

### D. Project & Kanban Module

#### Update Task Status (Drag and Drop Event)
- **Route**: `PATCH /api/v1/tasks/:id`
- **Auth Guard**: JWT Bearer + RolesGuard (`OWNER`, `ADMIN`, `MEMBER`)
- **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "f5e4d3c2-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
    "title": "Build S3 upload strategy provider",
    "status": "IN_PROGRESS",
    "points": 5,
    "assigneeId": "a4d3b8f6-2c9d-4e8f-8b9a-7c8d9e0f1a2b",
    "sprintId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "updatedAt": "2026-08-25T16:55:00Z"
  }
  ```

---

### E. AI Workspace Module

#### Repository Chat (RAG query)
- **Route**: `POST /api/v1/ai/chat`
- **Auth Guard**: JWT Bearer
- **Request Body**:
  ```json
  {
    "repoId": "e2f1a0b9-8c7d-6e5f-4a3b-2c1d0e9f8a7b",
    "prompt": "Where do we define the Prisma service connection in our backend application?"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "response": "The Prisma service connection is defined in the `PrismaService` class located inside the file [prisma.service.ts](file:///Users/ganeshpirikirala/Desktop/Ai-platform/backend/src/prisma/prisma.service.ts). This class extends the standard `PrismaClient` and hook methods are implemented for `$connect()` and `$disconnect()` during module lifecycle changes.",
    "references": [
      {
        "filePath": "backend/src/prisma/prisma.service.ts",
        "score": 0.94
      },
      {
        "filePath": "backend/src/prisma/prisma.module.ts",
        "score": 0.81
      }
    ]
  }
  ```
