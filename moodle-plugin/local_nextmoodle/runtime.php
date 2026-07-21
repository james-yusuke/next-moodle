<?php
require_once(__DIR__ . '/../../config.php');

$ticket = required_param('ticket', PARAM_RAW_TRIMMED);
if (!preg_match('/^[A-Za-z0-9_-]{32,128}$/', $ticket)) {
    throw new moodle_exception('invalidticket', 'local_nextmoodle');
}

$cache = cache::make('local_nextmoodle', 'runtime_tickets');
$cachekey = hash('sha256', $ticket);
$runtime = $cache->get($cachekey);
$cache->delete($cachekey);
if (!is_array($runtime) || (int)($runtime['expiresat'] ?? 0) < time()) {
    throw new moodle_exception('invalidticket', 'local_nextmoodle');
}

$origin = (string)($runtime['origin'] ?? '');
$originparts = parse_url($origin);
if (($originparts['scheme'] ?? '') !== 'https' || empty($originparts['host']) || isset($originparts['path'])) {
    throw new moodle_exception('invalidticket', 'local_nextmoodle');
}

$user = $DB->get_record('user', ['id' => (int)$runtime['userid'], 'deleted' => 0], '*', MUST_EXIST);
\core\session\manager::set_user($user);
$cm = get_coursemodule_from_id('', (int)$runtime['cmid'], 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
require_login($course, false, $cm);
$context = context_module::instance($cm->id);
if ($cm->modname === 'scorm') {
    require_capability('mod/scorm:view', $context);
    $scorm = $DB->get_record('scorm', ['id' => $cm->instance], '*', MUST_EXIST);
    $sco = $DB->get_record_sql(
        "SELECT * FROM {scorm_scoes} WHERE scorm = :scorm AND launch <> '' ORDER BY sortorder ASC",
        ['scorm' => $scorm->id],
        MUST_EXIST
    );
    $target = new moodle_url('/mod/scorm/player.php', [
        'a' => $scorm->id,
        'display' => 'popup',
        'mode' => 'normal',
        'scoid' => $sco->id,
    ]);
} else if ($cm->modname === 'h5pactivity') {
    require_capability('mod/h5pactivity:view', $context);
    $target = new moodle_url('/mod/h5pactivity/view.php', ['embed' => 1, 'id' => $cm->id]);
} else {
    throw new moodle_exception('noadapter', 'local_nextmoodle');
}

header("Content-Security-Policy: default-src 'none'; frame-src 'self'; style-src 'unsafe-inline'; frame-ancestors " . $origin);
header('Cache-Control: private, no-store, max-age=0');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
?><!doctype html>
<html lang="<?php echo s(current_language()); ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo s(format_string($cm->name)); ?></title>
    <style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#0b0d10}body{overflow:hidden}</style>
</head>
<body>
    <iframe allow="autoplay; fullscreen" referrerpolicy="no-referrer" src="<?php echo s($target->out(false)); ?>" title="<?php echo s(format_string($cm->name)); ?>"></iframe>
</body>
</html>
