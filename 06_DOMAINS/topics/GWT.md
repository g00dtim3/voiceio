# Topics — Given/When/Then

Scenario: Start analysis from scratch
Given a project has a selected text column
When user starts analysis with startMode=scratch
Then system creates a topic collection
And enqueues TOPIC_GENERATION job
And shows generating state until completion
And then shows categories/topics for editing

Scenario: Block sentiment activation after reviews exist
Given at least one topic assignment has reviewed=true
When user toggles sentiment enabled on collection or topic
Then API returns CONFLICT
And UI explains that sentiment cannot be enabled after reviews exist

Scenario: Focus mode
Given assignments have confidence values
When user enables focus=1
Then only non-reviewed rows are listed
And sorted by lowest confidence first
