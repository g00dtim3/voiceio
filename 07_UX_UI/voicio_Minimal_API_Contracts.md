
#  Minimal API Contracts
Version: 1.0

This document defines the minimum REST contracts aligned with the observed screens:
- Topics
- Reports
- Smart Columns
- Insight Agent
- Sharing
- Dataset row browser

---

# 1. Cross-module models

## Project

```json
{
  "id": "proj_123",
  "name": "Customer Feedback Q2",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z"
}
```

## PaginationMeta

```json
{
  "page": 1,
  "pageSize": 50,
  "total": 957
}
```

## Filter

```json
{
  "field": "region",
  "operator": "in",
  "value": ["South", "West"]
}
```

## Segment

```json
{
  "id": "seg_1",
  "label": "Apple",
  "filter": {
    "field": "brand",
    "operator": "eq",
    "value": "Apple"
  }
}
```

## Job

```json
{
  "id": "job_123",
  "type": "smart_column_compute",
  "status": "running",
  "progress": 42,
  "rowsAffected": 1000,
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z"
}
```

---

# 2. Dataset / Rows

## GET `/api/v1/projects/:projectId/rows`

Purpose: populate the row browser.

### Query params
- `page`
- `pageSize`
- `search`
- `filters`
- `sort`
- `columnId`
- `reviewed`
- `focusMode`

### Response

```json
{
  "items": [
    {
      "id": "row_1",
      "text": "The battery life is excellent but customer support is slow.",
      "reviewed": true,
      "flagged": false,
      "favorite": false,
      "assignments": [
        {
          "topicId": "topic_1",
          "topicLabel": "Battery life",
          "categoryId": "cat_1",
          "categoryLabel": "Performance",
          "sentiment": "positive",
          "source": "ai",
          "confidence": 0.91
        },
        {
          "topicId": "topic_2",
          "topicLabel": "Customer support",
          "categoryId": "cat_2",
          "categoryLabel": "Service",
          "sentiment": "negative",
          "source": "manual",
          "confidence": 1
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 957
  }
}
```

## PATCH `/api/v1/projects/:projectId/rows/review`

Purpose: mark multiple rows as reviewed.

### Request

```json
{
  "rowIds": ["row_1", "row_2"],
  "reviewed": true
}
```

### Response

```json
{
  "updatedCount": 2
}
```

---

# 3. Topics

## GET `/api/v1/projects/:projectId/topics/collections/:collectionId`

Purpose: load topic collection tree.

### Response

```json
{
  "id": "tc_1",
  "name": "Main Topic Collection",
  "sentimentEnabled": true,
  "categories": [
    {
      "id": "cat_1",
      "label": "Performance",
      "order": 1,
      "topics": [
        {
          "id": "topic_1",
          "label": "Battery life",
          "description": "Comments related to battery duration.",
          "sentimentEnabled": true,
          "order": 1
        }
      ]
    }
  ]
}
```

## POST `/api/v1/projects/:projectId/topics/collections/:collectionId/categories`

### Request

```json
{
  "label": "New Category"
}
```

## POST `/api/v1/projects/:projectId/topics/categories/:categoryId/topics`

### Request

```json
{
  "label": "New Topic",
  "description": "",
  "sentimentEnabled": true
}
```

## PATCH `/api/v1/projects/:projectId/topics/topics/:topicId`

### Request

```json
{
  "label": "Customer support",
  "description": "Service interactions and support quality.",
  "sentimentEnabled": true
}
```

## DELETE `/api/v1/projects/:projectId/topics/topics/:topicId`

## POST `/api/v1/projects/:projectId/topics/assignments`

Purpose: add, remove, or replace topic assignments on rows.

### Request

```json
{
  "rowIds": ["row_1", "row_2"],
  "operation": "add",
  "topicId": "topic_2",
  "sentiment": "negative",
  "source": "manual"
}
```

### Response

```json
{
  "updatedCount": 2
}
```

## POST `/api/v1/projects/:projectId/topics/generate`

Purpose: AI topic generation from prompt.

### Request

```json
{
  "collectionId": "tc_1",
  "prompt": "Suggest main product feedback themes for these responses."
}
```

### Response

```json
{
  "job": {
    "id": "job_77",
    "type": "topic_generation",
    "status": "queued",
    "progress": 0,
    "rowsAffected": 957,
    "createdAt": "2026-03-09T10:00:00Z",
    "updatedAt": "2026-03-09T10:00:00Z"
  }
}
```

## GET `/api/v1/projects/:projectId/topics/generate/:jobId`

### Response

```json
{
  "status": "completed",
  "groups": {
    "new": [
      {
        "label": "Pricing",
        "description": "Mentions related to product price and affordability."
      }
    ],
    "similar": [
      {
        "label": "Battery performance",
        "matchesTopicId": "topic_1"
      }
    ],
    "discarded": []
  }
}
```

## GET `/api/v1/projects/:projectId/topics/quality-score?collectionId=tc_1`

### Response

```json
{
  "globalScore": 84,
  "dimensions": [
    {
      "label": "Coverage",
      "score": 81
    },
    {
      "label": "Consistency",
      "score": 88
    }
  ],
  "breakdown": [
    {
      "categoryId": "cat_1",
      "categoryLabel": "Performance",
      "topicId": "topic_1",
      "topicLabel": "Battery life",
      "score": 86,
      "count": 245,
      "influence": 0.32
    }
  ]
}
```

---

# 4. Smart Columns

## GET `/api/v1/projects/:projectId/smart-columns`

Purpose: load smart columns overview.

### Response

```json
{
  "health": "healthy",
  "stats": {
    "ttaSlotsUsed": 2,
    "ttaSlotsTotal": 5,
    "nonTtaSlotsUsed": 1,
    "nonTtaSlotsTotal": 10,
    "rowsComputed": 3000
  },
  "items": [
    {
      "id": "sc_1",
      "name": "Extract product names",
      "sourceColumns": ["comment_text"],
      "computationType": "llm",
      "status": "completed"
    }
  ]
}
```

## POST `/api/v1/projects/:projectId/smart-columns`

### Request

```json
{
  "name": "Extract brand",
  "outputType": "text",
  "computationType": "llm",
  "config": {
    "prompt": "Extract the most relevant brand name from the input text.",
    "inputVariables": [
      {
        "key": "text",
        "sourceColumn": "comment_text"
      }
    ],
    "fallbackValue": "Unknown"
  }
}
```

### Response

```json
{
  "id": "sc_2",
  "status": "draft"
}
```

## GET `/api/v1/projects/:projectId/smart-columns/:smartColumnId`

### Response

```json
{
  "id": "sc_2",
  "name": "Extract brand",
  "outputType": "text",
  "computationType": "llm",
  "status": "draft",
  "config": {
    "prompt": "Extract the most relevant brand name from the input text.",
    "inputVariables": [
      {
        "key": "text",
        "sourceColumn": "comment_text"
      }
    ],
    "fallbackValue": "Unknown"
  }
}
```

## POST `/api/v1/projects/:projectId/smart-columns/:smartColumnId/preview`

Purpose: preview computed sample before full execution.

### Request

```json
{
  "sampleSize": 10,
  "randomSample": true,
  "filters": []
}
```

### Response

```json
{
  "items": [
    {
      "rowId": "row_1",
      "inputs": {
        "text": "I use Apple and Samsung phones."
      },
      "output": "Apple"
    }
  ]
}
```

## POST `/api/v1/projects/:projectId/smart-columns/:smartColumnId/compute`

### Request

```json
{
  "scope": "all_rows"
}
```

### Response

```json
{
  "job": {
    "id": "job_88",
    "type": "smart_column_compute",
    "status": "queued",
    "progress": 0,
    "rowsAffected": 1000,
    "createdAt": "2026-03-09T10:00:00Z",
    "updatedAt": "2026-03-09T10:00:00Z"
  }
}
```

## POST `/api/v1/projects/:projectId/smart-columns/:smartColumnId/reapply`

### Request

```json
{
  "scope": "outdated_rows"
}
```

## DELETE `/api/v1/projects/:projectId/smart-columns/:smartColumnId`

---

# 5. Insight Agent

## POST `/api/v1/projects/:projectId/insight-agent/query`

Purpose: ask a natural language analytics question.

### Request

```json
{
  "reportId": "rep_1",
  "question": "What are the most mentioned negative topics for Apple users?",
  "filters": [
    {
      "field": "brand",
      "operator": "eq",
      "value": "Apple"
    }
  ],
  "segments": [
    {
      "id": "seg_1",
      "label": "Apple"
    }
  ]
}
```

### Response

```json
{
  "id": "ir_1",
  "status": "completed",
  "title": "Most Mentioned Negative Topics – Apple",
  "narrative": "Customer support and pricing are the most frequent negative topics among Apple users.",
  "rowsAnalyzed": 214,
  "chart": {
    "type": "horizontal_bar",
    "data": [
      {
        "label": "Customer support",
        "value": 87
      },
      {
        "label": "Pricing",
        "value": 64
      }
    ]
  },
  "suggestedQuestions": [
    "How does this compare with Samsung?",
    "Which topics are improving over time?"
  ],
  "aiGenerated": true
}
```

## GET `/api/v1/projects/:projectId/insight-agent/history?reportId=rep_1`

### Response

```json
{
  "items": [
    {
      "id": "ir_1",
      "question": "What are the most mentioned negative topics for Apple users?",
      "createdAt": "2026-03-09T10:00:00Z"
    }
  ]
}
```

---

# 6. Reports

## GET `/api/v1/projects/:projectId/reports/:reportId`

Purpose: load a full report definition.

### Response

```json
{
  "id": "rep_1",
  "name": "Mobile Providers - Q2",
  "views": [
    {
      "id": "view_1",
      "name": "Full Report",
      "filters": [],
      "segments": []
    }
  ],
  "sections": [
    {
      "id": "sec_1",
      "name": "Summary",
      "order": 1,
      "elements": [
        {
          "id": "el_1",
          "type": "key_metrics_overview",
          "order": 1,
          "config": {
            "scoreColumn": "nps_score",
            "textColumn": "comment_text"
          }
        }
      ]
    }
  ],
  "updatedAt": "2026-03-09T10:00:00Z"
}
```

## POST `/api/v1/projects/:projectId/reports`

### Request

```json
{
  "name": "Customer Feedback Report"
}
```

## POST `/api/v1/projects/:projectId/reports/:reportId/sections`

### Request

```json
{
  "name": "NPS Drivers"
}
```

## POST `/api/v1/projects/:projectId/reports/:reportId/sections/:sectionId/elements`

### Request

```json
{
  "type": "topic_correlation",
  "config": {
    "limit": 5,
    "chartType": "chord"
  }
}
```

## PATCH `/api/v1/projects/:projectId/reports/:reportId/layout`

Purpose: persist sections and element order.

### Request

```json
{
  "sections": [
    {
      "id": "sec_1",
      "order": 1,
      "elements": [
        {
          "id": "el_1",
          "order": 1
        }
      ]
    }
  ]
}
```

## PATCH `/api/v1/projects/:projectId/reports/:reportId/elements/:elementId`

### Request

```json
{
  "config": {
    "limit": 10,
    "chartType": "table"
  }
}
```

## DELETE `/api/v1/projects/:projectId/reports/:reportId/elements/:elementId`

## POST `/api/v1/projects/:projectId/reports/:reportId/views`

### Request

```json
{
  "name": "US Region: South",
  "filters": [
    {
      "field": "region",
      "operator": "eq",
      "value": "South"
    }
  ],
  "segments": []
}
```

---

# 7. Sharing

## GET `/api/v1/projects/:projectId/reports/:reportId/share`

### Response

```json
{
  "teamAccess": [
    {
      "userId": "usr_1",
      "name": "Alice Martin",
      "role": "owner"
    },
    {
      "userId": "usr_2",
      "name": "Sam Durand",
      "role": "viewer"
    }
  ],
  "publicAccess": {
    "enabled": true,
    "shareToken": "shr_123",
    "passwordEnabled": false,
    "embedEnabled": true
  }
}
```

## PATCH `/api/v1/projects/:projectId/reports/:reportId/share/team`

### Request

```json
{
  "userId": "usr_2",
  "role": "editor"
}
```

## PATCH `/api/v1/projects/:projectId/reports/:reportId/share/public`

### Request

```json
{
  "enabled": true,
  "password": "optional-password",
  "embedEnabled": true
}
```

---

# 8. Enums

## JobStatus

```txt
queued | running | completed | failed
```

## Sentiment

```txt
positive | neutral | negative
```

## AssignmentSource

```txt
ai | manual
```

## SmartColumnComputationType

```txt
mapping | formula | llm
```

## SmartColumnStatus

```txt
draft | queued | running | completed | failed | outdated
```

## ShareRole

```txt
owner | editor | viewer
```

## InsightElementType

```txt
key_metrics_overview
nps_score
nps_over_time
topic_correlation
topic_breakdown
topic_sentiment
overall_sentiment
selected_rows
narrative_ai_block
```

---

# 9. Standard formats

## Error format

```json
{
  "error": {
    "code": "SMART_COLUMN_PREVIEW_FAILED",
    "message": "Unable to compute preview for the requested rows.",
    "details": {}
  }
}
```

## Pagination format

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 957
  }
}
```
