# Horus Docs

## Development Protocol — Research First, Quality First

**Every implementation task MUST follow this protocol. No exceptions.**

1. **Deep Research First**: Before writing any code, thoroughly research the existing codebase. Understand the architecture, patterns, conventions, and dependencies. Read the relevant source files — not just entry points. Never implement blind.

2. **Tech Debt First**: Before adding new features, identify and address existing tech debt in the affected area. Tech debt is always the highest priority — new features built on top of technical debt create compounding spaghetti code that becomes exponentially harder to fix.

3. **Quality Gate**: Before implementing, establish how you will ensure quality:
   - What tests exist? What's missing? Add tests for any untested code you touch.
   - What patterns does the codebase use? Follow them consistently.
   - Are there anti-patterns, dead code, or inconsistencies to fix first?
   - Will your changes introduce new tech debt? If so, refactor first.

4. **Then Implement**: Only after steps 1-3, begin implementation. The code you write must leave the codebase cleaner than you found it.

**Why this matters**: Skipping research leads to duplicated logic, broken conventions, and architectural violations. Ignoring tech debt compounds it exponentially. This protocol prevents spaghetti code at the source.
