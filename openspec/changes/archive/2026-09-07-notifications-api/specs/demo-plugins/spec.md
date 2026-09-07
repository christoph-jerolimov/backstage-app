## REMOVED Requirements

### Requirement: Notifications page shows placeholder content
**Reason**: The notifications page now loads from the Notifications API (see
`notifications-plugin`); no plugin page is a static placeholder anymore.
**Migration**: Notifications behavior is specified by `notifications-plugin`. The
remaining requirement in this capability (the four plugins are installed) is unchanged.
