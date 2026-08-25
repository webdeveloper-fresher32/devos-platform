# DevOS — Database Design Bible

This document details the complete schema layout, column types, relationships, indices, and vector query configurations for the 28 tables.

---

## 1. Schema Grouping Table

| Category | Table Name | Key Purpose | Primary Columns & Types |
| :--- | :--- | :--- | :--- |
| **Authentication** | `User` | Main user credentials. | `id` (UUID), `email` (Text), `password` (Text?), `githubId` (Text?) |
| | `Session` | Active user login sessions. | `id` (UUID), `userId` (FK), `userAgent` (Text), `expiresAt` (DateTime) |
| | `RefreshToken` | JWT rotations. | `id` (UUID), `token` (Text), `userId` (FK), `revoked` (Bool) |
| | `ApiKey` | Workspace developer integrations. | `id` (UUID), `keyHash` (Text), `orgId` (FK), `role` (Role) |
| **Organizations** | `Organization` | Workspace boundary. | `id` (UUID), `name` (Text), `slug` (Text Unique) |
| | `Membership` | Connects Users to Orgs. | `id` (UUID), `userId` (FK), `orgId` (FK), `role` (Role Enum) |
| | `Invitation` | Workspace invites. | `id` (UUID), `email` (Text), `orgId` (FK), `role` (Role), `token` (Text) |
| **GitHub** | `Repository` | Imported repositories. | `id` (UUID), `name` (Text), `githubRepoId` (Int), `orgId` (FK) |
| | `Commit` | Code changes. | `id` (UUID), `sha` (Text), `message` (Text), `repoId` (FK) |
| | `PullRequest` | Pull request tickets. | `id` (UUID), `githubId` (Int), `number` (Int), `state` (Text), `repoId` (FK) |
| | `Issue` | Imported GitHub tickets. | `id` (UUID), `githubId` (Int), `number` (Int), `title` (Text), `repoId` (FK) |
| | `Branch` | Code branches. | `id` (UUID), `name` (Text), `repoId` (FK), `lastCommitSha` (Text) |
| | `Release` | Tagged releases. | `id` (UUID), `tagName` (Text), `repoId` (FK), `changelog` (Text) |
| **Project** | `Sprint` | Development iterations. | `id` (UUID), `name` (Text), `status` (SprintStatus), `orgId` (FK) |
| | `Task` | Individual task cards. | `id` (UUID), `title` (Text), `status` (TaskStatus), `assigneeId` (FK) |
| | `Epic` | Large feature milestones. | `id` (UUID), `name` (Text), `description` (Text), `orgId` (FK) |
| | `Comment` | Task discussions. | `id` (UUID), `content` (Text), `taskId` (FK), `userId` (FK) |
| | `Label` | Task classifications. | `id` (UUID), `name` (Text), `color` (Text), `orgId` (FK) |
| | `Milestone` | Release targets. | `id` (UUID), `title` (Text), `orgId` (FK), `dueDate` (DateTime) |
| **Analytics** | `ActivityLog` | Developer operations metrics. | `id` (UUID), `userId` (FK), `action` (Text), `timestamp` (DateTime) |
| | `DeploymentMetric` | DORA velocity indicators. | `id` (UUID), `durationSeconds` (Int), `success` (Bool), `orgId` (FK) |
| **Notifications** | `Notification` | System broadcasts. | `id` (UUID), `title` (Text), `read` (Bool), `userId` (FK) |
| | `NotificationPref` | Channel opt-ins. | `id` (UUID), `userId` (FK), `emailEnabled` (Bool), `slackUrl` (Text?) |
| **AI** | `AiReview` | Scorecards of pull requests. | `id` (UUID), `pullRequestId` (FK), `score` (Int), `comments` (JSONB) |
| | `Embedding` | Code-base vector slices. | `id` (UUID), `chunkHash` (Text), `vector` (Vector), `docId` (FK) |
| | `AiDocument` | Source files mapping. | `id` (UUID), `content` (Text), `filePath` (Text), `repoId` (FK) |
| | `ReleaseNotes` | Auto-changelogs text. | `id` (UUID), `releaseId` (FK), `summary` (Text), `rawMarkdown` (Text) |
| | `KnowledgeNode` | Code graph nodes. | `id` (UUID), `entityType` (Text), `name` (Text), `metadata` (JSONB) |
| **Infrastructure** | `WebhookEvent` | Duplicate cache checks. | `id` (UUID), `deliveryId` (Text), `payload` (JSONB), `status` (Text) |
| | `Deployment` | Actions status metrics. | `id` (UUID), `commitSha` (Text), `status` (Text), `repoId` (FK) |
| | `AuditLog` | Member operations. | `id` (UUID), `orgId` (FK), `userId` (FK), `action` (Text), `ipAddress` (Text) |

---

## 2. Relationships & Unique Constraints
- **Multi-Tenant Constraints**: Every organizational entity must implement a cascade-delete reference linked to `orgId` or `repoId`.
- **Unique Indexes**:
  - `User.email` (Unique)
  - `User.githubId` (Unique, index for fast logins)
  - `Membership(userId, orgId)` (Composite Unique, prevents duplicate memberships)
  - `WebhookEvent.deliveryId` (Unique index for webhook idempotency check)
  - `Repository.githubRepoId` (Unique)
  - `Commit.sha` (Unique index for change checks)

---

## 3. PGVector & Search Configurations

### Semantic Chunk Table mapping
The AI chunk storage utilizes the vector type of size `1536` matching OpenAI's `text-embedding-3-small` dimensions:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "AiDocument" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiDocument_pkey" PRIMARY KEY ("id")
);
```

### Retrieval Optimization Index
To accelerate cosine similarity lookups over large code bases, an HNSW index is established:
```sql
CREATE INDEX ON "AiDocument" USING hnsw (embedding vector_cosine_ops);
```

### Retrieval Query Example
```sql
SELECT id, content, filePath, 1 - (embedding <=> $1) AS similarity
FROM "AiDocument"
WHERE 1 - (embedding <=> $1) > 0.75
ORDER BY embedding <=> $1
LIMIT 5;
```
*(Cosine distance <=> is used to compute vector proximity dynamically in DB)*
