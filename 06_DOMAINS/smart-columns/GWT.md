# Smart Columns — Given/When/Then

Scenario: LLM smart column preview and fill
Given a smart column config is provided (prompt + input variables)
When user clicks Preview
Then system enqueues SMART_COLUMN_PREVIEW
And returns a sample of computed values
When user confirms Create & fill
Then system enqueues SMART_COLUMN_FILL with scope=all
And updates status/progress until completion

Scenario: Reapply scopes
Given a smart column is completed
When new rows are uploaded
Then the column becomes Outdated
And user can Reapply to outdated rows or Apply to future uploads
