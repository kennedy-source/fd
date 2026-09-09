---
name: OpenAPI and Zod compatibility
description: Notes on the workspace's generated Zod compatibility for numeric count fields.
---

OpenAPI integer schemas currently generate `zod.int()` in this workspace, while the installed Zod runtime exposes the older API without that helper. Use numeric schemas for dashboard and inventory counts unless the generator/runtime versions are upgraded together.

**Why:** The first API codegen run failed during the chained library typecheck even though Orval itself completed successfully.

**How to apply:** When adding count-like fields to the OpenAPI contract, prefer `type: number` for the current stack and keep integer semantics enforced in route logic where needed.