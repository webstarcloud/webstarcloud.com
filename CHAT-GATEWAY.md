# Gobwen serving contract

Production uses the persistent `davesbrain-chat-prod` stack in AWS eu-west-1,
implemented in `../davesbrain/model-lambda`. The three model functions use 4096 MB,
ARM64 CPUs, one concurrent request each and no provisioned concurrency. A 256 MB
Node.js gateway verifies Cognito access tokens and streams the selected model.
The public edge is a Cognito-authorized API Gateway REST streaming route; the
former public Function URL has been removed.
Development keeps `chatEndpoint` empty. There is no fallback to the older Dave's
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

Both gateway and model validate roles and input limits: 32 KiB body, 2,000 Unicode
code points per message, 6,000 total, and at most 21 alternating user/assistant
messages. The client retains whole recent exchanges within those limits. Each
model function runs the real guard over supplied input before inference.

The model worker runs `llm-input-hardening` 3.0.0 with `strict_exec` and generates
from the checked/sanitized content. It checks the full relevant
input boundary, including supplied history. Never trust a client-reported guard
decision. A receipt documents server enforcement; client receipt validation alone
does not secure an endpoint or prevent arbitrary prompt injection.

## Stream

Use UTF-8 Server-Sent Events, JSON data, and a blank line after every event.
Comment heartbeats (`: ping`) are allowed. Disable proxy buffering. Begin an
allowed request with `meta`, emitted after guarding and before model invocation:

```text
event: meta
data: {"model":"gobwen-flash","servedModel":"Qwen/Qwen3.5-0.8B@PINNED_REVISION","startState":"warm","hardening":{"enabled":true,"changed":false,"blocked":false,"model_called":false,"library_version":"3.0.0","policy":"balanced_chat","action":"allow","reason_codes":[]}}

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
Optional `kind` is `indexed` or `web`; indexed sources must include a valid
`indexedAt` date, shown as provenance in the UI. A selected-page index is tried
before the private SearXNG service's configured whole-web engines.
Search runs automatically for recognized factual questions. The server renders
selected source excerpts, not free-form factual prose. Calculator answers bypass
inference with `startState: "unknown"`, zero output tokens and null decode timing.
`done.recording` carries `langwatch: sent|unavailable` and
`archive: saved|off|unavailable`. The UI reports recording failures when opted in.

Instead of `meta`, a blocked request sends one terminal `blocked` event with an
enabled hardening receipt, `blocked: true` and `model_called: false`. It must not
invoke inference. A gateway failure sends `event: error` with JSON data, then
closes. The UI deliberately shows a generic error instead of server internals.

Only `done` completes a response. Unexpected EOF marks it incomplete. Stop,
navigation away and a 150-second request deadline cancel the client connection.
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
measures submission to first visible answer. Search selection is buffered until
validated, so its first visible output follows model selection. `decodeMs: null`,
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

Run the frontend tests, then exercise the actual gateway with ordinary, blocked,
multi-turn and cancelled inputs. Confirm that blocked inputs never reach the
model, the served revision matches the alias, deltas render immediately, and
usage/timings agree with server logs. Only then set `chatEndpoint` and rebuild.
