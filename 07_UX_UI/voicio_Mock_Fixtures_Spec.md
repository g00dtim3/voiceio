
# — Mock Fixtures Specification
Version: 1.0
Purpose: Provide test data fixtures for frontend development, Storybook, QA, and API mocking.

---

# 1. Directory structure

```txt
src/test/fixtures/
  rows/
    rows.list.success.json
    rows.list.empty.json
  topics/
    topic-collection.success.json
    topic-generate.completed.json
    quality-score.success.json
  smart-columns/
    smart-columns.list.success.json
    smart-column.detail.llm.json
    smart-column.preview.success.json
    smart-column.compute.job.json
  insight-agent/
    insight.query.success.json
    insight.query.empty.json
  reports/
    report.detail.success.json
    share.settings.success.json
```

---

# 2. Rows list success fixture

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
    },
    {
      "id": "row_2",
      "text": "App crashes after update on Samsung devices.",
      "reviewed": false,
      "flagged": false,
      "favorite": false,
      "assignments": [
        {
          "topicId": "topic_3",
          "topicLabel": "App stability",
          "categoryId": "cat_1",
          "categoryLabel": "Performance",
          "sentiment": "negative",
          "source": "ai",
          "confidence": 0.62
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

---

# 3. Topic collection fixture

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
        },
        {
          "id": "topic_3",
          "label": "App stability",
          "description": "Comments about crashes and bugs.",
          "sentimentEnabled": true,
          "order": 2
        }
      ]
    },
    {
      "id": "cat_2",
      "label": "Service",
      "order": 2,
      "topics": [
        {
          "id": "topic_2",
          "label": "Customer support",
          "description": "Interactions with support.",
          "sentimentEnabled": true,
          "order": 1
        }
      ]
    }
  ]
}
```

---

# 4. Topic generation result fixture

```json
{
  "status": "completed",
  "groups": {
    "new": [
      {
        "label": "Pricing",
        "description": "Mentions related to price and affordability."
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

---

# 5. Quality score fixture

```json
{
  "globalScore": 84,
  "dimensions": [
    { "label": "Coverage", "score": 81 },
    { "label": "Consistency", "score": 88 },
    { "label": "Specificity", "score": 79 }
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

# 6. Smart columns overview fixture

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

---

# 7. Smart column detail fixture

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
      { "key": "text", "sourceColumn": "comment_text" }
    ],
    "fallbackValue": "Unknown"
  }
}
```

---

# 8. Smart column preview fixture

```json
{
  "items": [
    {
      "rowId": "row_1",
      "inputs": { "text": "I use Apple and Samsung phones." },
      "output": "Apple"
    },
    {
      "rowId": "row_2",
      "inputs": { "text": "Google Pixel is a strong alternative." },
      "output": "Google"
    },
    {
      "rowId": "row_3",
      "inputs": { "text": "No brand mentioned here." },
      "output": "Unknown"
    }
  ]
}
```

---

# 9. Smart column job fixture

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

---

# 10. Insight query success fixture

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
      { "label": "Customer support", "value": 87 },
      { "label": "Pricing", "value": 64 }
    ]
  },
  "suggestedQuestions": [
    "How does this compare with Samsung?",
    "Which topics are improving over time?"
  ],
  "aiGenerated": true
}
```

---

# 11. Report detail fixture

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

---

# 12. Share settings fixture

```json
{
  "teamAccess": [
    { "userId": "usr_1", "name": "Alice Martin", "role": "owner" },
    { "userId": "usr_2", "name": "Sam Durand", "role": "viewer" }
  ],
  "publicAccess": {
    "enabled": true,
    "shareToken": "shr_123",
    "passwordEnabled": false,
    "embedEnabled": true
  }
}
```

---

# 13. Recommended MSW usage
- use one handler file per domain
- keep success, empty, and error fixtures
- storybook stories should use the same fixtures as app mocks
- QA scenarios should include:
  - empty rows
  - failed compute job
  - no AI suggestions
  - report with no sections
