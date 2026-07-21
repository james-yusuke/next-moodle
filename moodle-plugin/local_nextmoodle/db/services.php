<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_nextmoodle_get_manifest' => [
        'classname' => 'local_nextmoodle\\external\\api',
        'methodname' => 'get_manifest',
        'description' => 'Returns the typed next-moodle adapter manifest.',
        'type' => 'read',
        'ajax' => false,
    ],
    'local_nextmoodle_get_branding' => [
        'classname' => 'local_nextmoodle\\external\\api',
        'methodname' => 'get_branding',
        'description' => 'Returns safe site branding fields.',
        'type' => 'read',
        'ajax' => false,
    ],
    'local_nextmoodle_get_activity_adapter' => [
        'classname' => 'local_nextmoodle\\external\\api',
        'methodname' => 'get_activity_adapter',
        'description' => 'Returns typed display blocks for one course module.',
        'type' => 'read',
        'ajax' => false,
    ],
    'local_nextmoodle_execute_activity_action' => [
        'classname' => 'local_nextmoodle\\external\\api',
        'methodname' => 'execute_activity_action',
        'description' => 'Executes an allow-listed adapter action.',
        'type' => 'write',
        'ajax' => false,
    ],
    'local_nextmoodle_create_runtime_ticket' => [
        'classname' => 'local_nextmoodle\\external\\api',
        'methodname' => 'create_runtime_ticket',
        'description' => 'Creates a 60-second single-use ticket for an isolated activity runtime.',
        'type' => 'write',
        'ajax' => false,
    ],
];

$services = [
    'next-moodle adapter service' => [
        'functions' => array_keys($functions),
        'restrictedusers' => 1,
        'enabled' => 0,
        'shortname' => 'local_nextmoodle',
    ],
];
