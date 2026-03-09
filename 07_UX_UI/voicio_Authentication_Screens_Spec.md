
# — Authentication Screens Specification
Version: 1.0
Purpose: Provide a minimal auth UI spec in case login and account access need to be implemented.

---

# 1. Scope
This spec covers:
- login
- forgot password
- reset password
- invite acceptance
- optional signup

If the product uses SSO-only auth, the same shell still applies but with fewer actions.

---

# 2. Login screen

```txt
┌────────────────────────────────────────────────────────────┐
│ CAPLENA                                                    │
│                                                            │
│ Sign in                                                    │
│ Access your workspace and reports.                         │
│                                                            │
│ Work email                                                 │
│ [ you@company.com...................................... ]  │
│                                                            │
│ Password                                                   │
│ [ •••••••••••••••••.................................... ]  │
│                                                            │
│ [ ] Keep me signed in             [Forgot password?]       │
│                                                            │
│ [ Sign in ]                                                │
│                                                            │
│ ─────────────── or ───────────────                         │
│ [ Continue with Google ]                                   │
│ [ Continue with Microsoft ]                                │
└────────────────────────────────────────────────────────────┘
```

## 2.1 Layout rules
- centered auth card
- card width: `420px`
- page background uses app background token
- auth card uses surface token with soft border and subtle shadow

## 2.2 Validation
- email required
- password required
- inline field errors under each field
- generic auth error banner above form when credentials fail

---

# 3. Forgot password

```txt
┌────────────────────────────────────────────────────────────┐
│ Reset your password                                        │
│ Enter your work email to receive reset instructions.       │
│                                                            │
│ Work email                                                 │
│ [ you@company.com...................................... ]  │
│                                                            │
│ [ Send reset link ]                                        │
│ [ Back to sign in ]                                        │
└────────────────────────────────────────────────────────────┘
```

---

# 4. Reset password

```txt
┌────────────────────────────────────────────────────────────┐
│ Choose a new password                                      │
│                                                            │
│ New password                                               │
│ [ ...................................................... ] │
│                                                            │
│ Confirm password                                           │
│ [ ...................................................... ] │
│                                                            │
│ [ Reset password ]                                         │
└────────────────────────────────────────────────────────────┘
```

Validation:
- minimum password policy should be configurable
- show mismatch error on confirm field
- success redirects to login or app

---

# 5. Invite acceptance

```txt
┌────────────────────────────────────────────────────────────┐
│ You’ve been invited to join Caplena                        │
│ Workspace: Customer Insights Team                          │
│                                                            │
│ Full name                                                  │
│ [ ...................................................... ] │
│                                                            │
│ Password                                                   │
│ [ ...................................................... ] │
│                                                            │
│ [ Accept invitation ]                                      │
└────────────────────────────────────────────────────────────┘
```

---

# 6. Optional signup
If public signup is allowed, reuse login card layout and add:
- first name
- last name
- work email
- password
- company name optional

---

# 7. Auth UX rules
- auth screens should feel simpler than app screens
- no secondary sidebar
- clear success/error messaging
- keyboard submit supported
- loading state inside submit button
- support SSO buttons if enterprise customers require them
