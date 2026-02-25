# Insight Agent — Given/When/Then

Scenario: Context uses active filters
Given user is in a report with filters/segments/dateRange active
When user asks a question
Then the agent request includes those parameters
And the response is labeled AI-generated
And includes sample size (n=...)
