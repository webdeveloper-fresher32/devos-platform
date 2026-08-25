# DevOS — Testing & Production Checklist

This document details the automated testing targets, webhook mock testing tools, and production launch checklists.

---

## 1. Code Coverage & Test Frameworks

### Core Targets
- **Authentication**: 100% Coverage. Every auth branch, token rotation, and guard must be covered by unit tests.
- **Webhook Engine**: 100% Coverage. Webhook verification, delivery caching, and duplication filtering.
- **GitHub Sync**: 95% Coverage. Mock GitHub API client tests using JSON fixture payloads.
- **AI Pipelines**: 80% Coverage. Mocks for OpenAI completions and LangGraph nodes.

### Test Commands
- **Backend Unit Tests**:
  ```bash
  cd backend && npm run test
  ```
- **Backend Integration / E2E Tests**:
  ```bash
  cd backend && npm run test:e2e
  ```
- **FastAPI Unit Tests**:
  ```bash
  cd ai-service && .venv/bin/pytest
  ```
- **Frontend E2E Web Tests**:
  ```bash
  cd frontend && npx playwright test
  ```

---

## 2. Webhook Testing Fixtures

When testing the webhook processing engine locally or in CI pipelines, use these mock payload templates:

### A. Webhook Header Set
```http
X-GitHub-Event: pull_request
X-GitHub-Delivery: 74d89a42-f8c6-4b92-9e20-5c6d3f2a1b0c
X-Hub-Signature-256: sha256=a1b2c3d4e5f6... (calculated using webhook HMAC key)
```

### B. Pull Request Created Mock Body
```json
{
  "action": "opened",
  "number": 12,
  "pull_request": {
    "id": 987654321,
    "number": 12,
    "title": "feat: Add AWS storage provider strategy",
    "state": "open",
    "html_url": "https://github.com/acme/main-api/pull/12",
    "user": {
      "login": "devos-coder"
    },
    "head": {
      "sha": "9b8a7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d"
    }
  },
  "repository": {
    "id": 87654321,
    "name": "main-api",
    "full_name": "acme/main-api",
    "owner": {
      "login": "acme"
    }
  }
}
```

---

## 3. Production Launch Checklist

### Security Auditor
- [ ] **Helmet Integration**: Enabled security headers in NestJS `main.ts`:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```
- [ ] **CORS Settings**: Allowed domains restricted exclusively to frontend origins in production.
- [ ] **Rate Limiting**: Configured `ThrottlerModule` in NestJS backed by Redis storage driver:
  - Max 100 requests per 15-minute window for standard API calls.
  - Max 5 requests per minute for `/auth/login` and `/auth/register` routes.
- [ ] **Secrets Verification**: Assured zero hardcoded secrets are in git branches or Docker configurations. All secrets read directly from **AWS Secrets Manager**.

### Database & Operations
- [ ] **RDS Backups**: Enabled daily automated RDS PostgreSQL backups with a 30-day retention cycle.
- [ ] **S3 Versioning**: Enabled versioning on the S3 bucket to allow recovery of modified attachments.
- [ ] **Queue Cleanup**: Set TTL rules on BullMQ jobs in Redis to purge successful operations after 24 hours.
- [ ] **DDoS Safeguards**: Enabled AWS Shield and CloudFront origin access control (OAC) to secure endpoints.
