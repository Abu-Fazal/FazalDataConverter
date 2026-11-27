# Guardrail Verification Rules

This file documents the zero-tolerance guardrails active in FazalDataConverter.
These guardrails are programmatically checked before every tool execution.

## 1. Plan-First Requirement
No execution without user approval of the plan.

## 2. Git / GitHub Restrictions
- Commands blocked: `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `gh pr`, etc.
- Only the user may execute Git commands.

## 3. Database Protection
- No dropDatabase, collection.drop(), deleteMany(), or raw SQL/Mongo deletions.
- Database access requires explicit user instruction.

## 4. File / Folder Deletion
- Deletion commands (`rm`, `rmdir`, `del`, `Remove-Item`) are blocked.
- User permission is required before any file or directory is removed.

## 5. Workspace Confinement
- Operations must stay within `d:\OneDrive\Desktop\FazalDataConverter`.
- External requests must be approved by the user in Hinglish.

## 6. Creation Safeguards
- No new source files without prior plan approval.
