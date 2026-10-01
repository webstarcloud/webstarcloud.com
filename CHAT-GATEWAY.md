# Gobwen serving contract

Production uses the persistent `davesbrain-chat-prod` stack in AWS eu-west-1,
implemented in `../davesbrain/model-lambda`. The three model functions use 4096 MB,
ARM64 CPUs, one concurrent request each and no provisioned concurrency. A 256 MB
Node.js gateway verifies Cognito access tokens and streams the selected model.
The public edge is a Cognito-authorized API Gateway REST streaming route; the
former public Function URL has been removed.
Development keeps `chatEndpoint` empty; the disconnected preview explains the
limitation and links to the connected live website. There is no fallback to the older Dave's
Brain model. No AWS credentials or shared chat secrets belong in the Angular build.

## Model aliases

| UI choice | Deployed model | Serving behavior |
| --- | --- | --- |
| `gobwen-flash` | `Qwen/Qwen3.5-0.8B` | Thinking disabled in the model's chat template. |
| `gobwen-think` | Same checkpoint | Thinking enabled; reasoning budget 128, total output cap 512. |
| `goblin` | Goblin Edge 250M, step 61,177 / 2B targets | Experimental base continuation, latest prompt only, 64 output tokens. |

Flash allows 128 output tokens. Qwen uses Q8_0 with revision
`2fc06364715b967f1860aea9cf38778875588b17`. Goblin's checkpoint SHA starts
`5a25f06db815ff28`; full provenance is recorded in the backend manifests and results.

The GRPO-Math checkpoint is an evaluation candidate, not a selected upgrade.
Model cards and caveats are linked in `/research/models`. Pin revisions, tokenizer,
chat template, runtime, quantization and context/output limits before measuring.

## Request and guard boundary

`POST` the configured endpoint with `Content-Type: application/json` and
`Accept: text/event-stream` and `Authorization: Bearer <Cognito access token>`:

```json
{
  "model": "gobwen-flash",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true,
  "conversationId": "12345678-1234-4234-8234-123456789abc",
  "captureConversation": false
}
```

Cookies are omitted. The gateway verifies signature, expiry, issuer, client, access
token type and `openid` scope. Only `https://davidwebstar.com` is allowed by CORS.
An atomic DynamoDB transaction enforces 20 requests per user per UTC day, 100
shared requests per UTC day, five per user per minute and ten globally per minute.
API Gateway additionally uses best-effort throttling at one request/second with
burst three. Accepted attempts count
even if subsequently blocked, busy, stopped or failed. These usage limits are not
an AWS billing cap; rejected edge requests still incur API Gateway costs.
Payments and donor entitlements remain future work.

`conversationId` is a browser-generated UUID; the server hashes it with the verified
user subject for trace grouping. `captureConversation` must be a boolean, defaults
false, and requires an ID when true. Consent enables LangWatch and private archive
message/answer capture, marked unreviewed for training. Opt-out traces contain
metadata only. Credentials and raw reasoning are never intentionally recorded.

The frontend displays a notice after sign-in and blocks sending until the visitor
chooses. **Agree and continue** turns on personal memory, Python and research
recording together; the alternative keeps all three optional features off.
The notice explains that research capture can include messages, answers and
retrieved notes in LangWatch and a private archive. Records require review before
training, and redaction is imperfect. Each setting remains editable.

Acknowledgement and preferences are bound to the Cognito subject in runtime
memory, persist across navigation/new/reopened chats, and reset on definitive
sign-out, account switch or reload. Browser chat history is cleared on definitive
sign-out/account switch. A session's recording preference cannot be inherited by
another account. These client defaults do not change the backend's missing-flag
defaults or shared quotas. Input protection, calculator and automatic search
remain independent of optional-feature acknowledgement.

The sign-in notice and privacy details disclose TypeSafe's Jev decision stages.
These core stages may receive the latest protected question plus bounded public
source excerpts and a draft answer for intent routing, source ranking and answer
support checking. Source-backed drafts use only that question and public excerpts;
saved personal-memory text and earlier conversation are excluded from generation
on this path and from those decision calls. They run independently of optional memory, sandbox and research
recording settings. Provider credentials remain server-side.

Turning research recording on in a chat with earlier messages starts a fresh
chat and conversation ID. Earlier turns remain available in the previous chat
during the visit; they are not added to the newly recorded request. The draft and
model choice are preserved. Turning recording off still stops new captures and
does not delete existing records.

Each local turn remembers whether content capture was requested when it was
sent; this is consent provenance, not confirmation of a successful save. An older
chat can be reopened for reading. If recording is on and its history contains an
opted-out turn or unknown provenance, the UI explains that the next message will
start a fresh chat before constructing its request context. Chats whose turns
were all sent with recording consent can continue normally. This boundary also
applies after navigation and does not override account-bound preferences.

Optional strict boolean `useMemory` and `useSandbox` fields default false. The
browser sends only enabled flags after acknowledgement; provider identity is derived from the verified
subject in the gateway. The Qwen assistant offers explicit `Remember: ...`,
`Show saved memories`, `Forget memory: <id>` and `Run Python: ...` routes. Ordinary
opted-in memory queries retrieve up to three checked notes as untrusted context.
Memory management suppresses content capture for the whole retained exchange;
`done.recording.captureSuppressed: "memory_management"` explains this in the UI.
Provider credentials, free-only activation gates and atomic shared budgets stay
server-side. Details and limits live in `../davesbrain/model-lambda/PROVIDERS.md`.

Both gateway and model validate roles and input limits: 32 KiB body, 2,000 Unicode
code points per message, 6,000 total, and at most 21 alternating user/assistant
messages. The client retains whole recent exchanges within those limits. Each
model function runs the real guard over supplied input before inference.

The model worker runs `llm-input-hardening` 3.0.0 with `strict_exec` and generates
from the checked/sanitized content. It checks the full relevant
input boundary, including supplied history. Never trust a client-reported guard
decision. A receipt documents server enforcement; client receipt validation alone
does not secure an endpoint or prevent arbitrary prompt injection.
User input keeps strict enforcement. A flagged assistant history message is
removed along with the context prefix through that exchange; it is never treated
as trusted because the browser labels it `assistant`. Optional
`hardening.history_pairs_dropped` (integer 0..10) makes the UI explain lost context
without blaming the current question. Later safe exchanges remain available.

## Stream

Use UTF-8 Server-Sent Events, JSON data, and a blank line after every event.
Comment heartbeats (`: ping`) are allowed. Disable proxy buffering. Begin an
allowed request with `meta`, emitted after guarding and before model invocation:

```text
event: meta
data: {"model":"gobwen-flash","servedModel":"Qwen/Qwen3.5-0.8B@PINNED_REVISION","startState":"warm","hardening":{"enabled":true,"changed":false,"blocked":false,"model_called":false,"library_version":"3.0.0","policy":"strict_exec","action":"allow","reason_codes":[]}}

event: delta
data: {"channel":"answer","text":"Hello!"}

event: done
data: {"outputTokens":3,"decodeMs":50}

```

Think may send `delta` with `channel: "reasoning"`; the UI puts this in an
expandable section. `servedModel` must identify the actual pinned artifact;
`model` must match the requested alias. `startState` is `cold`, `warm` or `unknown`
according to worker lifecycle evidence, not whether this is the visitor's first
message. Send `unknown` if the gateway cannot determine this.

After `meta`, an optional `sources` event contains up to three `{id,title,url}`
records. IDs must be sequential and URLs HTTPS without embedded credentials.
Optional `kind` is `indexed`, `web` or `repository`; indexed sources must include a valid
`indexedAt` date, shown with its year as an index snapshot, not publication or
freshness evidence. Repository sources are accepted only for an explicit review;
their GitHub URLs must pin the fixed website repository to the review's revision.
An optional 40-character `revision` must agree with the URL. A selected-page index is tried
before the private SearXNG service's configured whole-web engines.
Search runs automatically for recognized factual questions. Qwen receives checked
source excerpts as untrusted data and produces a short grounded answer; the UI
adds validated links separately. Calculator and explicit provider-management
answers bypass inference with `startState: "unknown"`, zero output tokens and null
decode timing. Optional typed `tool` events carry only name, execution status and
an allowed source route; they never include private memories or executed code.
A completed `source_lookup` may include a strict boolean `cached` receipt. The UI
labels a confirmed cache hit without implying a new whole-web request. Ordinary
requests may include `done.memoryRecall: off|skipped_irrelevant|used|unavailable`.
Skipped recall adds an explanation without invented memory tool events; executed
recall must agree with real terminal lookup receipts and per-request consent.
`done.recording` carries `langwatch: sent|unavailable` and
`archive: saved|off|unavailable`. The UI reports recording failures when opted in.

The Qwen assistant may emit `intent_routing`, `source_ranking` and `answer_check`
tool receipts, with the same `running` then `complete|failed|unavailable` sequence.
The client rejects extra fields such as scores, confidence or verdicts, and rejects
these stages for Goblin. A completed check says that the operation ran; it does
not certify factual accuracy. Source-backed drafts are buffered on the server
until their answer support check finishes. Unsupported or insufficiently supported
drafts are replaced with a fixed abstention. Once released, answer deltas render
immediately; first-answer latency includes buffering and support checking. The
client rejects answer deltas received while a confirmed support check is running.

### Guided public repository inspection

The discoverable **Review the website repository** starter appears only with a
connected chat endpoint and `environment.repositoryReviewEnabled`. This flag
defaults off until reviewer quality and live route checks pass. Filling a starter
only prepares a draft; sending still requires normal sign-in and acknowledgement.
Explicit `Review repository` and `Review the website repository`, optionally
followed by `: <focus>` of up to 1,500 characters, use a separate coder worker with Think or Flash; they do
not add a model-menu option. Goblin stays a text-continuation experiment.
The command allows case/whitespace variations, optional `the`/`website`, and a
final period or exclamation mark, matching the gateway and worker parser.

The first version inspects bounded excerpts from the public
`webstarcloud/webstarcloud.com` repository. The model selects concrete structural
observations from server-defined checks; freeform bug diagnosis is disabled.
Only the latest instruction reaches that worker, without previous chat history,
personal memories or sandbox credentials. There are no GitHub writes or test
executions. A further shared daily allowance admits three inspections; exhausted
reviews return `review_daily_limit` and accurate midnight-UTC guidance.

Real `repository_read` and `review_check` events preserve running/terminal order.
`meta.model` matches the selected Think/Flash alias, while `servedModel` identifies
the actual coder. `done.review` must carry the fixed repository, `mode: guided`,
an immutable 40-character revision, up to three unique read paths, `partial: true`,
`testsRun: false`, zero to three observations in `findingsReported`, zero to two
attempts, and `status: checked|invalid`. Checked means selection and citations
were validated, not that a defect was proved. Invalid selection requires a failed
model-prioritization receipt; fixed server checks can still report up to three
structural observations. The UI labels this guided fallback as model prioritization
unavailable, preserves the observations, labels scope and links
the revision; it rejects unconfirmed reviews or mismatched source revisions.
Zero attempts means no applicable structural observations and no model call,
with real repository receipts and zero native tokens; model-backed inspections
must report their actual attempts. Native token totals include all attempts.
Backend bounds and provenance are in
[`REPOSITORY_REVIEW.md`](../davesbrain/model-lambda/REPOSITORY_REVIEW.md).

Every new turn has collapsed **Request details** with at most 24 milestones:
request start, received protection/tool/source receipts, first output, first
answer, and completion or interruption. These are monotonic browser observations,
including transport time; they are not invented server spans or token counts.
They remain with the local chat during the visit and do not require recording.

Instead of `meta`, a blocked request sends one terminal `blocked` event with an
enabled hardening receipt, `blocked: true` and `model_called: false`. It must not
invoke inference. A gateway failure sends `event: error` with JSON data, then
closes. The UI deliberately shows a generic error instead of server internals.

An output-loop failure uses `error.code: "repetition"`. The UI explains that
generation stopped and the partial answer may be wrong. It never marks that
turn complete or includes it in subsequent model context. Other error codes
keep the generic message; arbitrary server error text is never displayed.

Only `done` completes a response. Unexpected EOF marks it incomplete. Stop,
navigation away and a 150-second request deadline cancel the client connection.
The same deadline bounds token retrieval and stream reads, even if an underlying
SDK or transport ignores cancellation. Reader cleanup is best effort and waits
at most one additional second. A caller's Stop remains a stopped turn.

Token failures show sign-in guidance. Fetch failures and interrupted reads show
fixed connection messages rather than browser/SDK exception text. Partial replies
remain incomplete and are excluded from subsequent context. The client never
automatically replays a POST. **Edit & retry** restores the prompt for a deliberate
new submission. If an enabled `Remember:`, `Forget memory:` or `Run Python:`
request loses its response, the UI explains that the operation may already have
run; a received complete tool receipt is retained as confirmation. Check saved
memories before repeating a memory change. Repeating Python starts a new execution.

Lambda can keep running after a disconnect: the generation deadline is 75 seconds,
with a 120-second model Lambda timeout and 130-second gateway timeout. Avoid logging message text
or private model reasoning; log request IDs, decision codes and timing instead.

## Four metrics

- **Cold TTFT:** client submit to first nonempty output delta, when the server
  confirms a cold worker. Includes guard, network, loading, queue and prefill.
- **Warm TTFT:** same measurement for a confirmed warm worker.
- **Tokens/sec:** native engine decode rate when supplied; otherwise
  `(outputTokens - 1) / (decodeMs / 1000)`. The backend counts
  actual generated tokens (including reasoning) and reports the interval between
  its first and last generated token. Network chunks are not token counts.
- **Total response time:** client submit to receipt of `done`.

For Think, TTFT includes visible reasoning output; `firstAnswerMs` separately
measures submission to first visible answer. Source-backed drafts are buffered
until answer support checking finishes, so their first visible output includes
that delay. Native output token counts and decode rate measure the original model
generation, even when the public response becomes a fixed abstention. They do not
count the displayed abstention or describe its delivery speed. `decodeMs: null`,
fewer than two tokens, or a zero duration produces an unavailable decode rate.
The performance panel shows the latest measured turn per selected model, keeps
cold/warm separate, and leaves missing measurements blank. It is not an aggregate
benchmark. Session history and measurements live in memory and disappear on reload.
A sign-in draft is saved in tab-scoped session storage for at most 10 minutes and
removed when restored; it is never submitted automatically after login.

For reproducible comparisons, record hardware, runtime, revision, precision,
prompt/context/output lengths, mode, concurrency and lifecycle state. Collect
repeated cold starts and warm requests and publish p50/p95 with sample counts.
Initial single-pair AWS measurements are published at `/research/performance`.
They are not p50/p95 or a latency guarantee; they exclude the new gateway/browser.

## Checks before connecting

### Usage and compute comparison

Optional `done` fields: `inputTokens` (actual tokenizer count, or null when
unavailable), `modelCalled` (boolean), `modelDurationMs` (model execution only,
excluding search and trace delivery), and `modelBypass` (`calculator`,
`source_excerpts`, `site_profile`, `memory_lookup`, `memory_write`, `python`, or `clarification`). A bypass requires `modelCalled: false`
and zero input/output tokens and model duration. Failed lookups may skip the
model but do not carry a successful bypass reason or earn a savings badge.
Old servers without these fields still render; missing counts are not guessed.

The footer shows actual input + output tokens. A compact dollar icon and cumulative
estimate compare completed website requests against an unnamed frontier API at
US$3 per million input tokens and US$15 per million output tokens (assumption
dated 30 September 2026), minus measured model-worker compute. A public read-only
`GET /v1/cost-summary` returns metadata-only durable totals; it never exposes
account IDs or prompts. Request IDs deduplicate writes and completion is sent
after recording the aggregate. Missing usage remains unpriced, and bypasses do
not invent counterfactual model tokens. Headline and detail amounts retain meaningful
sub-cent digits down to the ledger's nanodollar resolution; larger amounts round
to cents. A true zero remains `$0.00`. Details also show priced/unpriced counts
and assumptions. Gateway, tools, search, TypeSafe decision API fees,
storage and other unmeasured costs are excluded, so this is not net service
savings or a claim of equivalent answer quality.

Price source: [AWS regional price list](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/current/eu-west-1/index.json),
SKU `KXNSA7NBRHBHXXPS`, usage type `EU-Lambda-GB-Second-ARM`, first tier.

### Release checks

Run the frontend tests, then exercise the actual gateway with ordinary, blocked,
multi-turn and cancelled inputs. Confirm that blocked inputs never reach the
model, the served revision matches the alias, deltas render immediately, and
usage/timings agree with server logs. Only then set `chatEndpoint` and rebuild.
