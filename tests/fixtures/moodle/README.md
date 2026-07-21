# Synthetic Moodle wire fixtures

These files contain only deterministic test data for the local Mock Moodle server. User names,
course names, IDs, tokens, URLs, and notification text are synthetic and must never be replaced
with live Moodle responses or credentials.

The server accepts the same form names used by Moodle REST clients, including repeated fields and
bracketed names such as `plugindata[onlinetext_editor][text]`. `errors.json` documents the redacted
HTTP-200 exception shapes; `upload-draft.json`, `submission-save.json`, and
`protected-file.txt` cover mutation and private-file wire responses.
