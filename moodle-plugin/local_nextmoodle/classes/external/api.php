<?php
namespace local_nextmoodle\external;

defined('MOODLE_INTERNAL') || die();

use cache;
use context_module;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use moodle_exception;

final class api extends external_api {
    private const CONTRACT_VERSION = 2;

    private static function operation_structure(): external_value {
        return new external_value(PARAM_ALPHANUMEXT, 'Allow-listed operation key');
    }

    private static function block_structure(): external_single_structure {
        return new external_single_structure([
            'kind' => new external_value(PARAM_ALPHA, 'text, facts, list, notice, or launch'),
            'heading' => new external_value(PARAM_TEXT, 'Heading', VALUE_DEFAULT, ''),
            'text' => new external_value(PARAM_TEXT, 'Plain text', VALUE_DEFAULT, ''),
            'tone' => new external_value(PARAM_ALPHA, 'Notice tone', VALUE_DEFAULT, 'info'),
            'label' => new external_value(PARAM_TEXT, 'Launch label', VALUE_DEFAULT, ''),
            'url' => new external_value(PARAM_URL, 'Verified external launch URL', VALUE_DEFAULT, ''),
        ]);
    }

    private static function question_structure(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Question id'),
            'kind' => new external_value(PARAM_ALPHA, 'Typed control kind'),
            'label' => new external_value(PARAM_TEXT, 'Plain text label'),
            'description' => new external_value(PARAM_TEXT, 'Plain text description'),
            'required' => new external_value(PARAM_BOOL, 'Required'),
            'min' => new external_value(PARAM_FLOAT, 'Minimum', VALUE_REQUIRED, null, NULL_ALLOWED),
            'max' => new external_value(PARAM_FLOAT, 'Maximum', VALUE_REQUIRED, null, NULL_ALLOWED),
            'step' => new external_value(PARAM_FLOAT, 'Step', VALUE_REQUIRED, null, NULL_ALLOWED),
            'options' => new external_multiple_structure(new external_single_structure([
                'value' => new external_value(PARAM_RAW_TRIMMED, 'Opaque option value'),
                'label' => new external_value(PARAM_TEXT, 'Plain text option label'),
            ])),
            'dependencies' => new external_multiple_structure(new external_single_structure([
                'questionId' => new external_value(PARAM_INT, 'Parent question id'),
                'value' => new external_value(PARAM_RAW_TRIMMED, 'Expected option value'),
                'logic' => new external_value(PARAM_ALPHAEXT, 'equals or not_equals'),
            ])),
        ]);
    }

    private static function activity_structure(): external_single_structure {
        return new external_single_structure([
            'kind' => new external_value(PARAM_PLUGIN, 'Activity payload kind'),
            'anonymous' => new external_value(PARAM_BOOL, 'Anonymous response'),
            'status' => new external_value(PARAM_ALPHAEXT, 'Response state'),
            'availableFrom' => new external_value(PARAM_INT, 'Open timestamp'),
            'availableUntil' => new external_value(PARAM_INT, 'Close timestamp'),
            'responseId' => new external_value(PARAM_INT, 'Owned response id'),
            'canSave' => new external_value(PARAM_BOOL, 'May save and resume'),
            'canSubmit' => new external_value(PARAM_BOOL, 'May submit'),
            'canViewResponses' => new external_value(PARAM_BOOL, 'May view responses'),
            'questions' => new external_multiple_structure(self::question_structure()),
            'answers' => new external_multiple_structure(new external_single_structure([
                'questionId' => new external_value(PARAM_INT, 'Question id'),
                'values' => new external_multiple_structure(new external_value(PARAM_RAW, 'Answer value')),
            ])),
        ]);
    }

    private static function validate_visible_cm(int $cmid, ?string $modname = null): array {
        global $DB;
        $cm = get_coursemodule_from_id($modname ?? '', $cmid, 0, false, MUST_EXIST);
        $course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
        require_login($course, false, $cm);
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        $modinfo = get_fast_modinfo($course);
        $cminfo = $modinfo->get_cm($cm->id);
        if (!$cminfo->uservisible && !has_capability('moodle/course:viewhiddenactivities', $context)) {
            throw new moodle_exception('nopermissions', 'error', '', 'view activity');
        }
        return [$cm, $course, $context, $cminfo];
    }

    private static function plain_text(?string $value, context_module $context): string {
        if ($value === null || $value === '') {
            return '';
        }
        return trim(html_to_text(format_text($value, FORMAT_HTML, ['context' => $context]), 0, false));
    }

    public static function get_manifest_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function get_manifest(): array {
        $adapters = [];
        if (\core_component::get_plugin_directory('mod', 'questionnaire') !== null) {
            $adapters[] = ['modulename' => 'questionnaire', 'operations' => ['read', 'save', 'submit']];
        }
        return ['contractversion' => self::CONTRACT_VERSION, 'adapters' => $adapters];
    }

    public static function get_manifest_returns(): external_single_structure {
        return new external_single_structure([
            'contractversion' => new external_value(PARAM_INT, 'Contract version'),
            'adapters' => new external_multiple_structure(new external_single_structure([
                'modulename' => new external_value(PARAM_PLUGIN, 'Moodle module name'),
                'operations' => new external_multiple_structure(self::operation_structure()),
            ])),
        ]);
    }

    public static function get_branding_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function get_branding(): array {
        global $SITE;
        return ['sitename' => format_string($SITE->fullname), 'logourl' => ''];
    }

    public static function get_branding_returns(): external_single_structure {
        return new external_single_structure([
            'sitename' => new external_value(PARAM_TEXT, 'Safe display name'),
            'logourl' => new external_value(PARAM_URL, 'Optional HTTPS logo', VALUE_DEFAULT, ''),
        ]);
    }

    public static function get_activity_adapter_parameters(): external_function_parameters {
        return new external_function_parameters(['cmid' => new external_value(PARAM_INT, 'Course module id')]);
    }

    private static function questionnaire_questions(object $questionnaire, context_module $context): array {
        global $DB;
        $typekeys = [1 => 'yesno', 2 => 'text', 3 => 'textarea', 4 => 'radio', 5 => 'checkbox', 6 => 'select', 8 => 'scale', 9 => 'date', 10 => 'number', 11 => 'scale', 99 => 'pagebreak', 100 => 'info'];
        $records = $DB->get_records_select('questionnaire_question', 'surveyid = :sid AND deleted IS NULL', ['sid' => $questionnaire->sid], 'position ASC');
        $result = [];
        foreach ($records as $record) {
            if (!isset($typekeys[(int)$record->type_id])) {
                throw new moodle_exception('noadapter', 'local_nextmoodle');
            }
            $options = [];
            foreach ($DB->get_records('questionnaire_quest_choice', ['question_id' => $record->id], 'id ASC') as $choice) {
                $options[] = ['value' => (string)$choice->id, 'label' => self::plain_text($choice->content, $context)];
            }
            if ((int)$record->type_id === 1) {
                $options = [['value' => 'y', 'label' => get_string('yes')], ['value' => 'n', 'label' => get_string('no')]];
            }
            $dependencies = [];
            foreach ($DB->get_records('questionnaire_dependency', ['questionid' => $record->id], 'id ASC') as $dependency) {
                $parent = $records[$dependency->dependquestionid] ?? null;
                $value = (string)$dependency->dependchoiceid;
                if ($parent !== null && (int)$parent->type_id === 1) {
                    $value = (int)$dependency->dependchoiceid === 0 ? 'y' : 'n';
                }
                $dependencies[] = ['questionId' => (int)$dependency->dependquestionid, 'value' => $value, 'logic' => (int)$dependency->dependlogic === 0 ? 'equals' : 'not_equals'];
            }
            $result[] = [
                'id' => (int)$record->id,
                'kind' => $typekeys[(int)$record->type_id],
                'label' => self::plain_text($record->content, $context),
                'description' => '',
                'required' => $record->required === 'y',
                'min' => (int)$record->type_id === 10 ? (float)$record->length : null,
                'max' => (int)$record->type_id === 10 ? (float)$record->precise : null,
                'step' => (int)$record->type_id === 10 ? 1.0 : null,
                'options' => $options,
                'dependencies' => $dependencies,
            ];
        }
        return $result;
    }

    private static function questionnaire_answers(object $response): array {
        global $DB;
        $values = [];
        $tables = [
            'questionnaire_response_bool' => 'choice_id',
            'questionnaire_response_date' => 'response',
            'questionnaire_response_text' => 'response',
            'questionnaire_resp_single' => 'choice_id',
            'questionnaire_resp_multiple' => 'choice_id',
        ];
        foreach ($tables as $table => $field) {
            foreach ($DB->get_records($table, ['response_id' => $response->id], 'id ASC') as $record) {
                $values[(int)$record->question_id][] = (string)$record->{$field};
            }
        }
        $result = [];
        foreach ($values as $questionid => $answers) {
            $result[] = ['questionId' => $questionid, 'values' => $answers];
        }
        return $result;
    }

    public static function get_activity_adapter(int $cmid): array {
        global $CFG, $DB, $USER;
        $params = self::validate_parameters(self::get_activity_adapter_parameters(), ['cmid' => $cmid]);
        [$cm, , $context] = self::validate_visible_cm($params['cmid'], 'questionnaire');
        require_capability('mod/questionnaire:view', $context);
        require_once($CFG->dirroot . '/mod/questionnaire/locallib.php');
        require_once($CFG->dirroot . '/mod/questionnaire/questionnaire.class.php');
        $questionnaire = $DB->get_record('questionnaire', ['id' => $cm->instance], '*', MUST_EXIST);
        $now = time();
        $closed = !empty($questionnaire->closedate) && $questionnaire->closedate < $now;
        $notopen = !empty($questionnaire->opendate) && $questionnaire->opendate > $now;
        $response = null;
        if ($questionnaire->respondenttype !== 'anonymous') {
            $responses = $DB->get_records('questionnaire_response', ['questionnaireid' => $questionnaire->id, 'userid' => $USER->id], 'submitted DESC, id DESC', '*', 0, 1);
            $response = reset($responses) ?: null;
        }
        $submitted = $response !== null && $response->complete === 'y';
        $cansubmit = has_capability('mod/questionnaire:submit', $context) && !$closed && !$notopen && !$submitted;
        $canview = has_capability('mod/questionnaire:readallresponses', $context) || (has_capability('mod/questionnaire:readownresponses', $context) && ((int)$questionnaire->resp_view === 3 || ((int)$questionnaire->resp_view === 1 && $submitted) || ((int)$questionnaire->resp_view === 2 && $closed)));
        $operations = ['read'];
        if ($cansubmit && !empty($questionnaire->resume)) {
            $operations[] = 'save';
        }
        if ($cansubmit) {
            $operations[] = 'submit';
        }
        return [
            'contractversion' => self::CONTRACT_VERSION,
            'cmid' => (int)$cm->id,
            'modulename' => 'questionnaire',
            'source' => 'companion',
            'title' => format_string($questionnaire->name),
            'state' => 'available',
            'operations' => $operations,
            'blocks' => [['kind' => 'text', 'heading' => get_string('description'), 'text' => self::plain_text($questionnaire->intro, $context), 'tone' => 'info', 'label' => '', 'url' => '']],
            'activity' => [
                'kind' => 'questionnaire',
                'anonymous' => $questionnaire->respondenttype === 'anonymous',
                'status' => $submitted ? 'submitted' : ($closed ? 'closed' : ($response === null ? 'not_started' : 'in_progress')),
                'availableFrom' => (int)$questionnaire->opendate,
                'availableUntil' => (int)$questionnaire->closedate,
                'responseId' => $response === null ? 0 : (int)$response->id,
                'canSave' => $cansubmit && !empty($questionnaire->resume),
                'canSubmit' => $cansubmit,
                'canViewResponses' => $canview,
                'questions' => self::questionnaire_questions($questionnaire, $context),
                'answers' => $response === null ? [] : self::questionnaire_answers($response),
            ],
        ];
    }

    public static function get_activity_adapter_returns(): external_single_structure {
        return new external_single_structure([
            'contractversion' => new external_value(PARAM_INT, 'Contract version'),
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'modulename' => new external_value(PARAM_PLUGIN, 'Moodle module name'),
            'source' => new external_value(PARAM_ALPHA, 'companion or runtime'),
            'title' => new external_value(PARAM_TEXT, 'Display title'),
            'state' => new external_value(PARAM_ALPHAEXT, 'Capability state'),
            'operations' => new external_multiple_structure(self::operation_structure()),
            'blocks' => new external_multiple_structure(self::block_structure()),
            'activity' => self::activity_structure(),
        ]);
    }

    public static function execute_activity_action_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'action' => new external_value(PARAM_ALPHANUMEXT, 'save or submit'),
            'payloadjson' => new external_value(PARAM_RAW, 'Typed action payload JSON'),
        ]);
    }

    public static function execute_activity_action(int $cmid, string $action, string $payloadjson): array {
        global $CFG, $DB, $USER;
        $params = self::validate_parameters(self::execute_activity_action_parameters(), compact('cmid', 'action', 'payloadjson'));
        if (!in_array($params['action'], ['save', 'submit'], true) || strlen($params['payloadjson']) > 250000) {
            throw new moodle_exception('invalidparameter');
        }
        [$cm, $course, $context] = self::validate_visible_cm($params['cmid'], 'questionnaire');
        require_capability('mod/questionnaire:submit', $context);
        require_once($CFG->dirroot . '/mod/questionnaire/questionnaire.class.php');
        $record = $DB->get_record('questionnaire', ['id' => $cm->instance], '*', MUST_EXIST);
        $payload = json_decode($params['payloadjson'], true, 64, JSON_THROW_ON_ERROR);
        $responses = [];
        foreach (($payload['answers'] ?? []) as $questionid => $answer) {
            if (!ctype_digit((string)$questionid)) {
                throw new moodle_exception('invalidparameter');
            }
            if (is_array($answer)) {
                foreach ($answer as $choice) {
                    $responses[] = ['name' => 'q'.$questionid.'['.(string)$choice.']', 'value' => (string)$choice];
                }
            } else {
                $responses[] = ['name' => 'q'.$questionid, 'value' => (string)$answer];
            }
        }
        $questionnaire = new \questionnaire($course, $cm, 0, $record);
        $submit = $params['action'] === 'submit';
        $result = $questionnaire->save_mobile_data($USER->id, 0, $submit, (int)($payload['responseId'] ?? 0), $submit, $submit ? 'submit' : 'resume', $responses);
        $warnings = $result['warnings'] ?? [];
        if (is_string($warnings)) {
            $warnings = $warnings === '' ? [] : [$warnings];
        }
        return ['state' => $submit && empty($warnings) ? 'submitted' : 'in_progress', 'warnings' => array_values($warnings)];
    }

    public static function execute_activity_action_returns(): external_single_structure {
        return new external_single_structure([
            'state' => new external_value(PARAM_ALPHAEXT, 'in_progress or submitted'),
            'warnings' => new external_multiple_structure(new external_value(PARAM_TEXT, 'Validation warning')),
        ]);
    }

    public static function create_runtime_ticket_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'origin' => new external_value(PARAM_URL, 'Exact embedding origin'),
        ]);
    }

    public static function create_runtime_ticket(int $cmid, string $origin): array {
        $params = self::validate_parameters(self::create_runtime_ticket_parameters(), compact('cmid', 'origin'));
        [$cm] = self::validate_visible_cm($params['cmid']);
        if (!in_array($cm->modname, ['scorm', 'h5pactivity'], true)) {
            throw new moodle_exception('noadapter', 'local_nextmoodle');
        }
        $scheme = parse_url($params['origin'], PHP_URL_SCHEME);
        if ($scheme !== 'https') {
            throw new moodle_exception('invalidparameter');
        }
        $ticket = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $expiresat = time() + 60;
        cache::make('local_nextmoodle', 'runtime_tickets')->set(hash('sha256', $ticket), [
            'cmid' => (int)$cm->id,
            'expiresat' => $expiresat,
            'origin' => $params['origin'],
            'userid' => (int)$GLOBALS['USER']->id,
        ]);
        return ['ticket' => $ticket, 'expiresat' => $expiresat];
    }

    public static function create_runtime_ticket_returns(): external_single_structure {
        return new external_single_structure([
            'ticket' => new external_value(PARAM_RAW_TRIMMED, 'Opaque single-use ticket'),
            'expiresat' => new external_value(PARAM_INT, 'Expiry timestamp'),
        ]);
    }
}
