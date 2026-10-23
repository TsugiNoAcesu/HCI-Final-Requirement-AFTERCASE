import { caseNumberExists, getCaseBundle, initializeArchive, saveCaseBundle } from "./data.js";
import { setupCasePreparation } from "./case-prep.js";

const form = document.querySelector("#case-form");
const formMessage = document.querySelector("#form-message");
const caseId = new URLSearchParams(window.location.search).get("id");
const reliabilityOptions = ["Established fact", "Official finding", "Reported allegation", "Conflicting accounts", "Unverified claim", "Personal interpretation"];
const configurations = {
  timelineEvents: [
    { key: "dateText", label: "Date or sequence", placeholder: "For example, 12 May or Before the last train" },
    { key: "description", label: "Event details", kind: "textarea", required: true },
    { key: "reliability", label: "Reliability", kind: "select", options: reliabilityOptions }
  ],
  people: [
    { key: "name", label: "Name", required: true },
    { key: "role", label: "Role" },
    { key: "details", label: "Details", kind: "textarea" }
  ],
  evidenceItems: [
    { key: "title", label: "Item title", required: true },
    { key: "details", label: "Details", kind: "textarea", required: true },
    { key: "reliability", label: "Reliability", kind: "select", options: reliabilityOptions }
  ],
  sources: [
    { key: "title", label: "Source title", required: true },
    { key: "url", label: "URL", kind: "url", required: true },
    { key: "publisher", label: "Publisher" },
    { key: "publicationDate", label: "Publication date", kind: "date" },
    { key: "notes", label: "Notes", kind: "textarea" }
  ],
  personalNotes: [{ key: "text", label: "Note", kind: "textarea", required: true }]
};

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `ac-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createField(config, value = "") {
  const label = document.createElement("label");
  label.textContent = config.label;
  let control;
  if (config.kind === "textarea") {
    control = document.createElement("textarea");
    control.rows = 3;
  } else if (config.kind === "select") {
    control = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Choose a reliability label";
    control.append(empty);
    for (const optionText of config.options) {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      control.append(option);
    }
  } else {
    control = document.createElement("input");
    control.type = config.kind ?? "text";
    if (config.placeholder) control.placeholder = config.placeholder;
  }
  control.name = config.key;
  control.dataset.field = config.key;
  control.value = value ?? "";
  label.append(control);
  return label;
}

function appendRecordRow(storeName, record = {}) {
  const row = document.createElement("fieldset");
  row.className = "record-row";
  if (record.id) row.dataset.recordId = record.id;
  const legend = document.createElement("legend");
  legend.textContent = `${document.querySelector(`[data-record-list="${storeName}"]`).children.length + 1}. ${storeName === "timelineEvents" ? "Timeline event" : storeName === "people" ? "Person" : storeName === "evidenceItems" ? "Evidence item" : storeName === "sources" ? "Source" : "Personal note"}`;
  const fields = document.createElement("div");
  fields.className = "form-grid record-fields";
  for (const config of configurations[storeName]) {
    fields.append(createField(config, record[config.key]));
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-record";
  remove.textContent = "Remove this entry";
  remove.addEventListener("click", () => row.remove());
  row.append(legend, fields, remove);
  document.querySelector(`[data-record-list="${storeName}"]`).append(row);
}

function setField(name, value) {
  const control = form.elements.namedItem(name);
  if (control) control.value = value ?? "";
}

function setCancelTarget(url, label = "← Explore Cases") {
  document.querySelector("#cancel-link").href = url;
  document.querySelector("#cancel-link").textContent = label;
  document.querySelector("#cancel-bottom").href = url;
}

function updateStatusField() {
  const statusControl = form.elements.realWorldStatus;
  statusControl.required = true;
  statusControl.disabled = false;
  document.querySelector("#world-status-field").hidden = false;
}

async function loadExistingCase() {
  const bundle = await getCaseBundle(caseId);
  if (!bundle) throw new Error("This case could not be found. Return to Explore Cases and choose another case.");
  const { caseRecord, ...related } = bundle;
  for (const [key, value] of Object.entries(caseRecord)) {
    if (key === "categories" || key === "keywords") setField(key, value.join(", "));
    else if (form.elements.namedItem(key)) setField(key, value);
  }
  for (const [storeName, records] of Object.entries(related)) {
    for (const record of records) appendRecordRow(storeName, record);
  }
  document.querySelector("#form-title").textContent = "Edit Case";
  document.title = "Edit Case — AFTERCASE";
  form.querySelector("button[type=submit]").textContent = "Save Changes";
  setCancelTarget(`case.html?id=${encodeURIComponent(caseId)}`, "← Case File");
}

function collectRecords(storeName, issues) {
  const records = [];
  const rows = document.querySelectorAll(`[data-record-list="${storeName}"] .record-row`);
  for (const row of rows) {
    const record = Object.fromEntries([...row.querySelectorAll("[data-field]")].map((field) => [field.dataset.field, field.value.trim()]));
    const hasValue = Object.values(record).some(Boolean);
    if (!hasValue) continue;
    const requiredKeys = configurations[storeName].filter((config) => config.required).map((config) => config.key);
    for (const key of requiredKeys) {
      if (!record[key]) issues.push(`${configurations[storeName].find((item) => item.key === key).label} is required for each entry.`);
    }
    if (["timelineEvents", "evidenceItems"].includes(storeName) && !record.reliability) {
      issues.push("Every timeline event and evidence item needs a reliability label.");
    }
    if (storeName === "sources" && record.url && !isValidUrl(record.url)) issues.push("Each source URL must be valid.");
    record.id = row.dataset.recordId || newId();
    record.position = records.length + 1;
    records.push(record);
  }
  return records;
}

function isValidUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

async function save(event) {
  event.preventDefault();
  formMessage.textContent = "";
  formMessage.className = "form-message";
  if (!form.reportValidity()) return;

  const values = new FormData(form);
  const title = values.get("title").trim();
  const caseNumber = values.get("caseNumber").trim();
  const issues = [];
  if (await caseNumberExists(caseNumber, caseId)) issues.push(`Case number “${caseNumber}” is already in use.`);
  const categories = values.get("categories").split(",").map((item) => item.trim()).filter(Boolean);
  if (!categories.length) issues.push("Add at least one category.");
  if (values.get("imageUrl") && !isValidUrl(values.get("imageUrl"))) issues.push("Image URL must be a valid http or https address.");

  const related = {};
  for (const storeName of Object.keys(configurations)) related[storeName] = collectRecords(storeName, issues);
  if (issues.length) {
    formMessage.className = "form-message error";
    formMessage.textContent = issues.join(" ");
    formMessage.focus?.();
    return;
  }

  const now = new Date().toISOString();
  const prior = caseId ? await getCaseBundle(caseId) : null;
  const caseRecord = {
    id: caseId ?? newId(),
    caseNumber,
    type: prior?.caseRecord.type ?? "Real",
    title,
    summary: values.get("summary").trim(),
    categories,
    realWorldStatus: values.get("realWorldStatus"),
    myProgress: values.get("myProgress"),
    location: values.get("location").trim(),
    keywords: values.get("keywords").split(",").map((item) => item.trim()).filter(Boolean),
    imageUrl: values.get("imageUrl").trim() || null,
    isWatchlisted: prior?.caseRecord.isWatchlisted ?? false,
    createdAt: prior?.caseRecord.createdAt ?? now,
    updatedAt: now
  };

  try {
    await saveCaseBundle({ caseRecord, ...related });
    window.location.href = `case.html?id=${encodeURIComponent(caseRecord.id)}`;
  } catch (error) {
    formMessage.className = "form-message error";
    formMessage.textContent = `The case was not saved. ${error.message}`;
  }
}

for (const button of document.querySelectorAll("[data-add-record]")) {
  button.addEventListener("click", () => appendRecordRow(button.dataset.addRecord));
}
form.addEventListener("submit", save);
setupCasePreparation(form);

async function start() {
  try {
    await initializeArchive();
    if (caseId) await loadExistingCase();
    updateStatusField();
  } catch (error) {
    form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
    formMessage.className = "form-message error";
    formMessage.textContent = error.message;
  }
}

start();
