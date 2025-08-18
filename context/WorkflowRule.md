# Workflow Rule (keep small; always keep in context)

- Always respect PRD.md as source of truth.
- Implement tasks from ImplementationPlan.md in order.
- Update ProjectStructure.md as files change.
- Log any issues in BugTracking.md.
- Keep responses concise and code-focused; avoid changing requirements unless PRD is updated.
- When unsure, propose a minimal-safe change aligned with RLS and UX defined in PRD.

## Workflow Guardrails
- Do not change `vite.config.js` unless explicitly instructed in the PRD.
- Keep `base: '/'` in Vite config unless deployment context requires a subdirectory.
- Maintain `server.port = 3000` and `strictPort: true`.