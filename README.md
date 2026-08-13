# Evidence Studio

**Evidence Studio** is an autonomous research workspace for turning a research question into an evidence-led, source-linked report. It provides a focused React dashboard, a durable research-session library, an iterative workflow trail, and structured reports with exactly these sections: **executive summary**, **findings**, and **sources**.

The application supports **OpenAI**, **Anthropic**, **Gemini**, **Groq**, and any compatible model provider. It deliberately keeps external provider credentials in browser memory only: keys are transmitted for the immediate test or research step, are never written to the database or local storage, and disappear when the page is closed.

> The application does not claim that retrieved records prove every statement. The writer is instructed to preserve uncertainty, restrict citations to retrieved records, and avoid presenting unsupported claims as settled fact.

Author: **taha deab** — see the [LICENSE](LICENSE) file for the MIT license.

## Product capabilities

| Capability | Implementation |
| --- | --- |
| Provider selection | A settings panel selects the active provider and model, with a one-click connection test. |
| Autonomous workflow | The app progresses through planning, scholarly-source retrieval, analysis, synthesis, and report assembly. |
| Durable library | Research sessions record query, title, selected provider/model, status, report, timestamps, events, and sources. |
| Transparent progress | The dashboard polls persisted workflow events and surfaces sub-queries, intermediate findings, and source records. |
| Report delivery | Reports render as Markdown and can be copied or downloaded as Markdown and PDF. |
| Research safety | External keys are not persisted. Source URLs in the final report are filtered against the retrieved source set. |

## Architecture

The frontend is built with **React 19**, TypeScript, Tailwind CSS, shadcn/ui, and Streamdown. The backend is an **Express + tRPC** server with typed procedures rather than an untyped REST wrapper. Data persistence uses **Drizzle ORM** with MySQL/TiDB-compatible tables.

```text
Research question
  → provider-backed planning
  → Crossref scholarly-record retrieval
  → evidence analysis
  → synthesis event
  → structured report validation
  → Markdown / PDF export
```

The provider adapters use current public API conventions: OpenAI-style Chat Completions for OpenAI and Groq, Gemini compatibility, and the Anthropic Messages format for Anthropic. The precise external provider model identifiers are user-configurable. [1] [2] [3] [4]

## Prerequisites

| Requirement | Recommended version | Purpose |
| --- | --- | --- |
| Node.js | 22 or newer | Application runtime and build tooling |
| pnpm | 10 | Dependency management |
| MySQL or TiDB | MySQL 8 compatible | Persistent research sessions and reports |

## Running the project locally

Clone the repository, install dependencies, and populate local configuration from the included template.

```bash
git clone https://github.com/tahadeab/evidence-studio.git
cd evidence-studio
pnpm install
cp config/environment.example .env
```

Edit `.env` and set at least `DATABASE_URL` (your MySQL/TiDB connection string) and `JWT_SECRET` (any strong random string). Then create the schema and start the development server:

```bash
pnpm drizzle-kit migrate
pnpm dev
```

The development server prints the local application URL. Open it in your browser, sign in with any name (and the access code if `ADMIN_CODE` is set — the first signed-in user becomes the administrator), choose a provider and model in **Provider configuration**, test the connection, and then start a research session.

### Production build

```bash
pnpm build
pnpm start
```

The production build outputs the client to `dist/public/` and bundles the server to `dist/index.js`.

## Environment variables

Copy `config/environment.example` to `.env`; never commit `.env` (it is already gitignored). The committed template lives in `config/` so variable names can be documented without embedding a writable environment file.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MySQL/TiDB-compatible Drizzle connection string. |
| `JWT_SECRET` | Yes | Strong secret used to sign session cookies. |
| `ADMIN_CODE` | Optional | Access code required to sign in. Leave blank to let anyone with the app URL sign in. |
| `PORT` | Optional | Server port (default `3000`). |

External provider API keys are intentionally **not** environment variables in the default configuration. A signed-in user enters them in the provider panel for the active browser tab. This enables individual users to select their own providers without making private keys server-persistent.

## Running checks

The repository includes unit, contract, source-adapter checks.

```bash
pnpm check   # TypeScript type checking
pnpm test    # Vitest unit tests
pnpm build   # Production build
```

The full CI pipeline in `.github/workflows/ci.yml` runs dependency installation, type checking, tests, and the production build on every push and pull request.

## Provider notes

| Provider | Adapter approach | Credential behavior |
| --- | --- | --- |
| OpenAI | Chat Completions request | Memory-only user key |
| Anthropic | Messages request with separate system prompt | Memory-only user key |
| Gemini | Gemini's OpenAI-compatible endpoint | Memory-only user key |
| Groq | OpenAI-compatible Chat Completions request | Memory-only user key |

The provider connection test is the appropriate confirmation step for an external key: a successful response confirms the selected key/model combination can serve the app. API availability and model access remain subject to each provider's account permissions and policies.

## Repository layout

```text
client/                 React dashboard and report workspace
server/research/        Provider adapters, source retrieval, workflow, persistence helpers
server/routers/         Typed tRPC research API
shared/research.ts      Cross-client contracts and report validation
drizzle/                Schema and generated migrations
config/                 Environment variable template
.github/workflows/      Continuous integration
```

## References

[1] [OpenAI API platform](https://openai.com/api/)

[2] [Anthropic Messages API guide](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)

[3] [Gemini OpenAI compatibility guide](https://ai.google.dev/gemini-api/docs/openai)

[4] [Groq Chat Completions API reference](https://console.groq.com/docs/api-reference)
