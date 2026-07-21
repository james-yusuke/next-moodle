<?php
defined('MOODLE_INTERNAL') || die();

$definitions = [
    'runtime_tickets' => [
        'mode' => cache_store::MODE_APPLICATION,
        'simplekeys' => true,
        'simpledata' => false,
        'ttl' => 120,
    ],
];
