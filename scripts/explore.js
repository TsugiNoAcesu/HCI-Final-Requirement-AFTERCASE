import { getCasesWithPeople, initializeArchive } from "./data.js";

const list = document.querySelector("#case-list");
const count = document.querySelector("#case-count");
const search = document.querySelector("#case-search");
const statusFilter = document.querySelector("#case-status-filter");
const sortSelect = document.querySelector("#case-sort");
const gridViewButton = document.querySelector("#grid-view");
const listViewButton = document.querySelector("#list-view");
let allCases = [];
let displayMode = "grid";

function badge(label, kind = "") {
  const element = document.createElement("span");
  element.className = `badge${kind ? ` badge-${kind}` : ""}`;
  element.textContent = label;
  return element;
}

function matchesSearch(caseRecord, query) {
  if (!query) return true;
  const searchableFields = [
    caseRecord.title,
    caseRecord.caseNumber,
    caseRecord.location,
    ...(caseRecord.keywords ?? []),
    ...(caseRecord.categories ?? []),
    ...(caseRecord.tags ?? []),
    ...(caseRecord.peopleNames ?? [])
  ];
  return searchableFields.some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
}

function renderCases(cases, query) {
  list.replaceChildren();
  list.classList.toggle("list-mode", displayMode === "list");
  const matchedCases = cases.filter((caseRecord) =>
    matchesSearch(caseRecord, query) &&
    (!statusFilter.value || caseRecord.realWorldStatus === statusFilter.value)
  );
  matchedCases.sort((a, b) => {
    if (sortSelect.value === "title-asc") return (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" });
    if (sortSelect.value === "number-asc") return (a.caseNumber ?? "").localeCompare(b.caseNumber ?? "", undefined, { numeric: true, sensitivity: "base" });
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
  const hasFilters = Boolean(query || statusFilter.value);
  count.textContent = hasFilters
    ? `${matchedCases.length} of ${cases.length} ${cases.length === 1 ? "case" : "cases"}`
    : `${cases.length} ${cases.length === 1 ? "case" : "cases"}`;

  if (matchedCases.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const heading = document.createElement("h3");
    heading.textContent = hasFilters ? "No cases match these filters" : "Your archive is empty";
    const message = document.createElement("p");
    message.textContent = hasFilters
      ? "Try changing your search or filters to see more cases."
      : "Add or import a case to begin building your personal mystery archive.";
    empty.append(heading, message);
    if (hasFilters) {
      const clear = document.createElement("button");
      clear.className = "secondary-button";
      clear.type = "button";
      clear.textContent = "Clear search and filters";
      clear.addEventListener("click", () => {
        search.value = "";
        statusFilter.value = "";
        renderCases(allCases, "");
        search.focus();
      });
      empty.append(clear);
    }
    list.append(empty);
    return;
  }

  for (const caseRecord of matchedCases) {
    const article = document.createElement("article");
    article.className = "case-card";
    const link = document.createElement("a");
    link.className = "case-card-link";
    link.href = `case.html?id=${encodeURIComponent(caseRecord.id)}`;
    link.setAttribute("aria-label", `Open Case File: ${caseRecord.title}`);
    const number = document.createElement("p");
    number.className = "eyebrow";
    number.textContent = caseRecord.caseNumber ? `CASE ${caseRecord.caseNumber}` : "CASE FILE";
    const title = document.createElement("h3");
    title.textContent = caseRecord.title || "Untitled case";
    const summary = document.createElement("p");
    summary.className = "case-summary";
    summary.textContent = caseRecord.summary || "No overview has been added yet.";
    link.append(number, title, summary);
    const meta = document.createElement("div");
    meta.className = "case-meta";
    if (caseRecord.realWorldStatus) meta.append(badge(caseRecord.realWorldStatus, "status"));
    meta.append(badge(caseRecord.myProgress || "Not Started", "progress"));
    if (caseRecord.isDemo) meta.append(badge("SAMPLE", "sample"));
    for (const category of caseRecord.categories ?? []) meta.append(badge(category, "category"));
    article.append(link, meta);
    list.append(article);
  }
}

async function loadCases() {
  try {
    await initializeArchive();
    allCases = await getCasesWithPeople();
    renderCases(allCases, search.value.trim().toLocaleLowerCase());
  } catch (error) {
    count.textContent = "";
    const message = document.createElement("div");
    message.className = "empty-state";
    const heading = document.createElement("h3");
    heading.textContent = "The archive could not be opened";
    const detail = document.createElement("p");
    detail.textContent = error.message;
    message.append(heading, detail);
    list.replaceChildren(message);
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

search.addEventListener("input", () => renderCases(allCases, search.value.trim().toLocaleLowerCase()));
statusFilter.addEventListener("change", () => renderCases(allCases, search.value.trim().toLocaleLowerCase()));
sortSelect.addEventListener("change", () => renderCases(allCases, search.value.trim().toLocaleLowerCase()));
function setDisplayMode(mode) {
  displayMode = mode;
  gridViewButton.classList.toggle("active", mode === "grid");
  gridViewButton.setAttribute("aria-pressed", String(mode === "grid"));
  listViewButton.classList.toggle("active", mode === "list");
  listViewButton.setAttribute("aria-pressed", String(mode === "list"));
  renderCases(allCases, search.value.trim().toLocaleLowerCase());
}
gridViewButton.addEventListener("click", () => setDisplayMode("grid"));
listViewButton.addEventListener("click", () => setDisplayMode("list"));
window.addEventListener("aftercase:collectionchanged", loadCases);
loadCases();
