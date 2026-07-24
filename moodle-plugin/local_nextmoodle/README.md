# local_nextmoodle

Required companion for a complete student-facing replacement on Moodle 4.5 through 5.2.

- The service is disabled and restricted by default.
- It never returns arbitrary HTML. Adapters return allow-listed operations and typed display blocks only.
- Contract version 2 provides the Questionnaire adapter and the runtime-ticket boundary for isolated SCORM/H5P launchers.
- `runtime.php` consumes each 60-second ticket once, restores only the bound learner/activity context, restricts framing to the configured Next.js origin, and renders the activity without Moodle navigation.
- Questionnaire reads use the plugin's existing tables and writes use Questionnaire's response objects; response data is not copied into local plugin tables. Existing in-progress responses remain owned by the logged-in learner and are replaced transactionally, rather than duplicated.
- Install as `local/nextmoodle`, then add only the five functions in `db/services.php` to the deployment's dedicated external service.

Keep the service restricted to explicitly authorised users. The service is disabled by default after installation.

## Questionnaire support

The typed in-app form supports Questionnaire's yes/no, short text, essay,
radio, checkbox, dropdown, date, numeric, rate-table, page-break, and
section-text questions. A response can be saved and resumed without exposing
a Moodle session or arbitrary Moodle HTML to the browser.

Sliders, file uploads, rank-only rate tables, and choices with an additional
`Other` text field intentionally return `adapter_required` for that individual
activity. next-moodle then provides a verified Moodle link instead of showing a
partial form that could lose an answer.

After updating this plugin, a Moodle administrator must complete the standard
plugin upgrade, enable the dedicated service, and issue the next-moodle login
token for that service. No student credentials, response contents, or Moodle
database records are configured in next-moodle itself.
