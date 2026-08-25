# DevOS — UI/UX Specification (52 Screens)

This document establishes the UI/UX design guidelines, styling choices, and layouts for all 52 screens.

---

## 1. Design System & Aesthetics

### Color Palette (Glassmorphism Dark-Mode)
We use a premium, tailored dark color scheme built on HSL variables:
- **Background**: `hsl(222.2, 84%, 4.9%)` (Deep Obsidian Blue-Black)
- **Card/Surface**: `rgba(17, 24, 39, 0.7)` with `backdrop-filter: blur(12px)`
- **Border**: `hsl(217.2, 32.6%, 17.5%)` (Sleek Slate Border)
- **Primary / Accent**: `hsl(263.4, 70%, 50.4%)` (Vibrant Electric Violet)
- **Success / Green**: `hsl(142.1, 76.2%, 36.3%)` (Emerald Green)
- **Warning / Yellow**: `hsl(47.9, 95.8%, 51.2%)` (Amber Gold)
- **Destructive / Red**: `hsl(346.8, 77.2%, 49.8%)` (Crimson Rose)

### Typography
- **Primary Font**: `Inter` (sans-serif) for clean UI, tables, and settings.
- **Header Font**: `Outfit` (sans-serif) for bold page titles and landing headers.
- **Code Font**: `JetBrains Mono` for diff blocks, script viewers, and API payloads.

---

## 2. Screen Inventory Layout Specs

### A. Marketing Website (7 Screens)
1. **Landing Page**: Implements a massive hero section with a gradient text header, floating 3D dashboard mockup, live interactive commit widget, and a call-to-action "Deploy DevOS in 5 mins".
2. **Features Page**: A 3x3 grid using card micro-animations detailing core modules.
3. **Pricing Page**: Dynamic card toggles between monthly/annual plans.
4. **Documentation Page**: Multi-level navigation panel, code snippets, copy-to-clipboard blocks.
5. **Blog Page**: Post directory with search filters and read-time badges.
6. **Contact Page**: Compact glassmorphic contact form.
7. **Changelog Page**: Chronological timeline detailing product updates.

### B. Authentication (5 Screens)
8. **Login**: Centered card featuring credentials fields and a primary "Sign in with GitHub" button.
9. **Signup**: Password strength meter, agreement checkboxes.
10. **GitHub Consent Page**: Explicit list of scopes requested.
11. **Forgot Password**: Verification code input fields.
12. **Device Sessions**: Table showing active sessions, browser names, IPs, and "Revoke" buttons.

### C. Dashboard (8 Screens)
13. **Overview Dashboard**: A multi-column dashboard containing:
    - Top Row: 4 key KPI cards (Active Sprints, Cycle Time, Webhook Health, Pending PRs) with sparkline charts.
    - Left Column: Commit frequency chart (Bar Chart) and DORA metrics radar chart.
    - Right Column: Live webhook event activity feed and AI PR Review latency ticker.
14. **Repository Dashboard**: Repo health indexes, open issue counts.
15. **Developer Dashboard**: Personal commit streams and assigned tickets.
16. **Team Dashboard**: Leaderboards, team velocity charts.
17. **Deployment Dashboard**: Live CI/CD pipelines.
18. **Incident Dashboard**: System outage tracking panel.
19. **Notification Center**: Grouped lists (Read/Unread) with quick-action checkmarks.
20. **Activity Feed**: Continuous event stream.

### D. GitHub Module (7 Screens)
21. **Repository List**: Card grid showing imported repos, stars, and connection status.
22. **Repository Detail**: Repository branches, readme document preview, contributor lists.
23. **Pull Request Detail**: A split-screen layout displaying:
    - Left side: Git commits, changed files file-tree, and diff code views.
    - Right side: Chat timeline, comments, and AI PR Review scorecard.
24. **Commit Explorer**: List of commits with profile avatars and SHAs.
25. **Branch Explorer**: Tree visualizer showing branches and merge statuses.
26. **Issue Explorer**: Issue tables with status tags (`OPEN`, `CLOSED`).
27. **Webhook Event Viewer**: Json payload viewer showing raw headers and responses.

### E. Project Management (9 Screens)
28. **Kanban Board**: Drag-and-drop board containing task cards (assignee avatar, points, status).
29. **Sprint Board**: Active sprint stats, burndown graphs, and subtask checklists.
30. **Timeline**: Epics and milestones mapped horizontally.
31. **Gantt Chart**: Interactive timeline displaying critical paths.
32. **Milestones**: Completion progress bars.
33. **Epic Detail**: Aggregated scope lists.
34. **Issue Detail**: Rich-text description editor.
35. **Calendar**: Monthly view of deadlines and releases.
36. **Team Workload**: Allocation chart showing assigned points per engineer.

### F. AI Workspace (8 Screens)
37. **Repository Chat**: Split panel showing a chat interaction history on the left, and a context reference panel (embedded files search results) on the right.
38. **AI Code Review**: Scorecard layout detailing code complexity and performance bugs.
39. **AI Sprint Planner**: A prompt entry field that auto-populates Kanban tasks.
40. **AI Release Notes**: Markdown draft editor with direct "Publish to GitHub" actions.
41. **AI Documentation**: File-tree showing code docs and auto-generated UML blocks.
42. **AI Architecture Generator**: High-level systems design visualizer.
43. **Knowledge Graph Viewer**: Dynamic, force-directed node graph visualization of entities.
44. **AI Settings**: LLM temperature toggles, OpenAI client configuration inputs.

### G. Settings (8 Screens)
45. **Organization Settings**: Slug editor, delete org button.
46. **Member Management**: Email invitations forms, role assignment dropdowns.
47. **Billing**: Active subscription details, pricing card updates.
48. **API Keys**: Dynamic generator for token keys.
49. **Integrations**: Toggle switches for Slack, Teams, and AWS.
50. **Storage Providers**: Strategy selector (Local vs S3).
51. **Feature Flags**: Boolean configuration toggles.
52. **Security Settings**: Session timeout configs, JWT rotation policies.
