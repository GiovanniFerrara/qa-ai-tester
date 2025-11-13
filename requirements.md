AI-ASSISTED QA SYSTEM MVP1
Playwright + Computer Use (OpenAI / Claude) + TypeScript Orchestration
Version: 1.0 (MVP1)
Audience: TypeScript backend/frontend engineers, QA engineers, DevOps
Scope: Web application dashboard sanity checks and groundwork for AI-authored E2E tests.
---------------------------------------------------------------------
1. OBJECTIVES AND SCOPE
---------------------------------------------------------------------
1.1 Goals
- Replace a first slice of conventional end-to-end (E2E) tests for the dashboard
 with an AI-assisted pipeline.
- Use Playwright to handle repetitive login and environment setup, and then
 hand off the already-authenticated browser context to an AI "computer use"
 agent that navigates and validates the dashboard.
- Enable natural-language QA tasks such as: "Verify that the dashboard shows
 the correct KPIs and that there are no inconsistencies between on-screen
 values and backend data /api/kpi".
- Provide strongly-typed, machine-readable QA artifacts (JSON) that can be
 stored, compared between runs, and used in CI/CD.
- Lay the foundations for a second agent (AI Test-Author) that generates and
 maintains deterministic Playwright E2E tests for stable flows.
1.2 Out of Scope (for MVP1)
- Full accessibility and performance testing (axe / Lighthouse) – only hooks
 are prepared for future phases.
- Non-web surfaces (mobile apps, native desktop clients).
- Multi-tenant production data; MVP1 operates on sandbox / test tenants only.
---------------------------------------------------------------------
2. HIGH-LEVEL ARCHITECTURE (MVP1)
---------------------------------------------------------------------
2.1 Main Components
1) Orchestrator (Node/TypeScript service)
 - Accepts "test runs" for a given build, environment, and role.
 - Dispatches jobs to Browser Workers.
 - Calls OpenAI or Claude APIs to run "computer use" loops and obtain
 structured QA reports.
 - Persists run metadata and QA findings.
2) Browser Worker (Playwright-based)
 - Maintains a Playwright BrowserContext with authentication preloaded
 from storageState.
 - Exposes an internal "Computer Adapter" to execute actions requested
 by the AI (click, type, scroll, hotkey, screenshot, wait, etc.).
 - Collects trace.zip, console logs, and network logs for each run.
3) LLM Providers
 - OpenAI Responses API:
 * Used for computer-use style interaction in our browser.
 * Used for Structured Outputs to ensure JSON adherence to schemas.
 - Anthropic Claude Messages API:
 * Optionally used for tool-based agents and Claude Computer Use.
 - Provider choice is a configuration; the internal contracts remain
 stable across models.
4) Artifact Store
 - Object storage for:
 * Playwright trace.zip files.
 * Screenshots produced while the AI interacts.
 * Optional raw LLM transcripts.
 - Metadata store (SQL / KV) for runs, tasks, and findings.
5) Reporting Layer
 - Takes raw findings from the AI and internal assertions.
 - Produces a consolidated QAReport JSON document per run.
 - Provides human-readable HTML/Markdown views derived from the JSON.
2.2 Execution Flow (MVP1)
1) Setup login (one time per environment/role) and store Playwright storageState.
2) Orchestrator receives a QA TaskSpec for the dashboard.
3) Orchestrator starts a Browser Worker with an authenticated Playwright context.
4) Orchestrator starts a "computer use" session with the AI model, providing:
 - Goal description (TaskSpec.goal).
 - Domain-specific tools (DOM snapshot, KPI oracle, assertion logger).
 - Initial screenshot or instructions to navigate to /dashboard.
5) Browser Worker executes AI-requested actions via Playwright and returns
 screenshots and optional telemetry on each tool call.
6) AI explores and validates the dashboard, producing structured findings.
7) Orchestrator stores artifacts and assembles a QAReport for the run.
8) CI/CD pipeline consumes QAReport, updates PR status, and/or notifies Slack.
---------------------------------------------------------------------
3. INTERNAL DATA MODELS (TYPE-SAFE CONTRACTS)
---------------------------------------------------------------------
These models are intended to be defined in TypeScript using Zod or io-ts, and
then exported as JSON Schemas for structured outputs and tool input/output
schemas.
3.1 TaskSpec
Represents a single high-level QA task to be performed by the AI agent.
Fields:
- id: string
 Unique identifier for the task.
- goal: string
 Human description of what the AI must achieve.
 Example: "Verify that the main dashboard shows correct KPI values and that
 they match the backend /api/kpi endpoint for today and for the last 7 days."
- route: string
 Route or URL the browser should navigate to after login.
 Example: "/dashboard".
- role: string
 Logical user role associated with the session.
 Example: "admin", "analyst".
- kpiSpec: object
 Specification of what KPI data should be validated. Examples:
 - type: "staticValues", values: { revenue: 12345, orders: 67 }
 - type: "apiEndpoint", url: "/api/kpi", params: { range: "today" }
- budgets: object
 Limits for the AI and tools:
 - maxToolCalls: number (max number of tool invocations allowed).
 - maxTimeMs: number (overall time budget for the task).
 - maxScreenshots: number (to constrain storage use).
3.2 Finding
A single issue, assertion, or observation produced by the AI during the run.
Fields:
- id: string
 Unique identifier for the finding.
- severity: string enum
 One of: "blocker", "critical", "major", "minor", "info".
- category: string enum
 Examples:
 - "functional"
 - "data-consistency"
 - "performance"
 - "a11y"
 - "reliability"
- assertion: string
 Short, human-readable sentence describing what was checked.
- expected: string
 Human-readable description of the expected condition.
- observed: string
 Human-readable description of what the AI actually observed.
- tolerance: string | null
 Optional description of acceptable deviation (e.g. "±1%").
- evidence: array of EvidenceRef
 Each EvidenceRef contains:
 - screenshotRef: string (URI or ID in object storage).
 - selector: string | null (CSS or test ID of element).
 - time: string (ISO datetime).
 - networkRequestId: string | null.
- suggested_fix: string
 Short suggestion, e.g. "Fetch total from same KPI endpoint as cards to
 avoid mismatch."
- confidence: number
 Confidence score between 0 and 1.
3.3 QAReport
Aggregate report for a single run (single TaskSpec or group).
Fields:
- id: string
- runId: string
- taskId: string
- startedAt: string (ISO datetime)
- finishedAt: string (ISO datetime)
- summary: string
 Short natural language summary of outcome.
- status: string enum
 One of: "passed", "failed", "inconclusive".
- findings: Finding[]
- kpiTable: array of objects containing:
 - label: string
 - expected: string
 - observed: string
 - status: "ok" | "mismatch" | "missing"
- links: object
 - traceUrl: string | null
 - screenshotsGalleryUrl: string | null
 - rawTranscriptUrl: string | null
- costs: object
 - tokensInput: number
 - tokensOutput: number
 - toolCalls: number
 - durationMs: number
---------------------------------------------------------------------
4. COMPUTER ADAPTER: AI ACTIONS TO PLAYWRIGHT
---------------------------------------------------------------------
The "Computer Adapter" is a local service inside the Browser Worker that:
- Receives generic computer actions from the AI model (via a tool call).
- Executes them on the active Playwright Page.
- Returns updated screenshots and any additional telemetry.
4.1 Tool: computer_action
Purpose:
Allow the AI to control the page via mouse, keyboard, and scrolling.
Input schema (conceptual):
- action: string enum
 One of: "move", "click", "double_click", "right_click",
 "type", "hotkey", "scroll", "hover", "drag".
- coords: object | null
 { x: number, y: number } in viewport coordinates.
- selector: string | null
 Optional selector hint; if present, the adapter can resolve it to a Playwright
 locator and compute coordinates from the element's bounding box.
- text: string | null
 Text to type (for action "type").
- hotkey: string | null
 Key or key combination (e.g. "Control+R").
- scroll: object | null
 { deltaX: number, deltaY: number } for scroll actions.
- wait: object | null
 Waiting strategy after the action:
 - type: "ms", value: number
 - type: "networkidle"
 - type: "selectorVisible", selector: string
Output schema (conceptual):
- screenshot: string
 Base64-encoded PNG of the current viewport.
- viewport: object
 { width: number, height: number }
- consoleEvents: array of objects (level, text, timestamp).
- networkEvents: array of objects (requestId, url, status, timestamp).
Implementation remarks:
- "move" maps to Playwright page.mouse.move.
- "click" maps to page.mouse.click (or locator.click if selector is used).
- "type" maps to page.keyboard.type.
- "hotkey" maps to page.keyboard.press.
- "scroll" maps to page.mouse.wheel or JavaScript scroll.
- Screenshot uses page.screenshot with a fixed viewport size for stability.
4.2 Tool: dom_snapshot
Purpose:
Allow the AI to read text and attributes of elements in a structured way
instead of relying on OCR from screenshots only.
Input schema:
- selector: string
- mode: string enum ("single", "all")
- attributes: string[]
 List of attributes to capture, e.g. ["data-testid", "aria-label"].
Output schema:
- elements: array of objects
 - selector: string
 - innerText: string
 - attributes: record<string, string | null>
 - boundingBox: { x, y, width, height } | null
4.3 Tool: kpi_oracle
Purpose:
Expose backend KPI data to the AI for validation.
Input schema:
- spec: object (same shape as TaskSpec.kpiSpec).
- context: object (e.g. date range, user role).
Output schema:
- data: record<string, number | string>
 Map of KPI keys to expected values.
4.4 Tool: assert
Purpose:
Provide a canonical way for the AI to record assertions and link them to
evidence that can later be aggregated into Findings and QAReport.
Input schema:
- severity: string
- category: string
- assertion: string
- expected: string
- observed: string
- tolerance: string | null
- evidence: array of EvidenceRef (see Finding)
- suggested_fix: string
- confidence: number
Output schema:
- assertionId: string (generated by backend)
---------------------------------------------------------------------
5. PLAYWRIGHT INTEGRATION (AUTH, TRACING, WORKER LIFECYCLE)
---------------------------------------------------------------------
5.1 Authentication via storageState
- A dedicated "setup" project runs an authentication flow once:
 1) Launches browser.
 2) Navigates to login page.
 3) Enters credentials for a sandbox test user.
 4) Waits for a stable post-login state (URL or UI element visible).
 5) Saves storageState to an auth file (per role).
- All test projects that require this authenticated state reference the
 storageState file, so that all tests start from an already logged-in
 context without repeating the login steps.
5.2 Browser Worker lifecycle
For each TaskSpec:
1) Create a browser context with storageState for the specified role.
2) Open a new page and navigate to base URL + TaskSpec.route.
3) Start Playwright tracing (screenshots, DOM snapshots, console, network).
4) Enter the AI computer-use loop (see section 4).
5) When loop finishes, stop tracing and save trace.zip and screenshots.
6) Close the context and browser (or return it to a pool if re-used).
5.3 Tracing and evidence
- Playwright trace is enabled at least for failing or retried runs.
- The object store keeps a mapping from runId to:
 - trace.zip path
 - screenshot files
 - logs
- EvidenceRef in findings and QAReport includes identifiers that reference
 these artifacts.
---------------------------------------------------------------------
6. OPENAI INTEGRATION (RESPONSES API + COMPUTER USE + STRUCTURED OUTPUTS)
---------------------------------------------------------------------
6.1 Usage Pattern
For MVP1, OpenAI can be used both as:
- A "computer use" controller that plans actions and uses the tools defined
 in section 4 to navigate and check the dashboard.
- A structured-output generator that returns a QAReport adhering strictly
 to the schemas defined in section 3.
6.2 Requests
- Endpoint: OpenAI Responses API (HTTP POST).
- Required parameters (conceptual):
 - model: a model compatible with computer use and structured outputs.
 - input: system instructions + user goal + TaskSpec context.
 - tools: definitions for computer_action, dom_snapshot, kpi_oracle,
 assert, and any other tools added later.
 - response_format: JSON Schema for QAReport (or intermediate schemas
 like Finding[]).
- Flow:
 1) Send an initial request with tools and response_format set.
 2) Receive a response that may contain tool calls.
 3) Execute tool calls via Browser Worker and internal services.
 4) Send subsequent requests including previous response state and tool
 results until the model returns a final QAReport matching the schema.
6.3 Response Format
- The final response is expected to contain:
 - A JSON object conforming exactly to QAReport schema.
 - No additional top-level keys (structured outputs guarantee adherence).
---------------------------------------------------------------------
7. ANTHROPIC CLAUDE INTEGRATION (MESSAGES API + TOOL USE + COMPUTER USE)
---------------------------------------------------------------------
7.1 Usage Pattern
Claude can be used in place of or alongside OpenAI as:
- A tool-using agent that calls:
 - Client tools: computer_action, dom_snapshot, kpi_oracle, assert.
 - Anthropic-defined client tools: computer use and text editor, if needed.
- A reasoning engine that synthesizes findings into the QAReport.
7.2 Requests
- Endpoint: Anthropic Messages API (HTTP POST).
- Key parameters (conceptual):
 - model: Claude Sonnet / Opus / other supported model.
 - messages: conversation including system, user, and tool results.
 - tools: definitions with name, description, and input_schema (JSON Schema).
 - Optional beta headers for computer use tool when enabling Claude's
 built-in computer use.
7.3 Tool Use Flow
- Claude emits a "tool_use" content block specifying which tool to call and
 a JSON input that matches the input_schema.
- The backend executes the corresponding client tool (e.g. computer_action)
 and responds with a "tool_result" content block including the output JSON.
- The loop continues until Claude returns a final message containing a
 QAReport (or an intermediate structure).
---------------------------------------------------------------------
8. MVP1 FUNCTIONAL REQUIREMENTS
---------------------------------------------------------------------
8.1 Supported Scenario: Dashboard Sanity
Given:
- A sandbox environment with test data.
- A user role (e.g. "analyst") and associated storageState file.
- A configured KPI endpoint (/api/kpi) that returns expected KPI values.
The system MUST:
1) Log in (via pre-saved storageState) and navigate to /dashboard.
2) Let the AI inspect the dashboard using computer_action and dom_snapshot.
3) Call kpi_oracle to fetch expected KPI values.
4) Compare visual values on the dashboard with expected KPIs for at least
 two ranges: today and last 7 days.
5) Detect and log mismatches beyond a configurable tolerance.
6) Produce at least:
 - One QAReport JSON document.
 - At least one screenshot of the dashboard.
 - A Playwright trace.zip for the run.
7) Expose the QAReport to CI/CD and/or notification systems.
8.2 Failure and Timeout Behavior
- If the AI fails to make progress (exceeds maxToolCalls or maxTimeMs):
 - The run status is set to "inconclusive".
 - A partial QAReport is still generated, with a finding describing the
 timeout or exhaustion of tool calls.
- If Playwright encounters an unhandled exception (navigation error,
 console error with a fatal pattern, etc.):
 - The Browser Worker records the error and stops the AI loop.
 - The QAReport contains a blocker finding describing the problem.
8.3 Configuration
The following values must be configurable per environment:
- Base URL of the application.
- Auth storageState path per role.
- KPI endpoint URL and default parameters.
- AI provider selection (OpenAI or Claude).
- Model names.
- Budgets (maxToolCalls, maxTimeMs, maxScreenshots).
- Tolerance thresholds for KPI mismatches.
---------------------------------------------------------------------
9. NON-FUNCTIONAL REQUIREMENTS
---------------------------------------------------------------------
9.1 Security
- All runs must be executed against non-production tenants or data.
- AI tools must not be allowed to perform destructive actions such as
 deleting data, performing payments, or changing credentials.
- Credentials are stored outside of code (e.g. environment variables or
 secret manager) and only used in the initial authentication setup.
- LLM transcripts must be stored and handled according to internal privacy
 and security policies (including potential redaction of PII).
9.2 Performance
- MVP1 target runtime for a single dashboard sanity run: under 3 minutes.
- The system should scale to running at least 5 such runs in parallel on
 CI infrastructure without resource starvation.
9.3 Observability
- Each run MUST have a unique runId and logs that can be correlated across:
 - Playwright logs and traces.
 - AI tool calls and responses.
 - QAReport storage.
- Metrics of interest:
 - Number of tool calls per run.
 - Duration of runs.
 - Frequency and types of findings.
 - Rate of timeouts and inconclusive runs.
---------------------------------------------------------------------
10. FUTURE EXTENSIONS (POST-MVP1)
---------------------------------------------------------------------
10.1 AI Test-Author
- A dedicated agent that, given a natural-language description of a flow,
 generates a Playwright E2E test, executes it, and iteratively refines it
 until it passes or a guardrail limit is reached.
- Tooling:
 - File system tools to write/edit test files.
 - Test runner tool to execute Playwright and return structured results.
 - Optional Git tool to open PRs with new or updated tests.
10.2 UX, Accessibility, and Performance
- Integrate axe-core for automated accessibility checks.
- Integrate Lighthouse CI for performance and best-practices scoring.
- Integrate Web Vitals or field telemetry where available.
10.3 Broader Coverage
- Support multiple roles and dashboards.
- Support different locales and devices (viewport sizes).
- Introduce nightly "deep sweeps" with larger budgets.


--- 
Assolutamente sì — è possibile **ibridare Playwright e “Computer Use / Operator‑style automation”** in due modi distinti:

1. **Esecutore “bring‑your‑own” (consigliato)**
   Il modello (OpenAI o Claude) emette azioni tipo `click(x,y)`, `type(text)`, `scroll`, ecc.; **le eseguite voi** nel vostro processo usando **Playwright** sulla **stessa pagina già autenticata** e restituite uno screenshot (più meta‑segnali) al modello. Questo è esattamente il paradigma previsto: *“il modello invia azioni che il tuo codice esegue in un ambiente browser e poi ritorni uno screenshot; il loop continua finché il task è completo”*. ([OpenAI Platform][1]) **[Reliability: 10]**
   Claude supporta lo stesso pattern: il **computer use tool** è un *client tool* che richiede un vostro esecutore (container/VM o browser automatizzato) che traduce le richieste (muovi/clicca/ digita/ screenshot) in operazioni reali e ritorna i risultati; il tutto in un **agent loop**. ([Claude Docs][2]) **[Reliability: 9]**

2. **Ambiente “hosted” separato**
   Se usate un desktop virtuale “hostato” dal lato tool (p.es. reference Docker per Claude), l’istanza del browser **non** è la stessa di Playwright, quindi **non condivide le sessioni**: dovreste riloggare o fornire token/magic‑link. È fattibile, ma perde il vantaggio del login unico. Claude documenta l’ambiente desktop virtuale; OpenAI documenta il ciclo azione→screenshot→azione. ([Claude Docs][2]) **[Reliability: 9, 10]**

**Conclusione pratica**: per il vostro caso (“login ripetitivo con Playwright, poi hand‑off all’AI per la dashboard”), usate l’**esecutore a casa vostra**:

* fate il **login una volta** con Playwright e salvate lo **storageState** (o autenticate nel `globalSetup`), poi **riaprite il contesto già autenticato** e cedete il controllo al “computer use” che in realtà è **mappato su Playwright**. ([Playwright][3]) **[Reliability: 10]**

---

## Due strategie che proponete — pro & contro

**A) Login con Playwright ➝ controllo all’AI (Operator/Computer Use) per convalida dashboard**
✔️ Nessun test E2E lungo da scrivere, l’AI esplora la UI.
✔️ Potete fornire **tool ausiliari** (es. “leggi DOM per selettore”, “chiama API KPI attesi”) per fare verifiche *non solo* via OCR da screenshot.
⚠️ Richiede un buon **budget/timeout** e guardrail anti‑drift; ottenere *consistenza* va progettato.

**B) L’AI scrive (e aggiusta) il test Playwright, poi lo eseguite sempre in modo deterministico**
✔️ Resultato **ripetibile** e veloce sulle run successive; “l’AI tocca una volta, poi vive come test E2E standard”.
✔️ Potete forzare **pattern POM/locator robusti** e chiedere alla stessa AI di auto‑riparare i selettori quando falliscono.
⚠️ Serve un “**sandbox di authoring**” (repo mirror/branch di lavoro, tools per `git patch` e per lanciare Playwright).
⚠️ Costo iniziale maggiore (ciclo autoregolante: *genera → esegui → leggi failure → patch → ripeti*).

💡 **Raccomandazione MVP1**: fate **A)** per sbloccare subito il valore (“dashboard sanity”), **ma** implementate già il percorso **B)** per i flussi stabili (login, navigazione, 2–3 journey core), così nel giro di pochi giorni cominciate a *sostituire* davvero gli E2E convenzionali.

---

# MVP1 – Specifica (TypeScript first)

**Obiettivo:** rimpiazzare la prima fascia di E2E convenzionali sulla *dashboard* con un ibrido **Playwright + Computer Use**, aggiungendo un **AI Test‑Author** che converte task naturali in test Playwright persistenti.

### 0) Componenti

* **Runner/Orchestrator** (Node/TS): lance i job, applica time‑budget e quote di token, raccoglie artefatti.
* **Browser Worker** (Playwright): crea **BrowserContext** con `storageState` autenticato, gestisce **Trace** e **screenshot**, espone un **adapter “computer use”** verso il modello.
  • Autenticazione riusabile: `storageState` generato in setup e ricaricato nei test. ([Playwright][3]) **[Reliability: 10]**
  • Tracing + video + network/console per post‑mortem. ([Playwright][4]) **[Reliability: 10]**
* **LLM Clients**

  * **OpenAI** per **Computer Use** e **Structured Outputs** (contract JSON aderente a schema). ([OpenAI Platform][1]) **[Reliability: 10, 10]**
  * **Anthropic/Claude** per **Tool Use** e, se volete, per **Computer Use** via il suo tool client‑side (beta header). ([Claude Docs][5]) **[Reliability: 9, 9]**
* **Artifact Store**: trace.zip, screenshot, log JSON di rete/console.
* **Report Builder**: normalizza risultati AI + asserzioni in **Finding**/ **QAReport** (JSON Schema).

---

## 1) Flusso end‑to‑end dell’MVP1

**Step 1 — Setup login riusabile (Playwright)**

* Eseguite un “setup project” che fa login **una volta** e salva `playwright/.auth/<role>.json`. In test, usate quel `storageState` per aprire pagine già autenticate. ([Playwright][3]) **[Reliability: 10]**

**Step 2 — Avvio run**
Input: URL app, ruolo, KPI attesi (o endpoint da cui calcolarli), lista “task naturali” (es: *“Verifica che la dashboard mostri: revenue = X, orders = Y, senza incongruenze con /api/kpi”*).

**Step 3 — Hand‑off all’AI (Operator/Computer Use → adapter Playwright)**

* Il Runner inizializza il Worker Playwright (pagina già loggata).
* L’LLM parte con **tools**:

  1. **computer** (azioni: `move/click/type/scroll/hotkey/hover/drag`, `screenshot`, `wait`) — **eseguite** via Playwright (mouse/keyboard) e `page.screenshot` (dimensioni controllate es. 1366×768). ([OpenAI Platform][1]) **[Reliability: 10]**
  2. **dom_snapshot** *(client tool custom)*: dato un selettore/role/test‑id, ritorna `innerText`, `boundingBox`, `attributes`, `aria*`.
  3. **kpi_oracle** *(client tool custom)*: ritorna KPI attesi dall’API interna, con timestamp/filtro/utente.
  4. **assert** *(client tool custom)*: registra un’asserzione tipata (severity, expected, observed, evidence).
* Il **loop azioni** continua finché il modello chiude con un **result strutturato** (“dashboard ok / issues…”).

**Step 4 — Raccolta artefatti**

* Salva: `trace.zip`, screenshot step‑by‑step, log console/network, JSON del **run** e della **valutazione AI**. Traces utili per CI e debugging. ([Playwright][4]) **[Reliability: 10]**

**Step 5 — Report finale (Structured Outputs)**

* L’LLM produce un **QAReport** aderente a JSON Schema: riepilogo, esiti, elenco asserzioni, mismatch con evidenze (selector, screenshot, network request id), consigli fix. **Structured Outputs** garantisce aderenza a schema (Zod→JSON Schema in TS). ([OpenAI Platform][6]) **[Reliability: 10]**

---

## 2) Pattern chiave (con API e contratti)

### 2.1 Adapter “Computer Use ↔ Playwright”

**Contratto azione (semplificato)**

* `action`: uno di `move`, `click`, `double_click`, `right_click`, `type`, `hotkey`, `scroll`, `hover`, `drag`
* `coords`: `{ x, y }` riferiti alla viewport corrente **o** `selector` (se il modello sceglie via descrizione, l’adapter può risolvere in coordinate/locator)
* `text`: per `type`
* `wait`: attesa post‑azione (ms o condizione: `networkidle`, `selectorVisible`, ecc.)
* **Return**: `{ screenshot: <png base64>, events: [...], console: [...], network: [...] }`

**Implementazione**:

* Mappate su **Playwright**: `page.mouse.move`, `page.mouse.click`, `page.keyboard.type`, `page.keyboard.press`, `page.mouse.wheel`; screenshot via `page.screenshot({ fullPage: false })`. (API Playwright documentate; evitiamo snippet qui).
* Per robustezza: consentite **due modalità di target**:

  1. **coordinate** (pure) — necessarie per allinearsi al paradigma “computer use”;
  2. **locator assistito** (quando disponibile) — l’adapter trasforma una descrizione in un locator: *role/name/test‑id* → coordinate.

**Riferimenti ufficiali**:

* **OpenAI – Computer Use guide** (action loop eseguito dal vostro codice). ([OpenAI Platform][1]) **[Reliability: 10]**
* **Claude – Computer Use tool** (client tool con agent loop e reference implementation). ([Claude Docs][2]) **[Reliability: 9]**

### 2.2 Login riusabile con Playwright

* **storageState** generato in un “setup project” e riutilizzato in tutti i test per partire già autenticati (con caveat su scadenze/ruoli). ([Playwright][3]) **[Reliability: 10]**

### 2.3 Tracing/telemetria

* **Trace Viewer** per azioni, console, network e DOM snapshot; su CI abilitate `on-first-retry` o `retain-on-failure`. ([Playwright][4]) **[Reliability: 10]**

### 2.4 Structured Outputs (OpenAI)

* API di **Structured Outputs**: passate uno **JSON Schema** (derivato da Zod) e ottenete **output garantito** aderente allo schema (perfetto per `Finding[]`, `QAReport`). ([OpenAI Platform][6]) **[Reliability: 10]**

### 2.5 Tool Use (Claude)

* **Client tools** (vostri) vs **server tools** (es. web search/fetch gestiti da Anthropic). Il **computer use** è un **client tool** con versione tipata (`computer_20250124`) e richiede **beta header**. ([Claude Docs][5]) **[Reliability: 9, 9]**

---

## 3) Specifiche delle API che userete (senza codice, ma precise)

### 3.1 OpenAI – Responses API (per Computer Use & Structured Outputs)

* **Endpoint**: `POST /v1/responses`
* **Campi chiave**:

  * `model`: modello compatibile con Computer Use / Structured Outputs (verificate matricola e versione)
  * `input`: istruzioni/goal del task (p.es. “Conferma che KPI A=…, B=… su /dashboard”).
  * `tools`: includere **tool computer use** (con nome e descrizione delle azioni supportate dal vostro adapter) e **tool custom** (`dom_snapshot`, `kpi_oracle`, `assert`).
  * `response_format`: **json_schema** con lo schema del **QAReport** per l’output finale.
  * **Ciclo**: la risposta del modello conterrà *tool calls* (azioni). Voi eseguite, restituite `tool_output` e iterate fino a `finish_reason = "stop"` (o equivalente).
* **Riferimenti**:

  * **Computer Use** (guida ufficiale). ([OpenAI Platform][1]) **[Reliability: 10]**
  * **Structured Outputs** (schema con Zod/TS). ([OpenAI Platform][6]) **[Reliability: 10]**
  * **Responses API** (migrazione e reference). ([OpenAI Platform][7]) **[Reliability: 9, 10]**
  * **Sample “CUA”** end‑to‑end (esecutore di azioni + screenshot). ([GitHub][8]) **[Reliability: 8]**

### 3.2 OpenAI – Agents SDK (TypeScript) (opzionale per orchestrazione agenti)

* **Concetti**: *Agent*, *Handoff*, *Guardrails*, *Tools*, *Tracing*.
* **Uso**: definire agenti e tool TS in modo tipato; tracing integrato; parallelizzazione e handoff multipli agenti. ([OpenAI GitHub][9]) **[Reliability: 9, 9]**

### 3.3 Anthropic – Messages API + Tool Use + Computer Use

* **Endpoint**: `POST https://api.anthropic.com/v1/messages`
* **Tool Use**: dichiarate `tools: [...]` con `input_schema` per i vostri tool client.
* **Computer Use**: aggiungete tool `type: "computer_20250124"` e inviate l’header beta `betas: ["computer-use-2025-01-24"]`; eseguite le azioni nel vostro ambiente (adapter Playwright o container desktop). ([Claude Docs][2]) **[Reliability: 9]**
* **Panoramica Tool Use** (client/server tools e flusso `tool_use` → `tool_result`). ([Claude Docs][5]) **[Reliability: 9]**

### 3.4 Playwright – Browser Interaction API (che userà l’adapter)

* **Autenticazione riusabile**: `storageState` (setup project / per worker). ([Playwright][3]) **[Reliability: 10]**
* **Trace/Video/Network/Console**: registrazione e ispezione con Trace Viewer. ([Playwright][4]) **[Reliability: 10]**
* **CDP events** (se volete hook basso livello su rete/console): Chrome DevTools Protocol reference. ([Chromium Git Repositories][10]) **[Reliability: 8]**

---

## 4) Task & contratti (senza codice, modelli di payload)

### 4.1 `TaskSpec` (MVP)

* `id`, `goal`: testo breve (“Verifica dashboard KPI vs API”).
* `route`: URL iniziale (es. `/dashboard`).
* `role`: utente/ambiente (admin, analyst…).
* `kpiSpec`: elenco KPI attesi o endpoint/parametri per calcolarli.
* `budgets`: `{ maxToolCalls, maxTimeMs, maxScreenshots }`.

### 4.2 `Finding` (singola evidenza/asserzione)

* `severity`: blocker/critical/major/minor
* `category`: functional | data‑consistency | perf | a11y | reliability
* `assertion`: descrizione sintetica
* `expected` / `observed` / `tolerance`
* `evidence`: `[ { screenshotRef, selector, time, networkReqId? } ]`
* `suggested_fix`: testo breve
* `confidence`: 0–1

### 4.3 `QAReport`

* `summary`, `runMeta`, `findings[]`, `kpiTable`, `links` (trace.zip, report HTML), `costs` (token/time).

> **Nota**: per OpenAI usate **Structured Outputs** (Zod→JSON Schema) per vincolare `Finding`/`QAReport`; per Claude modellate gli stessi schemi come `input_schema`/`tool_result` coerenti. ([OpenAI Platform][6]) **[Reliability: 10, 9]**

---

## 5) “Task Naturali ➝ Lavoro dell’AI”

**Prompt operativo (alto livello)**

* *Contesto*: screenshot corrente + tool disponibili + ruoli (lettura DOM via tool, lettura KPI attesi via API).
* *Istruzioni*: “Conferma che i KPI nella dashboard corrispondano al payload `kpi_oracle`, controlla incongruenze (somma carte ≠ grafico, subtotali…), applica i filtri standard (7d/30d) e ripeti. Riporta `Finding[]` strutturato; allega evidenze (screenshot/selector). Non usare input sensibili; chiedi conferma per azioni distruttive.”
* *Guardrail*: limiti su domini (allowlist), su azioni (es. no delete), e budget. (Entrambi i provider raccomandano isolamento e HITL su azioni rischiose). ([Claude Docs][2]) **[Reliability: 9]**

---

## 6) AI Test‑Author (far scrivere i test Playwright all’agente)

**Idea**: un agente **“Author”** riceve “task naturali”, genera un **test Playwright** (locator robusti, POM opzionale), lo esegue in sandbox, legge i fallimenti, **autogenera una patch** finché il test passa o fallisce con motivazione.
**Tool lato agente**:

* `fs_write_patch` (scrive file/patch in un repo di lavoro)
* `run_tests` (lancia `npx playwright test <pattern>`, ritorna report JSON e path trace)
* `lint_format` (pre‑commit quality)
* `git_propose` (apre PR/branch, opzionale)

**Vantaggi**

* Nel giro di 1–2 cicli disponete di un test deterministico che **sostituisce** la parte di Computer Use dove non serve esplorazione.
  **Rischi**
* Sandboxing forte, pin delle versioni, nessun segreto in chiaro; rate‑limit sulle iterazioni.

> Potete orchestrarlo comodamente con **OpenAI Agents SDK** (tools tipati, handoff verso un “Runner” che esegue Playwright) oppure con **Claude Tool Use** (client tools `fs/run`). ([OpenAI GitHub][9]) **[Reliability: 9, 9]**

---

## 7) Dettagli operativi MVP1

### 7.1 Matrice ambienti

* **Browser**: Chromium (default), viewport fissa (es. 1366×768) per allineare coordinate.
* **Account**: 1 stato condiviso per test che non alterano lo stato server; altrimenti 1 per worker. ([Playwright][3]) **[Reliability: 10]**

### 7.2 Artefatti obbligatori

* `trace.zip` per ogni failure o retry; screenshot step‑by‑step dell’adapter; log console e rete. ([Playwright][4]) **[Reliability: 10]**

### 7.3 Sicurezza e governance

* **Isolamento**: eseguite l’adapter in container senza credenziali di produzione; allowlist dei domini.
* **Claude Computer Use** (se usato con desktop virtuale): Anthropic raccomanda VM/container dedicati e HITL per azioni sensibili. ([Claude Docs][2]) **[Reliability: 9]**

### 7.4 Osservabilità & quote

* Log di ogni tool‑call (input/output, durata, screenshot id), conteggio token/costi, timeouts per step e per run.

---

## 8) Estensioni rapide (post‑MVP)

* **A11y**: `@axe-core/playwright` integrato nel Worker e normalizzato in `Finding[]`. ([npm][11]) **[Reliability: 8, 9]**
* **Performance**: Lighthouse CI su `/dashboard` con budget e report in PR. ([GitHub][12]) **[Reliability: 9, 8]**
* **Hook CDP** per anomalie rete/console severe durante l’esplorazione AI. ([Chromium Git Repositories][10]) **[Reliability: 8]**

---

## 9) FAQ tecniche

**Possiamo davvero “agganciare” Computer Use a Playwright già loggato?**
Sì, se usate il **pattern esecutore locale**: le *computer actions* vengono **eseguite dal vostro codice** (Playwright) nella stessa `Page` già autenticata; restituite screenshot al modello. È l’uso previsto sia da OpenAI (tool computer use = azioni che voi eseguite) sia da Claude (client tool con loop). ([OpenAI Platform][1]) **[Reliability: 10, 9]**

**Anthropic fa “computer use”?**
Sì, come **client tool** in beta (`computer_20250124`, con header beta); richiede un vostro esecutore (VM/container/browser) per mouse/tastiera/screenshot. ([Claude Docs][2]) **[Reliability: 9]**

**Hosted desktop vs Playwright come esecutore**

* Hosted: separa il browser (no session sharing); utile per task desktop generici.
* Playwright esecutore: stesso contesto e sessione; **consigliato** per QA web.

---

# Allegato – Riferimenti ufficiali (con indice di affidabilità)

* **OpenAI — Computer Use** (guida): *azione→esecuzione vostra→screenshot→loop*. ([OpenAI Platform][1]) **[Reliability: 10]**
* **OpenAI — Structured Outputs** (JSON Schema/Zod): output garantiti. ([OpenAI Platform][6]) **[Reliability: 10]**
* **OpenAI — Responses API** (migrazione & reference). ([OpenAI Platform][7]) **[Reliability: 9, 10]**
* **OpenAI — Agents SDK (TS)** (docs & repo). ([OpenAI GitHub][9]) **[Reliability: 9, 9]**
* **Claude — Tool Use overview** (client vs server tools). ([Claude Docs][5]) **[Reliability: 9]**
* **Claude — Computer Use tool** (beta header, agent loop, reference impl). ([Claude Docs][2]) **[Reliability: 9]**
* **Playwright — Authentication (storageState)**. ([Playwright][3]) **[Reliability: 10]**
* **Playwright — Trace Viewer** (tracing/CI best practices). ([Playwright][4]) **[Reliability: 10]**
* **Chrome DevTools Protocol** (CDP reference). ([Chromium Git Repositories][10]) **[Reliability: 8]**
* **axe‑core / Playwright** (npm) + guida Playwright A11y. ([npm][11]) **[Reliability: 8, 9]**
* **Lighthouse CI** (getting started & repo). ([GitHub][12]) **[Reliability: 9, 8]**
* **Azure OpenAI — Computer Use** (reference alternativo). ([Microsoft Learn][13]) **[Reliability: 9]**

---

## Proposta di planning (MVP1)

**Settimana 1**

* Implementare `globalSetup` Playwright per login + `storageState`.
* Implementare **adapter computer use ↔ Playwright** (subset: `click`, `type`, `scroll`, `screenshot`, `wait`).
* Definire Zod/JSON Schema per `Finding` e `QAReport` (per OpenAI Structured Outputs).
* Strutturare `kpi_oracle` e `dom_snapshot` (client tools).

**Settimana 2**

* Completare task “Dashboard Sanity”:

  * Verifica 4–6 KPI vs API, 2 range di date, 1 filtro categoria.
  * 10–15 asserzioni tipate con evidenze.
* Abilitare trace su retry/failed.
* Integrare notifica PR/Slack con top findings + link a trace.

**Settimana 3**

* Introdurre **AI Test‑Author** per 2 journey stabili.
* Pipeline: `plan → generate test → run → patch` con guardrail e sandbox.
* Stabilire baseline giornaliera e budget.

---

Se volete, posso aggiungere **un pacchetto di “contratti API”** (solo tabelle di campi/valori e JSON Schema dei risultati) per consegna al dev team—senza includere codice—coprendo:

* `TaskSpec`, `Finding`, `QAReport` (Zod→schema)
* spec del **computer tool** (azioni & payload screenshot) lato OpenAI **e** lato Claude
* mappature Playwright per ogni azione (nome API / evento / screenshot richiesto)

Così potete partire subito con login→hand‑off→verifica KPI, e in parallelo attivare il **Test‑Author** per creare i primi E2E deterministici che rimpiazzano davvero la suite convenzionale.

[1]: https://platform.openai.com/docs/guides/tools-computer-use?utm_source=chatgpt.com "Computer use - OpenAI API"
[2]: https://docs.claude.com/en/docs/agents-and-tools/tool-use/computer-use-tool "Computer use tool - Claude Docs"
[3]: https://playwright.dev/docs/auth "Authentication | Playwright"
[4]: https://playwright.dev/docs/trace-viewer "Trace viewer | Playwright"
[5]: https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview "Tool use with Claude - Claude Docs"
[6]: https://platform.openai.com/docs/guides/structured-outputs?utm_source=chatgpt.com "Structured model outputs - OpenAI API"
[7]: https://platform.openai.com/docs/guides/migrate-to-responses?utm_source=chatgpt.com "Migrate to the Responses API - OpenAI API"
[8]: https://github.com/openai/openai-cua-sample-app?utm_source=chatgpt.com "GitHub - openai/openai-cua-sample-app: Learn how to use CUA (our ..."
[9]: https://openai.github.io/openai-agents-js/ "OpenAI Agents SDK TypeScript | OpenAI Agents SDK"
[10]: https://chromium.googlesource.com/devtools/devtools-frontend/%2B/main/docs/devtools-protocol.md?utm_source=chatgpt.com "Chromium DevTools Docs - Chrome DevTools Protocol"
[11]: https://www.npmjs.com/package/%40axe-core/playwright?utm_source=chatgpt.com "@axe-core/playwright - npm"
[12]: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md?utm_source=chatgpt.com "lighthouse-ci/docs/getting-started.md at main - GitHub"
[13]: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/computer-use?utm_source=chatgpt.com "Computer Use (preview) in Azure OpenAI - Azure OpenAI"
