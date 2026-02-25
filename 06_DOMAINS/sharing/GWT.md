# Sharing — Given/When/Then

Scenario: Public share link is view-only
Given user enables public share
When someone opens /r/:token
Then they can view the report
And cannot edit sections, filters persistence is allowed
And if password enabled, they must enter it before viewing

Scenario: Internal share respects additive permissions
Given a user has org role viewer
When they are granted edit permission on a report they do not own
Then they can edit that report, but remain viewer elsewhere
