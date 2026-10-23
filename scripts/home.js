import { deleteDemoCases, getCases, initializeArchive } from "./data.js";
import { readSession } from "./layout.js";

const continueList = document.querySelector("#continue-list");
const recentList = document.querySelector("#recent-list");

function badge(label, kind = "") {
  const item = document.createElement("span");
  item.className = `badge${kind ? ` badge-${kind}` : ""}`;
  item.textContent = label;
  return item;
}

function makeEmpty(text, href, linkText) {
  const empty = document.createElement("div");
  empty.className = "empty-state dashboard-empty";
  const copy = document.createElement("p");
  copy.textContent = text;
  const link = document.createElement("a");
  link.className = "text-link";
  link.href = href;
  link.textContent = linkText;
  empty.append(copy, link);
  return empty;
}

function caseLink(record, className = "") {
  const link = document.createElement("a");
  link.className = className;
  link.href = `case.html?id=${encodeURIComponent(record.id)}`;
  return link;
}

function renderContinue(cases) {
  continueList.replaceChildren();
  const inProgress = cases
    .filter((record) => record.myProgress === "In Progress")
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 3);
  if (!inProgress.length) {
    continueList.append(makeEmpty("No investigations are in progress yet.", "index.html", "Explore your cases →"));
    return;
  }
  for (const record of inProgress) {
    const card = document.createElement("article");
    card.className = "continue-card";
    const number = document.createElement("p");
    number.className = "eyebrow";
    number.textContent = record.caseNumber ? `CASE ${record.caseNumber}` : "CASE FILE";
    const title = document.createElement("h3");
    const titleLink = caseLink(record);
    titleLink.textContent = record.title;
    title.append(titleLink);
    const meta = document.createElement("div");
    meta.className = "case-meta";
    if (record.realWorldStatus) meta.append(badge(record.realWorldStatus, "status"));
    meta.append(badge(record.myProgress, "progress"));
    if (record.isDemo) meta.append(badge("SAMPLE", "sample"));
    const action = caseLink(record, "secondary-button continue-link");
    action.textContent = "Continue →";
    card.append(number, title, meta, action);
    continueList.append(card);
  }
}

function renderRecent(cases) {
  recentList.replaceChildren();
  const recent = [...cases]
    .sort((a, b) => (b.createdAt ?? b.updatedAt ?? "").localeCompare(a.createdAt ?? a.updatedAt ?? ""))
    .slice(0, 4);
  if (!recent.length) {
    recentList.append(makeEmpty("Your archive is ready for its first case.", "case-form.html", "Add a case →"));
    return;
  }
  for (const record of recent) {
    const item = document.createElement("article");
    item.className = "recent-item";
    const link = caseLink(record, "recent-case-link");
    const number = document.createElement("span");
    number.className = "recent-number";
    number.textContent = record.caseNumber || "CASE FILE";
    const title = document.createElement("strong");
    title.textContent = record.title || "Untitled case";
    link.append(number, title);
    const detail = document.createElement("div");
    detail.className = "recent-meta";
    if (record.isDemo) detail.append(badge("SAMPLE", "sample"));
    detail.append(badge(record.myProgress || "Not Started", "progress"));
    item.append(link, detail);
    recentList.append(item);
  }
}

function updateStats(cases) {
  document.querySelector("#stat-total").textContent = cases.length;
  document.querySelector("#stat-progress").textContent = cases.filter((record) => record.myProgress === "In Progress").length;
  document.querySelector("#stat-completed").textContent = cases.filter((record) => record.myProgress === "Completed").length;
  document.querySelector("#stat-watchlist").textContent = cases.filter((record) => record.isWatchlisted).length;
}

async function renderDashboard() {
  await initializeArchive();
  const cases = await getCases();
  updateStats(cases);
  renderContinue(cases);
  renderRecent(cases);
  const hasSamples = cases.some((record) => record.isDemo === true);
  const demoBanner = document.querySelector("#demo-banner");
  demoBanner.hidden = !hasSamples || localStorage.getItem("aftercase.demoDismissed") === "true";
  for (const id of ["continue-list", "recent-list"]) document.querySelector(`#${id}`).setAttribute("aria-busy", "false");
}

const session = readSession();
document.querySelector("#dashboard-name").textContent = session?.guest ? "Guest" : (session?.name || "Investigator");
document.querySelector("#dashboard-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

document.querySelector("#remove-demo-cases").addEventListener("click", async () => {
  const button = document.querySelector("#remove-demo-cases");
  button.disabled = true;
  button.textContent = "Removing…";
  try {
    await deleteDemoCases();
    localStorage.setItem("aftercase.demoDismissed", "true");
    await renderDashboard();
  } catch {
    button.disabled = false;
    button.textContent = "Remove them";
  }
});

renderDashboard().catch(() => {
  for (const selector of ["#continue-list", "#recent-list"]) {
    const list = document.querySelector(selector);
    list.replaceChildren(makeEmpty("The archive could not be opened in this browser.", "index.html", "Try Explore Cases →"));
    list.setAttribute("aria-busy", "false");
  }
});
