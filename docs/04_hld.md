# DevOS — High-Level System Design (HLD)

This document outlines the architectural blueprints, communication flows, and system patterns of the DevOS platform.

---

## 1. System Architecture Diagram

```mermaid
graph TD
    Client[Next.js Frontend] -->|HTTPS / WSS| ApiGateway[NestJS API Gateway]
    ApiGateway -->|TCP 5433| PostgresDB[(PostgreSQL + pgvector)]
    ApiGateway -->|Redis Queue| RedisCache[(Redis Cache / BullMQ)]
    RedisCache -->|Polls Jobs| Worker[BullMQ Background Worker]
    Worker -->|Fetch metadata| GitHub[GitHub REST & GraphQL API]
    ApiGateway -->|gRPC / HTTP| AiService[FastAPI AI Service]
    AiService -->|Embeddings / Completion| OpenAI[OpenAI API]
    AiService -->|Query vector store| PostgresDB
```

---

## 2. Microservice Communications

| Channel | Source | Destination | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **User API Actions** | Next.js Frontend | NestJS API Gateway | HTTP / REST | Fetching dashboard data, managing orgs, updating sprints. |
| **Realtime Updates** | NestJS API Gateway | Next.js Frontend | WebSockets (WSS) | Realtime webhook execution events and notification alerts. |
| **AI Inference** | NestJS API Gateway | FastAPI Service | HTTP / JSON | Executing codebase RAG queries and pull request code reviews. |
| **Background Jobs** | NestJS API Gateway | Redis / BullMQ | BullMQ Protocol | Enqueuing heavy operations (initial syncs, webhook processes). |
| **Vector DB Queries** | FastAPI Service | PostgreSQL DB | SQL (pgvector) | Semantic retrieval of code blocks for RAG synthesis. |

---

## 3. GitHub Webhook Processing & Idempotency Pipeline

To prevent race conditions, duplicate operations, and rate limits, DevOS handles webhook events using an event-driven queue:

```mermaid
sequenceDiagram
    autonumber
    actor GitHub as GitHub Server
    participant Gateway as NestJS API Gateway
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    participant Queue as BullMQ Queue
    participant Worker as BullMQ Worker

    GitHub->>Gateway: POST /webhooks/github (Payload & Header Signature)
    Gateway->>Gateway: Verify Webhook Signature (HMAC SHA256)
    alt Invalid Signature
        Gateway-->>GitHub: HTTP 401 (Unauthorized)
    end
    Gateway->>Redis: Check ID in Redis Cache (Delivery ID)
    alt Delivery ID Found
        Gateway-->>GitHub: HTTP 200 (Duplicate Ignored)
    end
    Gateway->>DB: Log event in webhook_events (PENDING status)
    Gateway->>Queue: Enqueue Webhook Job
    Gateway-->>GitHub: HTTP 202 (Accepted)
    
    Note over Queue, Worker: Worker processes job asynchronously
    Worker->>Queue: Pull job
    Worker->>Worker: Parse event (push, pull_request, issues)
    Worker->>DB: Update corresponding PR/issue/commit records
    Worker->>DB: Update webhook_event status (COMPLETED)
```

---

## 4. AI Repository Chat (RAG) Architecture

The FastAPI AI service builds and queries a code-level knowledge base using `pgvector`:

```mermaid
graph TD
    Repo[Imported GitHub Repository] -->|Trigger Sync| CodeSplitter[FastAPI Chunking Pipeline]
    CodeSplitter -->|AST Parser: Tree-Sitter| SemanticChunks[Semantic Code Chunks]
    SemanticChunks -->|Embeddings API| OpenAIEmbed[OpenAI text-embedding-3-small]
    OpenAIEmbed -->|Vector Embeddings| PGVector[(PostgreSQL pgvector DB)]

    UserPrompt[User Question: 'How does X work?'] -->|Embed Prompt| OpenAIQuery[OpenAI Embeddings]
    OpenAIQuery -->|Cosine Similarity Search| PGVector
    PGVector -->|Top K Code Chunks| ContextBuilder[Context Builder]
    ContextBuilder -->|Context + Prompt| LLM[OpenAI GPT-4o]
    LLM -->|Synthesized Response| NextJSClient[Next.js Chat Window]
```

### Chunking Strategy
Code files are chunked semantically using AST parsing (`tree-sitter`) rather than arbitrary character splits. This keeps functions and classes intact, preserving context.

### Indexing Strategy
Vector columns are indexed using HNSW (Hierarchical Navigable Small World) indices on PostgreSQL:
```sql
CREATE INDEX ON "AiDocument" USING hnsw (embedding vector_cosine_ops);
```
HNSW yields fast, sub-millisecond retrieval rates for semantic searches.
