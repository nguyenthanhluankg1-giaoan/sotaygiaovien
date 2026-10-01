# Security Specification - Lớp Học Thông Minh

## Data Invariants
1. A workspace can only be read or written by its owner (identified by `ownerUserId`).
2. User profiles can only be managed by admins, or read by the owner.
3. System configuration is only writable by admins.

## The "Dirty Dozen" Payloads
1. **P1 (Identity Spoofing)**: Create a user profile with a different `id` than the authenticated user.
2. **P2 (Privilege Escalation)**: A teacher attempting to set their own role to 'admin'.
3. **P3 (Workspace Hijack)**: A user attempting to read/write a workspace they don't own.
4. **P4 (Resource Poisoning)**: Setting a `name` field to a 2MB string.
5. **P5 (State Shortcutting)**: Modifying `createdAt` after document creation.
6. **P6 (Anonymous Write)**: Attempting to create a user profile without being signed in.
7. **P7 (Unverified Email)**: Writing to the database with an unverified email account.
8. **P8 (Orphaned Workspace)**: Creating a workspace for a non-existent user.
9. **P9 (System Config Tamper)**: A non-admin user modifying `system/config`.
10. **P10 (Shadow Field)**: Adding an `isAdmin: true` field to a User document that doesn't define it.
11. **P11 (ID Poisoning)**: Using a 2KB junk string as a `userId` path variable.
12. **P12 (Terminal State Lock)**: Modifying a 'locked' user account.

## Test Runner
(Omitted for brevity in this turn, but logic will be enforced in rules)
