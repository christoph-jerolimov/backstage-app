## ADDED Requirements

### Requirement: Open tasks home widget
The scaffolder plugin SHALL contribute a "My open tasks" home widget listing the tasks
that are queued or running, newest first, at most five, restricted to the signed-in user's
tasks when a session exists. Each row SHALL show the template and the task's age and SHALL
open the task page. The widget SHALL show an empty state when nothing is running and an
error state with retry when the request fails.

#### Scenario: Running task listed
- **WHEN** one task is processing
- **THEN** the widget lists it with its template and opens the task page when pressed

#### Scenario: Nothing running
- **WHEN** no task is queued or running
- **THEN** the widget says there are no running tasks
