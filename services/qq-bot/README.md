# QQ Bot

The QQ bot connects NapCat's OneBot 11 forward WebSocket to AIRI.

## Headless mode

Set `QQ_LLM_BASE_URL`, `QQ_LLM_API_KEY`, and `QQ_LLM_MODEL` in `.env.local` to
generate replies directly in this Node service. The browser is not involved in
the reply path, and the service calls the model once per reply without
streaming. In this mode, `server-runtime` is not required: only NapCat and this
QQ bot process need to remain running.

Put the character card in `QQ_LLM_SYSTEM_PROMPT_FILE` (UTF-8 text). The file
is loaded at startup; this is more reliable than putting a long multiline card
in `.env`. `QQ_LLM_SYSTEM_PROMPT` remains available for a short inline prompt,
but the file takes precedence when both are set.

Conversation history is stored in `QQ_LLM_MEMORY_FILE`. Private chats are
isolated by bot account and user; group chats are isolated by bot account and
group. `QQ_LLM_MAX_HISTORY_MESSAGES` limits the recent messages sent to the
model. This is persistent conversation memory, not semantic/vector memory, so
facts older than the retained history can still be forgotten.

When the `QQ_LLM_*` settings are absent, the bot retains the original AIRI
event-hub path and requires an open Web/Desktop stage to run the LLM.

## Run

```bash
pnpm -F @proj-airi/qq-bot start
```

`pnpm dev` for Stage Web also starts this service and server-runtime.
