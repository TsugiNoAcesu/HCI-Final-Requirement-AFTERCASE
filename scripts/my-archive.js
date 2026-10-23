import { getCollectionBundle, initializeArchive } from "./data.js";

const content = document.querySelector("#my-archive-content");

function addText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function caseLink(caseRecord) {
  const link = document.createElement("a");
  link.className = "archive-case-link";
  link.href = `case.html?id=${encodeURIComponent(caseRecord.id)}`;
  link.textContent = `${caseRecord.caseNumber ? `${caseRecord.caseNumber} · ` : ""}${caseRecord.title || "Untitled case"}`;
  return link;
}

function renderCaseSection(title, description, cases) {
  const section = document.createElement("section");
  section.className = "my-archive-section";
  section.setAttribute("aria-label", title);
  const heading = document.createElement("div");
  heading.className = "section-heading";
  const copy = document.createElement("div");
  addText(copy, "p", "MY ARCHIVE", "eyebrow");
  addText(copy, "h2", title);
  heading.append(copy);
  addText(heading, "p", description, "muted");
  section.append(heading);

  if (cases.length === 0) {
    addText(section, "p", "No cases here yet.", "archive-empty");
  } else {
    const list = document.createElement("ul");
    list.className = "archive-case-list";
    for (const caseRecord of cases) {
      const item = document.createElement("li");
      item.append(caseLink(caseRecord));
      if (caseRecord.isDemo) addText(item, "span", "SAMPLE", "badge badge-sample");
      list.append(item);
    }
    section.append(list);
  }
  return section;
}

function renderNotesSection(cases, notes) {
  const casesById = new Map(cases.map((caseRecord) => [caseRecord.id, caseRecord]));
  const notesByCaseId = new Map();
  for (const note of notes) {
    if (!casesById.has(note.caseId)) continue;
    if (!notesByCaseId.has(note.caseId)) notesByCaseId.set(note.caseId, []);
    notesByCaseId.get(note.caseId).push(note);
  }

  const section = document.createElement("section");
  section.className = "my-archive-section";
  section.setAttribute("aria-label", "Personal Notes");
  const heading = document.createElement("div");
  heading.className = "section-heading";
  const copy = document.createElement("div");
  addText(copy, "p", "MY ARCHIVE", "eyebrow");
  addText(copy, "h2", "Personal Notes");
  heading.append(copy);
  addText(heading, "p", "Notes grouped by case", "muted");
  section.append(heading);

  if (notesByCaseId.size === 0) {
    addText(section, "p", "No personal notes have been saved yet.", "archive-empty");
    return section;
  }
  const list = document.createElement("div");
  list.className = "archive-note-list";
  for (const [caseId, caseNotes] of notesByCaseId) {
    const group = document.createElement("article");
    group.className = "archive-note-group";
    group.append(caseLink(casesById.get(caseId)));
    const noteList = document.createElement("ul");
    for (const note of caseNotes) addText(noteList, "li", note.text || "");
    group.append(noteList);
    list.append(group);
  }
  section.append(list);
  return section;
}

async function start() {
  try {
    await initializeArchive();
    const bundle = await getCollectionBundle();
    const contentFragment = document.createDocumentFragment();
    contentFragment.append(
      renderCaseSection("Watchlist", "Cases you have marked to return to.", bundle.cases.filter((item) => item.isWatchlisted)),
      renderCaseSection("In Progress", "Cases you are currently researching.", bundle.cases.filter((item) => item.myProgress === "In Progress")),
      renderCaseSection("Completed", "Cases where you have finished your research.", bundle.cases.filter((item) => item.myProgress === "Completed")),
      renderNotesSection(bundle.cases, bundle.personalNotes)
    );
    content.replaceChildren(contentFragment);
  } catch (error) {
    const message = document.createElement("section");
    message.className = "empty-state";
    addText(message, "h2", "My Archive could not be opened");
    addText(message, "p", error.message);
    content.replaceChildren(message);
  } finally {
    content.setAttribute("aria-busy", "false");
  }
}

start();
