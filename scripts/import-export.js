import { findImportConflicts, getCollectionBundle, importCollectionBundle } from "./data.js";
import { parseAndValidateImport } from "./case-format.js";

const fileInput = document.querySelector("#import-file");
const dialog = document.querySelector("#import-preview");
const summary = document.querySelector("#import-summary");
const problemList = document.querySelector("#import-problems");
const caseList = document.querySelector("#import-case-list");
const confirmButton = document.querySelector("#confirm-import");
const archiveMessage = document.querySelector("#archive-message");

let pendingBundle = null;
let pendingConflicts = [];

function addMessage(text, error = false) {
  archiveMessage.textContent = text;
  archiveMessage.className = error ? "form-message error" : "form-message success";
}

function appendListItem(list, text) {
  const item = document.createElement("li");
  item.textContent = text;
  list.append(item);
}

function renderPreview({ bundle, errors, warnings }, conflicts = []) {
  pendingBundle = bundle;
  pendingConflicts = conflicts;
  problemList.replaceChildren();
  caseList.replaceChildren();

  for (const error of errors) appendListItem(problemList, error);
  for (const warning of warnings) appendListItem(problemList, `Check: ${warning}`);
  for (const conflict of conflicts) {
    for (const reason of conflict.reasons) appendListItem(problemList, `Conflict: ${conflict.title} — ${reason}`);
  }

  if (bundle) {
    const skippedIds = new Set(conflicts.map((item) => item.caseId));
    const importableCount = bundle.cases.filter((item) => !skippedIds.has(item.id)).length;
    summary.textContent = `${bundle.cases.length} case${bundle.cases.length === 1 ? "" : "s"} found. ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}; ${importableCount} can be added. Existing cases and records will not be overwritten.`;
    for (const caseRecord of bundle.cases) {
      const item = document.createElement("article");
      item.className = skippedIds.has(caseRecord.id) ? "import-case conflict" : "import-case";
      const heading = document.createElement("h3");
      heading.textContent = `${caseRecord.caseNumber} · ${caseRecord.title}`;
      const detail = document.createElement("p");
      detail.textContent = skippedIds.has(caseRecord.id) ? "Will be skipped because it conflicts with saved data." : caseRecord.myProgress;
      item.append(heading, detail);
      caseList.append(item);
    }
    confirmButton.textContent = `Import ${importableCount} non-conflicting case${importableCount === 1 ? "" : "s"}`;
    confirmButton.disabled = errors.length > 0 || importableCount === 0;
    if (bundle.cases.length === 0 && errors.length === 0) summary.textContent = "This file contains no cases, so there is nothing to import.";
  } else {
    summary.textContent = "Import stopped. Correct the problems below and choose the file again.";
    confirmButton.textContent = "Import unavailable";
    confirmButton.disabled = true;
  }
  dialog.showModal();
}

async function readImportFile(file) {
  try {
    const result = parseAndValidateImport(await file.text());
    const conflicts = result.bundle ? await findImportConflicts(result.bundle) : [];
    renderPreview(result, conflicts);
  } catch (error) {
    renderPreview({ bundle: null, errors: [`The file could not be read: ${error.message}`], warnings: [] });
  }
}

async function exportBackup() {
  try {
    const collection = await getCollectionBundle();
    if (collection.cases.length === 0) {
      addMessage("There are no cases to include in a backup.");
      return;
    }
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const download = document.createElement("a");
    download.href = objectUrl;
    download.download = `aftercase-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    addMessage(`Backup exported with ${collection.cases.length} case${collection.cases.length === 1 ? "" : "s"}.`);
  } catch (error) {
    addMessage(`The backup could not be created. ${error.message}`, true);
  }
}

document.querySelector("#import-button").addEventListener("click", () => fileInput.click());
document.querySelector("#export-button").addEventListener("click", exportBackup);
fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files;
  if (file) await readImportFile(file);
  fileInput.value = "";
});
document.querySelector("#cancel-import").addEventListener("click", () => dialog.close());
confirmButton.addEventListener("click", async () => {
  if (!pendingBundle || confirmButton.disabled) return;
  confirmButton.disabled = true;
  try {
    const skippedIds = pendingConflicts.map((item) => item.caseId);
    const importedCount = await importCollectionBundle(pendingBundle, skippedIds);
    dialog.close();
    addMessage(`${importedCount} case${importedCount === 1 ? " was" : "s were"} imported.`);
    window.dispatchEvent(new CustomEvent("aftercase:collectionchanged"));
  } catch (error) {
    summary.textContent = `Nothing was imported. ${error.message}`;
    confirmButton.disabled = false;
  }
});

