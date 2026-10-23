import { deleteCase, getCaseBundle, initializeArchive, setCaseWatchlist } from "./data.js";

const content = document.querySelector("#case-content");
const caseId = new URLSearchParams(window.location.search).get("id");

function addBadge(container, text, kind = "") {
  const element = document.createElement("span");
  element.className = `badge${kind ? ` badge-${kind}` : ""}`;
  element.textContent = text;
  container.append(element);
  return element;
}

function addText(parent, tagName, text, className = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function appendSection(parent, headingText, emptyMessage, records, renderRecord) {
  const section = document.createElement("section");
  section.className = `case-section${headingText === "Timeline" ? " timeline-section" : headingText === "Overview" ? " overview-section" : ""}`;
  addText(section, "h2", headingText);
  if (records.length === 0) {
    addText(section, "p", emptyMessage);
  } else {
    const list = document.createElement("div");
    list.className = "detail-list";
    for (const record of records) list.append(renderRecord(record));
    section.append(list);
  }
  parent.append(section);
}

function renderTimeline(record) {
  const item = document.createElement("article");
  item.className = "detail-item";
  if (record.dateText) addText(item, "p", record.dateText, "detail-kicker");
  addText(item, "p", record.description || "No event details provided.");
  if (record.reliability) addBadge(item, record.reliability, "reliability");
  return item;
}

function renderPerson(record) {
  const item = document.createElement("article");
  item.className = "detail-item";
  addText(item, "h3", record.name || "Unnamed person");
  if (record.role) addText(item, "p", record.role, "detail-kicker");
  if (record.details) addText(item, "p", record.details);
  return item;
}

function renderEvidence(record) {
  const item = document.createElement("article");
  item.className = "detail-item";
  addText(item, "h3", record.title || "Evidence item");
  if (record.details) addText(item, "p", record.details);
  if (record.reliability) addBadge(item, record.reliability, "reliability");
  return item;
}

function renderSource(record) {
  const item = document.createElement("article");
  item.className = "detail-item source-item";
  const link = document.createElement("a");
  link.href = record.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = record.title || record.url;
  item.append(link);
  if (record.publisher) addText(item, "p", record.publisher, "detail-kicker");
  if (record.notes) addText(item, "p", record.notes);
  return item;
}

function renderNote(record) {
  const item = document.createElement("article");
  item.className = "detail-item personal-note";
  addText(item, "p", record.text || "");
  return item;
}

async function removeCurrentCase() {
  const confirmed = window.confirm("Delete this case and all of its timeline events, people, evidence, sources, and personal notes? This cannot be undone.");
  if (!confirmed) return;
  try {
    await deleteCase(caseId);
    window.location.href = "index.html";
  } catch (error) {
    const message = document.querySelector("#case-action-message");
    message.className = "form-message error";
    message.textContent = `The case was not deleted. ${error.message}`;
  }
}

async function toggleWatchlist(caseRecord, button) {
  const nextValue = !Boolean(caseRecord.isWatchlisted);
  button.disabled = true;
  try {
    await setCaseWatchlist(caseRecord.id, nextValue);
    caseRecord.isWatchlisted = nextValue;
    button.textContent = nextValue ? "Remove from My Archive" : "Add to My Archive watchlist";
    button.setAttribute("aria-pressed", String(nextValue));
    const message = document.querySelector("#case-action-message");
    message.className = "form-message success";
    message.textContent = nextValue ? "Added to your My Archive watchlist." : "Removed from your My Archive watchlist.";
    window.dispatchEvent(new CustomEvent("aftercase:collectionchanged"));
  } catch (error) {
    const message = document.querySelector("#case-action-message");
    message.className = "form-message error";
    message.textContent = `The watchlist was not updated. ${error.message}`;
  } finally {
    button.disabled = false;
  }
}

function renderBundle(bundle) {
  content.replaceChildren();
  const back = document.createElement("a");
  back.className = "back-link";
  back.href = "index.html";
  back.textContent = "← Explore Cases";
  content.append(back);

  if (!bundle) {
    const missing = document.createElement("section");
    missing.className = "empty-state";
    addText(missing, "h1", "Case file unavailable");
    addText(missing, "p", "This case could not be found in the local archive. It may have been removed.");
    content.append(missing);
    return;
  }

  const { caseRecord, timelineEvents, people, evidenceItems, sources, personalNotes } = bundle;
  const header = document.createElement("header");
  header.className = "case-header";
  addText(header, "p", caseRecord.caseNumber ? `CASE ${caseRecord.caseNumber}` : "CASE FILE", "eyebrow");
  addText(header, "h1", caseRecord.title || "Untitled case");
  const badges = document.createElement("div");
  badges.className = "case-header-meta";
  if (caseRecord.realWorldStatus) addBadge(badges, caseRecord.realWorldStatus, "status");
  addBadge(badges, caseRecord.myProgress || "Not Started", "progress");
  if (caseRecord.isDemo) addBadge(badges, "SAMPLE", "sample");
  header.append(badges);

  const actions = document.createElement("div");
  actions.className = "case-actions";
  const edit = document.createElement("a");
  edit.className = "primary-button";
  edit.href = `case-form.html?id=${encodeURIComponent(caseRecord.id)}`;
  edit.textContent = "Edit Case";
  const watchlist = document.createElement("button");
  watchlist.className = "secondary-button";
  watchlist.type = "button";
  watchlist.textContent = caseRecord.isWatchlisted ? "Remove from My Archive" : "Add to My Archive watchlist";
  watchlist.setAttribute("aria-pressed", String(Boolean(caseRecord.isWatchlisted)));
  watchlist.addEventListener("click", () => toggleWatchlist(caseRecord, watchlist));
  const remove = document.createElement("button");
  remove.className = "danger-button";
  remove.type = "button";
  remove.textContent = "Delete Case";
  remove.addEventListener("click", removeCurrentCase);
  actions.append(edit, watchlist, remove);
  header.append(actions);
  content.append(header);

  appendSection(content, "Overview", "No overview has been added yet.", caseRecord.summary ? [caseRecord] : [], (record) => {
    const item = document.createElement("article");
    item.className = "detail-item";
    addText(item, "p", record.summary);
    if (record.location) addText(item, "p", record.location, "detail-kicker");
    if (record.categories?.length) addText(item, "p", `Categories: ${record.categories.join(", ")}`, "detail-kicker");
    return item;
  });
  appendSection(content, "Timeline", "No timeline events have been added yet.", timelineEvents, renderTimeline);
  appendSection(content, "People Involved", "No people have been added yet.", people, renderPerson);
  appendSection(content, "Evidence and Important Details", "No evidence or important details have been added yet.", evidenceItems, renderEvidence);
  appendSection(content, "Sources", "No sources have been added yet.", sources, renderSource);
  appendSection(content, "Personal Notes", "No personal notes have been added yet.", personalNotes, renderNote);
  addText(content, "p", "", "form-message").id = "case-action-message";

  if (!caseRecord.summary || !caseRecord.location || !caseRecord.categories?.length) {
    const incomplete = document.createElement("aside");
    incomplete.className = "case-incomplete";
    incomplete.textContent = "Some case information is incomplete. Missing details have not been filled in.";
    content.append(incomplete);
  }
}

async function start() {
  try {
    await initializeArchive();
    renderBundle(caseId ? await getCaseBundle(caseId) : null);
  } catch (error) {
    const message = document.createElement("section");
    message.className = "empty-state";
    addText(message, "h1", "The case file could not be opened");
    addText(message, "p", error.message);
    content.replaceChildren(message);
  } finally {
    content.setAttribute("aria-busy", "false");
  }
}

start();
