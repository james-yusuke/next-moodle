import { firstField, numberField } from "./params";
import type { RestContext } from "./rest-context";
import type { MoodleFunction } from "./types";

const glossaryEntries = (context: RestContext): readonly Record<string, unknown>[] => {
  const baseline = context.user.key === "alice" ? [{
    approved: true,
    concept: "Transect",
    definition: "<p>A fixed line used to record observations consistently.</p>",
    id: 7301,
    timecreated: 1_790_000_000,
    timemodified: 1_790_000_000,
    userfullname: "Fixture Learner",
  }] : [];
  const created = (context.state.glossaryEntries.get(context.user.key) ?? []).map((entry) => ({
    ...entry,
    approved: true,
    timecreated: 1_790_000_300,
    timemodified: 1_790_000_300,
    userfullname: context.user.fullname,
  }));
  return [...baseline, ...created];
};

const addGlossaryEntry = (context: RestContext): Record<string, unknown> => {
  const entry = {
    concept: firstField(context.input, "concept") ?? "Term",
    definition: firstField(context.input, "definition") ?? "",
    id: context.state.nextGlossaryEntryId,
  };
  context.state.nextGlossaryEntryId += 1;
  context.state.glossaryEntries.set(context.user.key, [
    ...(context.state.glossaryEntries.get(context.user.key) ?? []),
    entry,
  ]);
  return { entryid: entry.id, warnings: [] };
};

const wikiPage = (context: RestContext): Record<string, unknown> => {
  const state = context.state.wikiPages.get(`${context.user.key}:7401`);
  return {
    cachedcontent: state?.content ?? "<h2>Field protocol</h2><p>Record location, time, weather, and species count.</p>",
    caneditpage: true,
    id: 7401,
    readonly: 0,
    subwikiid: 7400,
    timecreated: 1_790_000_000,
    timemodified: state === undefined ? 1_790_000_000 : 1_790_000_300,
    title: "Field protocol",
  };
};

const wikiForEditing = (context: RestContext): Record<string, unknown> => {
  const state = context.state.wikiPages.get(`${context.user.key}:7401`);
  return {
    pagesection: {
      content: state?.content ?? "<h2>Field protocol</h2><p>Record location, time, weather, and species count.</p>",
      contentformat: "html",
      version: state?.version ?? 1,
      warnings: [],
    },
  };
};

const editWiki = (context: RestContext): Record<string, unknown> => {
  const pageId = numberField(context.input, "pageid") ?? 7401;
  const previous = context.state.wikiPages.get(`${context.user.key}:${pageId}`);
  context.state.wikiPages.set(`${context.user.key}:${pageId}`, {
    content: firstField(context.input, "content") ?? "",
    version: (previous?.version ?? 1) + 1,
  });
  return { pageid: pageId, warnings: [] };
};

const databaseEntries = (context: RestContext): readonly Record<string, unknown>[] => {
  const baseline = context.user.key === "alice" ? [{ id: 7700, label: "Tide line", notes: "Barnacles observed near the upper zone." }] : [];
  return [...baseline, ...(context.state.databaseEntries.get(context.user.key) ?? [])];
};

const addDatabaseEntry = (context: RestContext): Record<string, unknown> => {
  const values = new Map<number, string>();
  const fieldKeys = [...context.input.fields.keys()].filter((key) => /^data\[\d+\]\[fieldid\]$/.test(key));
  for (const fieldKey of fieldKeys) {
    const fieldId = Number(context.input.fields.get(fieldKey)?.[0] ?? "0");
    const valueKey = fieldKey.replace("[fieldid]", "[value]");
    const wireValue = context.input.fields.get(valueKey)?.[0] ?? '""';
    try {
      const decoded: unknown = JSON.parse(wireValue);
      values.set(fieldId, typeof decoded === "string" ? decoded : "");
    } catch {
      values.set(fieldId, "");
    }
  }
  const entry = { id: context.state.nextDatabaseEntryId, label: values.get(7701) ?? "", notes: values.get(7702) ?? "" };
  context.state.nextDatabaseEntryId += 1;
  context.state.databaseEntries.set(context.user.key, [...(context.state.databaseEntries.get(context.user.key) ?? []), entry]);
  return { fieldnotifications: [], generalnotifications: [], newentryid: entry.id, warnings: [] };
};

const workshopSubmissions = (context: RestContext): readonly Record<string, unknown>[] => {
  const submission = context.state.workshopSubmissions.get(context.user.key);
  if (submission === undefined) return [];
  return [{ ...submission, authorid: context.user.userid, contentformat: 2, example: false, timecreated: 1_790_000_300, timemodified: 1_790_000_300, workshopid: 513 }];
};

const saveWorkshopSubmission = (context: RestContext): Record<string, unknown> => {
  const current = context.state.workshopSubmissions.get(context.user.key);
  const id = numberField(context.input, "submissionid") ?? current?.id ?? context.state.nextWorkshopSubmissionId;
  if (current === undefined) context.state.nextWorkshopSubmissionId += 1;
  context.state.workshopSubmissions.set(context.user.key, {
    content: firstField(context.input, "content") ?? "",
    id,
    title: firstField(context.input, "title") ?? "Field report",
  });
  return { status: true, submissionid: id, warnings: [] };
};

export function knowledgePayload(functionName: MoodleFunction, context: RestContext): unknown | undefined {
  if (functionName === "mod_glossary_get_glossaries_by_courses") return { glossaries: context.user.key === "alice" ? [{ id: 508, course: 101, coursemodule: 9108, name: "Coastal field glossary", canaddentry: 1 }] : [], warnings: [] };
  if (functionName === "mod_glossary_get_entries_by_letter") {
    const entries = glossaryEntries(context);
    return { count: entries.length, entries, ratinginfo: {}, warnings: [] };
  }
  if (functionName === "mod_glossary_add_entry") return addGlossaryEntry(context);
  if (functionName === "mod_wiki_get_wikis_by_courses") return { wikis: context.user.key === "alice" ? [{ id: 509, course: 101, coursemodule: 9109, name: "Observation protocol wiki", cancreatepages: true, defaultformat: "html" }] : [], warnings: [] };
  if (functionName === "mod_wiki_get_subwiki_pages") return { pages: context.user.key === "alice" ? [wikiPage(context)] : [], warnings: [] };
  if (functionName === "mod_wiki_get_page_for_editing") return wikiForEditing(context);
  if (functionName === "mod_wiki_edit_page") return editWiki(context);
  if (functionName === "mod_feedback_get_feedbacks_by_courses") return { feedbacks: context.user.key === "alice" ? [{ id: 510, course: 101, coursemodule: 9110, name: "Field session feedback" }] : [], warnings: [] };
  if (functionName === "mod_feedback_launch_feedback") return { gopage: 0, warnings: [] };
  if (functionName === "mod_feedback_get_page_items") return {
    hasnextpage: false,
    hasprevpage: false,
    items: context.user.key === "alice" ? [
      { id: 7501, name: "What worked well?", presentation: "", typ: "textarea", hasvalue: 1, required: true },
      { id: 7502, name: "Preferred field site", presentation: "r>>>>>Rocky shore|Tidal marsh|Sandy beach", typ: "multichoice", hasvalue: 1, required: true },
    ] : [],
    warnings: [],
  };
  if (functionName === "mod_feedback_process_page") {
    const responses: Record<string, string> = {};
    const names = [...context.input.fields.entries()].filter(([key]) => /^responses\[\d+\]\[name\]$/.test(key));
    for (const [nameKey, nameValues] of names) {
      const valueKey = nameKey.replace("[name]", "[value]");
      const responseName = nameValues[0];
      if (responseName !== undefined) responses[responseName] = context.input.fields.get(valueKey)?.[0] ?? "";
    }
    context.state.feedbackSubmissions.set(context.user.key, responses);
    return { completed: true, completionpagecontents: "", jumpto: 0, siteaftersubmit: "", warnings: [] };
  }
  if (functionName === "mod_lesson_get_lessons_by_courses") return { lessons: context.user.key === "alice" ? [{ id: 511, course: 101, coursemodule: 9111, name: "Reading the shoreline" }] : [], warnings: [] };
  if (functionName === "mod_lesson_launch_attempt") return { messages: [], warnings: [] };
  if (functionName === "mod_lesson_get_page_data") return {
    answers: [],
    contentfiles: [],
    displaymenu: false,
    messages: [],
    newpageid: 7601,
    ongoingcore: "",
    page: { id: 7601, lessonid: 511, prevpageid: 0, nextpageid: -9, qtype: 3, qoption: 0, layout: 1, display: 1, timecreated: 1_790_000_000, timemodified: 1_790_000_000, title: "Observation order", contents: "<p>Which detail should be recorded first?</p>", contentsformat: 1, displayinmenublock: false, type: 0, typeid: 3, typestring: "Multichoice" },
    pagecontent: '<h3>Which detail should be recorded first?</h3><label><input name="answer" required type="radio" value="1">Location</label><label><input name="answer" required type="radio" value="2">Conclusion</label>',
    progress: 60,
    warnings: [],
  };
  if (functionName === "mod_lesson_process_page") {
    const responses: Record<string, string> = {};
    const names = [...context.input.fields.entries()].filter(([key]) => /^data\[\d+\]\[name\]$/.test(key));
    for (const [nameKey, nameValues] of names) {
      const responseName = nameValues[0];
      if (responseName !== undefined) responses[responseName] = context.input.fields.get(nameKey.replace("[name]", "[value]"))?.[0] ?? "";
    }
    context.state.lessonSubmissions.set(context.user.key, responses);
    return { newpageid: -9, inmediatejump: false, nodefaultresponse: false, feedback: "", attemptsremaining: 0, correctanswer: true, noanswer: false, isessayquestion: false, maxattemptsreached: false, response: "", studentanswer: "", userresponse: "", reviewmode: false, ongoingcore: "", progress: 100, displaymenu: false, messages: [], warnings: [] };
  }
  if (functionName === "mod_lesson_finish_attempt") return { data: [], messages: [], warnings: [] };
  if (functionName === "mod_data_get_databases_by_courses") return { databases: context.user.key === "alice" ? [{ course: 101, coursemodule: 9112, id: 512, name: "Field observation records" }] : [], warnings: [] };
  if (functionName === "mod_data_get_data_access_information") return { canaddentry: true, canapprove: false, canmanageentries: false, entrieslefttoadd: 10, entrieslefttoview: 0, groupid: 0, inreadonlyperiod: false, numentries: databaseEntries(context).length, timeavailable: true, warnings: [] };
  if (functionName === "mod_data_get_fields") return { fields: [{ dataid: 512, description: "A short label", id: 7701, name: "Label", param1: null, required: true, type: "text" }, { dataid: 512, description: "What was observed", id: 7702, name: "Notes", param1: null, required: false, type: "textarea" }], warnings: [] };
  if (functionName === "mod_data_get_entries") {
    const entries = databaseEntries(context);
    return { entries: [], listviewcontents: `<div class="database-list">${entries.map((entry) => `<article><h3>${entry["label"]}</h3><p>${entry["notes"]}</p></article>`).join("")}</div>`, totalcount: entries.length, totalfilesize: 0, warnings: [] };
  }
  if (functionName === "mod_data_add_entry") return addDatabaseEntry(context);
  if (functionName === "mod_workshop_get_workshops_by_courses") return { workshops: context.user.key === "alice" ? [{ course: 101, coursemodule: 9113, id: 513, instructauthors: "<p>Summarize one observation and explain the evidence.</p>", name: "Peer field report", phase: 20 }] : [], warnings: [] };
  if (functionName === "mod_workshop_get_workshop_access_information") return { creatingsubmissionallowed: context.state.workshopSubmissions.get(context.user.key) === undefined, modifyingsubmissionallowed: true, assessingallowed: false, assessingexamplesallowed: false, examplesassessedbeforeassessment: true, examplesassessedbeforesubmission: true, warnings: [] };
  if (functionName === "mod_workshop_get_user_plan") return { userplan: { examples: [], phases: [{ actions: [], active: true, code: 20, tasks: [], title: "Submission phase" }] }, warnings: [] };
  if (functionName === "mod_workshop_get_submissions") { const submissions = workshopSubmissions(context); return { submissions, totalcount: submissions.length, totalfilesize: 0, warnings: [] }; }
  if (functionName === "mod_workshop_add_submission" || functionName === "mod_workshop_update_submission") return saveWorkshopSubmission(context);
  return undefined;
}
