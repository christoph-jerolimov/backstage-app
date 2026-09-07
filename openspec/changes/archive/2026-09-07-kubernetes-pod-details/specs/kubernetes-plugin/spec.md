## ADDED Requirements

### Requirement: Pods open a pod page
On the Kubernetes page every pod row SHALL be pressable and SHALL open the pod page for
that pod in the cluster it was listed under.

#### Scenario: Opening a pod
- **WHEN** the user presses a pod listed under the cluster "prod"
- **THEN** the pod page opens for that pod in "prod"

### Requirement: Pod page shows logs
The pod page SHALL show the pod's phase and containers and SHALL load the selected
container's log through the Kubernetes backend's cluster proxy. When the pod has more than
one container the page SHALL offer a container selector, defaulting to the first. The page
SHALL offer a "Previous run" toggle that loads the log of the container's previous instance,
a tail-length selector, and a Refresh action. An empty log SHALL be reported as empty rather
than as an error.

#### Scenario: Log shown
- **WHEN** the pod page opens for a running pod
- **THEN** the container's most recent log lines are shown

#### Scenario: Crash loop
- **WHEN** the user turns on "Previous run" for a crash-looping container
- **THEN** the log of the instance that crashed is shown

#### Scenario: Several containers
- **WHEN** the pod has two containers
- **THEN** a selector offers both and choosing one loads that container's log

#### Scenario: Empty log
- **WHEN** the container has produced no output
- **THEN** the page says the log is empty

### Requirement: Pod page shows events
The pod page SHALL show the cluster events about the pod, newest first, each with its
reason, message, type, count, and age, and SHALL mark warning events distinctly. When the
cluster reports no events the page SHALL say so.

#### Scenario: Events listed
- **WHEN** the cluster reports a `BackOff` warning event
- **THEN** the events view lists it with its reason, message, and age, marked as a warning

#### Scenario: No events
- **WHEN** the cluster reports no events for the pod
- **THEN** the events view says there are none

### Requirement: Pod page states
The pod page SHALL show a loading indicator while the pod loads, a not-found state when the
cluster does not have the pod, and an error with retry when a request fails. A failure to
load the log SHALL NOT hide the events, and the reverse.

#### Scenario: Log request fails
- **WHEN** the log request fails but the events succeed
- **THEN** the logs view shows the error with a retry action and the events remain available
