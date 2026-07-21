# local_nextmoodle

Required companion for a complete student-facing replacement on Moodle 4.5 through 5.2.

- The service is disabled and restricted by default.
- It never returns arbitrary HTML. Adapters return allow-listed operations and typed display blocks only.
- Contract version 2 provides the Questionnaire adapter and the runtime-ticket boundary for isolated SCORM/H5P launchers.
- `runtime.php` consumes each 60-second ticket once, restores only the bound learner/activity context, restricts framing to the configured Next.js origin, and renders the activity without Moodle navigation.
- Questionnaire reads use the plugin's existing tables and writes delegate to its own `save_mobile_data` implementation; response data is not copied into local plugin tables.
- Install as `local/nextmoodle`, then add only the five functions in `db/services.php` to the deployment's dedicated external service.

Keep the service restricted to explicitly authorised users. The service is disabled by default after installation.
