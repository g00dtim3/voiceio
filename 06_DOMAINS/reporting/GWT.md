# Reporting — Given/When/Then

Scenario: Create view as saved filters snapshot
Given user is in a report with active URL state
When user creates a new view
Then system saves filters/segments/dateRange as ReportView
And updates URL viewId to that view

Scenario: Preview vs Edit mode
Given a report exists
When mode=preview
Then all editing controls are hidden/disabled
When mode=edit
Then user can add sections and insight elements, with autosave
