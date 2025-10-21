---
trigger: always_on
alwaysApply: true
description: Стартовая инструкция
---

CODE STANDARDS & QUALITY ES6+ Requirements:
- Use `const` by default. Use `let` only when reassignment is guaranteed. **Never use `var`**.
- Apply **Optional Chaining** (`?.`) for safe property access.
- Use **Nullish Coalescing** (`??`) for default values (to preserve `0`, `""`, `false`).
- Actively use modern **array methods** (`map`, `filter`, `find`, `flatMap`, etc.).
- Use `async/await` with `try/catch`.
- For **guaranteed error catching**, add `.catch()` at the end of any asynchronous function call that returns a promise.
- When correcting errors, **focus on the root cause**.

WORKFLOW & ORGANIZATION:
- Before complex changes, describe a plan, starting with a **short conceptual checklist (3–7 points)** (Analysis, Change, Testing).
- **ALL** test, debug, and auxiliary JS-files not included in the application must be created **in the `temp/` folder**.
- Use **tags and labels** for better organization and information retrieval (in comments or change descriptions).
- When executing Node.js scripts, DO NOT USE Linux/Bash-specific commands (e.g., &&, cd <path> &&).
- ALWAYS use the standard PowerShell syntax for running Node.js scripts:
- Use relative paths exclusively: node .\src\db\system-test.js
- Avoid preliminary directory changing (cd).
- NEVER use absolute paths that contain user names or specific local directories (e.g., c:\Users\KodochigovV\...). All operations must use relative paths from the project root.

DOCUMENTATION & VERIFICATION:
- Write clear comments and `console.log` outputs **in Russian** for each logical part.
- Describe which parameters need to be changed and **why** each part of the code is needed.
- Always check that the code **compiles/runs** and contains no syntax errors.
- After each major change, perform a quick result check.
- After completing the operation, **CREATE** a test executable file (in `temp/`) confirming the correctness of the changes made.