# API Contracts (authoritative)

## Error envelope
{
  "error": {
    "code": "UNAUTHORIZED|FORBIDDEN|NOT_FOUND|VALIDATION_ERROR|CONFLICT|RATE_LIMITED|JOB_FAILED|INTERNAL_ERROR",
    "message": "human readable",
    "details": { "any": "json" },
    "requestId": "uuid"
  }
}

## Pagination
{ "items": [...], "page": 1, "pageSize": 50, "total": 12345 }

## Filters
Filter object:
{ "field": "region", "op": "eq|neq|in|contains|gte|lte", "value": any }

## Auth roles (MVP)
admin | editor | viewer | external_view_only
Object owners always have full permissions on their object.
Permissions are additive (cannot revoke a role-granted baseline per object).
