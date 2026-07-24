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
            'rateOptions' => new external_multiple_structure(new external_single_structure([
                'value' => new external_value(PARAM_RAW_TRIMMED, 'Opaque rate value'),
                'label' => new external_value(PARAM_TEXT, 'Plain text rate label'),
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
                'rateValues' => new external_multiple_structure(new external_single_structure([
                    'choiceId' => new external_value(PARAM_RAW_TRIMMED, 'Rate row id'),
                    'value' => new external_value(PARAM_RAW, 'Rate answer value'),
                ])),
            ])),
        ], 'Typed Questionnaire activity', VALUE_OPTIONAL);
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

    private static function questionnaire_question_kind(object $question): ?string {
        switch ((int)$question->type_id) {
            case 1:
                return 'yesno';
            case 2:
                return 'text';
            case 3:
                return 'textarea';
            case 4:
                return 'radio';
            case 5:
                return 'checkbox';
            case 6:
                return 'select';
            case 8:
                return 'rate';
            case 9:
                return 'date';
            case 10:
                return 'number';
            case 99:
                return 'pagebreak';
            case 100:
                return 'info';
            default:
                return null;
        }
    }

    private static function questionnaire_questions(object $questionnaire, context_module $context): ?array {
        global $DB;
        $result = [];
        foreach ($questionnaire->questions as $question) {
            $kind = self::questionnaire_question_kind($question);
            if ($kind === null) {
                return null;
            }
            $options = [];
            $rateoptions = [];
            if (in_array($kind, ['radio', 'checkbox', 'rate', 'select'], true)) {
                // The additional free-text field used by an "Other" choice
                // must never be omitted from a submitted response.
                if ($kind === 'rate' && $question->no_duplicate_choices()) {
                    return null;
                }
                foreach ($question->choices as $choice) {
                    if ($choice->is_other_choice()) {
                        return null;
                    }
                    $choicecontent = questionnaire_choice_values($choice->content);
                    $options[] = [
                        'value' => (string)$choice->id,
                        'label' => self::plain_text($choicecontent->text, $context),
                    ];
                }
            }
            if ($kind === 'rate') {
                foreach ($question->mobile_question_rates_display() as $rate) {
                    $rateoptions[] = [
                        // Questionnaire's mobile endpoint expects the label for
                        // named degrees, then resolves it to its stored rank.
                        'value' => (string)$rate->label,
                        'label' => self::plain_text((string)$rate->label, $context),
                    ];
                }
                if ($question->has_na_column()) {
                    $rateoptions[] = ['value' => '-1', 'label' => get_string('notapplicable', 'questionnaire')];
                }
            }
            if ($kind === 'yesno') {
                $options = [['value' => 'y', 'label' => get_string('yes')], ['value' => 'n', 'label' => get_string('no')]];
            }
            $dependencies = [];
            foreach ($DB->get_records('questionnaire_dependency', ['questionid' => $question->id], 'id ASC') as $dependency) {
                $parent = $questionnaire->questions[$dependency->dependquestionid] ?? null;
                $value = (string)$dependency->dependchoiceid;
                if ($parent !== null && (int)$parent->type_id === 1) {
                    $value = (int)$dependency->dependchoiceid === 0 ? 'y' : 'n';
                }
                $dependencies[] = ['questionId' => (int)$dependency->dependquestionid, 'value' => $value, 'logic' => (int)$dependency->dependlogic === 0 ? 'equals' : 'not_equals'];
            }
            $result[] = [
                'id' => (int)$question->id,
                'kind' => $kind,
                'label' => $kind === 'info' ? '' : self::plain_text($question->content, $context),
                'description' => $kind === 'info' ? self::plain_text($question->content, $context) : '',
                'required' => $question->required === 'y',
                'min' => null,
                'max' => $kind === 'text' && (int)$question->precise > 0 ? (float)$question->precise : null,
                'step' => $kind === 'number' && (int)$question->precise > 0 ? pow(10, -(int)$question->precise) : ($kind === 'number' ? 1.0 : null),
                'options' => $options,
                'rateOptions' => $rateoptions,
                'dependencies' => $dependencies,
            ];
        }
        return $result;
    }

    private static function questionnaire_unavailable_payload(object $cm, object $questionnaire, context_module $context): array {
        return [
            'contractversion' => self::CONTRACT_VERSION,
            'cmid' => (int)$cm->id,
            'modulename' => 'questionnaire',
            'source' => 'companion',
            'title' => format_string($questionnaire->name),
            'state' => 'adapter_required',
            'operations' => ['read'],
            'blocks' => [[
                'kind' => 'notice',
                'heading' => '',
                'text' => 'This Questionnaire uses a question type that is not supported by the typed adapter.',
                'tone' => 'info',
                'label' => '',
                'url' => '',
            ]],
        ];
    }

    private static function questionnaire_answers(object $response, object $questionnaire): array {
        global $DB;
        $values = [];
        $ratevalues = [];
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
        foreach ($DB->get_records('questionnaire_response_rank', ['response_id' => $response->id], 'id ASC') as $record) {
            $question = $questionnaire->questions[(int)$record->question_id] ?? null;
            $value = (string)$record->rankvalue;
            if ($question !== null && !empty($question->nameddegrees) && array_key_exists((string)$record->rankvalue, $question->nameddegrees)) {
                $value = (string)$question->nameddegrees[(string)$record->rankvalue];
            }
            $ratevalues[(int)$record->question_id][] = ['choiceId' => (string)$record->choice_id, 'value' => $value];
        }
        $result = [];
        foreach (array_unique(array_merge(array_keys($values), array_keys($ratevalues))) as $questionid) {
            $result[] = [
                'questionId' => $questionid,
                'values' => $values[$questionid] ?? [],
                'rateValues' => $ratevalues[$questionid] ?? [],
            ];
        }
        return $result;
    }

    public static function get_activity_adapter(int $cmid): array {
        global $CFG, $DB, $USER;
        $params = self::validate_parameters(self::get_activity_adapter_parameters(), ['cmid' => $cmid]);
        [$cm, $course, $context] = self::validate_visible_cm($params['cmid'], 'questionnaire');
        require_capability('mod/questionnaire:view', $context);
        require_once($CFG->dirroot . '/mod/questionnaire/locallib.php');
        require_once($CFG->dirroot . '/mod/questionnaire/questionnaire.class.php');
        $questionnaire = $DB->get_record('questionnaire', ['id' => $cm->instance], '*', MUST_EXIST);
        $questionnaireobject = new \questionnaire($course, $cm, 0, $questionnaire);
        $questions = self::questionnaire_questions($questionnaireobject, $context);
        if ($questions === null) {
            return self::questionnaire_unavailable_payload($cm, $questionnaire, $context);
        }
        $now = time();
        $closed = !empty($questionnaire->closedate) && $questionnaire->closedate < $now;
        $notopen = !empty($questionnaire->opendate) && $questionnaire->opendate > $now;
        $responses = $DB->get_records('questionnaire_response', ['questionnaireid' => $questionnaire->id, 'userid' => $USER->id], 'submitted DESC, id DESC', '*', 0, 1);
        $response = reset($responses) ?: null;
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
                'questions' => $questions,
                'answers' => $response === null ? [] : self::questionnaire_answers($response, $questionnaireobject),
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

    private static function questionnaire_answer_present($answer): bool {
        return is_array($answer) ? count($answer) > 0 : is_string($answer) && $answer !== '';
    }

    private static function questionnaire_question_visible(array $question, array $answers): bool {
        foreach ($question['dependencies'] as $dependency) {
            $answer = $answers[(string)$dependency['questionId']] ?? '';
            $matches = is_array($answer)
                ? in_array($dependency['value'], $answer, true) || in_array($dependency['value'], array_values($answer), true)
                : $answer === $dependency['value'];
            if (($dependency['logic'] === 'equals' && !$matches) || ($dependency['logic'] === 'not_equals' && $matches)) {
                return false;
            }
        }
        return true;
    }

    private static function questionnaire_mobile_responses(object $questionnaire, array $questions, array $answers, bool $requireanswers): array {
        $responses = [];
        $questionsbyid = [];
        foreach ($questions as $questiondata) {
            $questionsbyid[(string)$questiondata['id']] = $questiondata;
        }
        foreach ($answers as $questionid => $answer) {
            if (!ctype_digit((string)$questionid) || !isset($questionsbyid[(string)$questionid])) {
                throw new moodle_exception('invalidparameter');
            }
            $questiondata = $questionsbyid[(string)$questionid];
            if (!self::questionnaire_question_visible($questiondata, $answers)) {
                continue;
            }
            $question = $questionnaire->questions[(int)$questionid];
            $kind = $questiondata['kind'];
            if (in_array($kind, ['info', 'pagebreak'], true)) {
                throw new moodle_exception('invalidparameter');
            }
            if ($kind === 'checkbox') {
                if (!is_array($answer)) {
                    throw new moodle_exception('invalidparameter');
                }
                foreach ($answer as $choiceid) {
                    if (!is_string($choiceid) || !ctype_digit($choiceid) || !isset($question->choices[(int)$choiceid])) {
                        throw new moodle_exception('invalidparameter');
                    }
                    $responses[$question->mobile_fieldkey((int)$choiceid)] = 1;
                }
                continue;
            }
            if ($kind === 'rate') {
                if (!is_array($answer) || count($answer) > count($question->choices)) {
                    throw new moodle_exception('invalidparameter');
                }
                $allowedrates = array_column($questiondata['rateOptions'], 'value');
                foreach ($answer as $choiceid => $ratevalue) {
                    if (!ctype_digit((string)$choiceid) || !isset($question->choices[(int)$choiceid]) ||
                        !is_string($ratevalue) || !in_array($ratevalue, $allowedrates, true)) {
                        throw new moodle_exception('invalidparameter');
                    }
                    $responses[$question->mobile_fieldkey((int)$choiceid)] = $ratevalue;
                }
                continue;
            }
            if (!is_string($answer)) {
                throw new moodle_exception('invalidparameter');
            }
            if ($answer === '') {
                continue;
            }
            if ($kind === 'yesno') {
                if ($answer !== 'y' && $answer !== 'n') {
                    throw new moodle_exception('invalidparameter');
                }
                $responses[$question->mobile_fieldkey()] = $answer === 'y' ? 1 : 0;
            } else if ($kind === 'radio' || $kind === 'select') {
                if (!ctype_digit($answer) || !isset($question->choices[(int)$answer])) {
                    throw new moodle_exception('invalidparameter');
                }
                $responses[$question->mobile_fieldkey()] = (int)$answer;
            } else if ($kind === 'date') {
                $parts = explode('-', $answer);
                if (count($parts) !== 3 || !checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0])) {
                    throw new moodle_exception('invalidparameter');
                }
                $responses[$question->mobile_fieldkey()] = $answer;
            } else if ($kind === 'number') {
                if (!is_numeric($answer)) {
                    throw new moodle_exception('invalidparameter');
                }
                $responses[$question->mobile_fieldkey()] = $answer;
            } else {
                if ($kind === 'text' && $questiondata['max'] !== null && \core_text::strlen($answer) > (int)$questiondata['max']) {
                    throw new moodle_exception('invalidparameter');
                }
                $responses[$question->mobile_fieldkey()] = $answer;
            }
        }
        if ($requireanswers) {
            foreach ($questions as $questiondata) {
                if (!$questiondata['required'] || !self::questionnaire_question_visible($questiondata, $answers)) {
                    continue;
                }
                $answer = $answers[(string)$questiondata['id']] ?? '';
                if (!self::questionnaire_answer_present($answer)) {
                    throw new moodle_exception('invalidparameter');
                }
                if ($questiondata['kind'] === 'rate' &&
                    (!is_array($answer) || count($answer) !== count($questiondata['options']))) {
                    throw new moodle_exception('invalidparameter');
                }
            }
        }
        return $responses;
    }

    private static function questionnaire_clear_response_answers(int $responseid): void {
        global $DB;
        foreach ([
            'questionnaire_response_bool', 'questionnaire_response_date', 'questionnaire_response_other',
            'questionnaire_resp_multiple', 'questionnaire_resp_single', 'questionnaire_response_rank', 'questionnaire_response_text',
        ] as $table) {
            $DB->delete_records($table, ['response_id' => $responseid]);
        }
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
        try {
            $payload = json_decode($params['payloadjson'], true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new moodle_exception('invalidparameter');
        }
        if (!is_array($payload) || !isset($payload['answers']) || !is_array($payload['answers'])) {
            throw new moodle_exception('invalidparameter');
        }
        $responseid = $payload['responseId'] ?? 0;
        if (!is_int($responseid) || $responseid < 0) {
            throw new moodle_exception('invalidparameter');
        }
        $now = time();
        if ((!empty($record->opendate) && $record->opendate > $now) || (!empty($record->closedate) && $record->closedate < $now)) {
            throw new moodle_exception('nopermissions', 'error', '', 'submit response');
        }
        if ($params['action'] === 'save' && empty($record->resume)) {
            throw new moodle_exception('invalidparameter');
        }
        $questionnaire = new \questionnaire($course, $cm, 0, $record);
        $questions = self::questionnaire_questions($questionnaire, $context);
        if ($questions === null) {
            throw new moodle_exception('noadapter', 'local_nextmoodle');
        }
        $responses = self::questionnaire_mobile_responses(
            $questionnaire,
            $questions,
            $payload['answers'],
            $params['action'] === 'submit',
        );
        if ($responseid > 0) {
            $existing = $DB->get_record('questionnaire_response', ['id' => $responseid], '*', IGNORE_MISSING);
            if ($existing === false || (int)$existing->questionnaireid !== (int)$record->id || (int)$existing->userid !== (int)$USER->id || $existing->complete === 'y') {
                throw new moodle_exception('nopermissions', 'error', '', 'modify response');
            }
        }
        $submit = $params['action'] === 'submit';
        $transaction = $DB->start_delegated_transaction();
        if ($responseid > 0) {
            self::questionnaire_clear_response_answers($responseid);
        }
        $response = $questionnaire->build_response_from_appdata((object)$responses, 0);
        $response->rid = $responseid;
        $response->id = $responseid;
        $sections = array_keys($questionnaire->questionsbysec ?? []);
        if (empty($sections)) {
            $sections = [1];
        }
        foreach ($sections as $section) {
            $response->sec = $section;
            $responseid = $questionnaire->response_insert($response, $USER->id);
        }
        if ($submit) {
            $questionnaire->commit_submission_response($responseid, $USER->id);
        }
        $transaction->allow_commit();
        return ['state' => $submit ? 'submitted' : 'in_progress', 'responseid' => $responseid, 'warnings' => []];
    }

    public static function execute_activity_action_returns(): external_single_structure {
        return new external_single_structure([
            'state' => new external_value(PARAM_ALPHAEXT, 'in_progress or submitted'),
            'responseid' => new external_value(PARAM_INT, 'Owned response id'),
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
