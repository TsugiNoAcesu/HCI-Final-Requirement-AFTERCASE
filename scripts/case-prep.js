const MAX_SOURCE_BYTES = 2_000_000;
const MAX_OVERVIEW_LENGTH = 3_000;
const MY_PROGRESS_VALUES = ["Not Started", "In Progress", "Completed"];
const REAL_WORLD_STATUS_VALUES = ["Solved", "Unsolved", "Ongoing", "Unknown or disputed"];

const labels = new Map([
  ["title", "title"], ["case title", "title"],
  ["case number", "caseNumber"],
  ["my progress", "myProgress"], ["progress", "myProgress"],
  ["real-world status", "realWorldStatus"], ["real world status", "realWorldStatus"],
  ["location", "location"], ["categories", "categories"], ["keywords", "keywords"],
  ["overview", "summary"], ["summary", "summary"]
]);

const fieldLabels = {
  title: "Case title",
  caseNumber: "Case number",
  myProgress: "My progress",
  realWorldStatus: "Real-world status",
  location: "Location",
  categories: "Categories",
  keywords: "Keywords",
  summary: "Overview"
};

function normalizeLabel(value) {
  return value.trim().replace(/\*\*/g, "").replace(/:$/, "").trim().toLocaleLowerCase();
}

function recognizeHeading(line) {
  const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
  if (!heading) return null;
  return labels.get(normalizeLabel(heading[1])) ?? null;
}

function recognizeLabeledLine(line) {
  const normalizedLine = line.trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "");
  const match = normalizedLine.match(/^([^:]{1,40}?)\s*:\s*(.*)$/);
  if (!match) return null;
  const key = labels.get(normalizeLabel(match[1]));
  return key ? { key, value: match[2].trim() } : null;
}

function normalizeValue(key, value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (key === "myProgress") {
    return MY_PROGRESS_VALUES.find((item) => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase()) ?? "";
  }
  if (key === "realWorldStatus") {
    return REAL_WORLD_STATUS_VALUES.find((item) => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase()) ?? "";
  }
  return trimmed;
}

export function parseLabeledFields(source) {
  const rawValues = new Map();
  let activeKey = null;
  for (const originalLine of source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = originalLine.trim();
    if (/^```/.test(line)) {
      activeKey = null;
      continue;
    }
    const headingKey = recognizeHeading(line);
    if (headingKey) {
      if (rawValues.has(headingKey)) {
        if (activeKey === "summary") {
          rawValues.set(activeKey, `${rawValues.get(activeKey) ?? ""}\n${line}`.trim());
        } else {
          activeKey = null;
        }
        continue;
      }
      activeKey = headingKey;
      rawValues.set(activeKey, "");
      continue;
    }
    if (/^\s{0,3}#{1,6}\s/.test(line)) {
      if (rawValues.size > 0) break;
      activeKey = null;
      continue;
    }
    const labeled = recognizeLabeledLine(line);
    if (labeled) {
      if (rawValues.has(labeled.key)) {
        if (activeKey === "summary") {
          rawValues.set(activeKey, `${rawValues.get(activeKey) ?? ""}\n${line}`.trim());
        } else {
          activeKey = null;
        }
        continue;
      }
      activeKey = labeled.key;
      rawValues.set(activeKey, labeled.value);
      continue;
    }
    if (activeKey === "summary" && line) {
      rawValues.set(activeKey, `${rawValues.get(activeKey) ?? ""}\n${line}`.trim());
    } else if (activeKey && line && !(rawValues.get(activeKey) ?? "").trim()) {
      rawValues.set(activeKey, line.replace(/^[-*+]\s+/, "").trim());
    } else if (line) {
      activeKey = null;
    } else if (/^\s{0,3}#{1,6}\s/.test(line)) {
      activeKey = null;
    }
  }

  const suggestions = {};
  const rejected = [];
  for (const [key, rawValue] of rawValues) {
    const value = normalizeValue(key, rawValue);
    if (rawValue.trim() && !value && key === "myProgress") rejected.push({ key, value: rawValue.trim() });
    if (rawValue.trim() && !value && key === "realWorldStatus") rejected.push({ key, value: rawValue.trim() });
    if (value) suggestions[key] = key === "summary" ? value.slice(0, MAX_OVERVIEW_LENGTH) : value;
  }
  const missing = ["title", "caseNumber", "realWorldStatus", "categories", "summary"].filter((key) => !suggestions[key]);
  return {
    suggestions,
    missing,
    rejected,
    overviewTruncated: (rawValues.get("summary") ?? "").length > MAX_OVERVIEW_LENGTH
  };
}

export function setupCasePreparation(form) {
  const section = document.querySelector("#case-prep");
  if (!section) return;
  if (new URLSearchParams(window.location.search).has("id")) {
    section.hidden = true;
    return;
  }

  const fileInput = document.querySelector("#source-file");
  const sourceText = document.querySelector("#source-text");
  const prepareButton = document.querySelector("#prepare-case");
  const clearButton = document.querySelector("#clear-source");
  const message = document.querySelector("#prep-message");
  const preview = document.querySelector("#prep-preview");
  let suggestions = {};

  for (const control of form.elements) {
    if (!control.name) continue;
    control.addEventListener("input", () => { control.dataset.userEdited = "true"; });
    control.addEventListener("change", () => { control.dataset.userEdited = "true"; });
  }

  sourceText.addEventListener("input", () => {
    suggestions = {};
    preview.replaceChildren();
    preview.hidden = true;
    message.className = "form-message";
    message.textContent = "Source text changed. Find labeled fields again to refresh the suggestions.";
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop().toLocaleLowerCase();
    if (!["txt", "md", "markdown", "vtt", "srt"].includes(extension)) {
      message.className = "form-message error";
      message.textContent = "Choose a TXT, Markdown, VTT, or SRT transcript file.";
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      message.className = "form-message error";
      message.textContent = "This file is larger than 2 MB. Choose a smaller text file.";
      fileInput.value = "";
      return;
    }
    try {
      sourceText.value = await file.text();
      sourceText.dataset.userEdited = "true";
      suggestions = {};
      message.className = "form-message success";
      message.textContent = `${file.name} is ready. Its contents remain in this page until you leave.`;
      preview.hidden = true;
    } catch {
      message.className = "form-message error";
      message.textContent = "The selected file could not be read. Try a plain text file.";
    }
  });

  prepareButton.addEventListener("click", () => {
    const result = parseLabeledFields(sourceText.value);
    suggestions = result.suggestions;
    preview.replaceChildren();
    const keys = Object.keys(suggestions);

    const heading = document.createElement("h3");
    heading.textContent = "Review suggested fields";
    const explanation = document.createElement("p");
    explanation.className = "muted";
    explanation.textContent = "Check these values before applying. Existing form entries will be left unchanged.";
    const list = document.createElement("dl");
    list.className = "prep-suggestion-list";
    for (const key of keys) {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = fieldLabels[key];
      const value = document.createElement("dd");
      value.textContent = suggestions[key];
      row.append(term, value);
      list.append(row);
    }
    if (result.missing.length) {
      const notFound = document.createElement("p");
      notFound.className = "muted";
      notFound.textContent = `Not found: ${result.missing.map((key) => fieldLabels[key]).join(", ")}`;
      preview.append(notFound);
    }
    for (const rejected of result.rejected) {
      const notice = document.createElement("p");
      notice.className = "muted";
      if (rejected.key === "myProgress") {
        notice.textContent = `My progress “${rejected.value}” was not applied. Use one of: ${MY_PROGRESS_VALUES.join(", ")}.`;
      } else {
        notice.textContent = `Real-world status “${rejected.value}” was not applied. Use one of: ${REAL_WORLD_STATUS_VALUES.join(", ")}.`;
      }
      preview.append(notice);
    }
    const actions = document.createElement("div");
    actions.className = "prep-actions";
    const apply = document.createElement("button");
    apply.className = "primary-button";
    apply.type = "button";
    apply.textContent = "Apply suggestions to blank fields";
    apply.addEventListener("click", () => {
      let applied = 0;
      let skipped = 0;
      for (const [key, value] of Object.entries(suggestions)) {
        const control = form.elements.namedItem(key);
        if (!control || control.disabled) { skipped += 1; continue; }
        const hasExistingValue = control.tagName === "SELECT"
          ? control.dataset.userEdited === "true" || control.dataset.autoFilled === "true"
          : Boolean(control.value.trim());
        if (hasExistingValue) { skipped += 1; continue; }
        control.value = value;
        control.dataset.autoFilled = "true";
        applied += 1;
      }
      message.className = "form-message success";
      message.textContent = `${applied} ${applied === 1 ? "field" : "fields"} filled${skipped ? `; ${skipped} left unchanged` : ""}.${result.overviewTruncated ? " The overview suggestion was shortened to fit the form." : ""} Review every value and verify it against your source before saving.`;
    });
    if (keys.length) actions.append(apply);
    preview.prepend(heading, explanation);
    if (keys.length) preview.append(list);
    if (keys.length) preview.append(actions);
    preview.hidden = false;
    message.className = "form-message success";
    message.textContent = keys.length
      ? `${keys.length} ${keys.length === 1 ? "field" : "fields"} found. Nothing has been filled yet.`
      : "No supported values were found. Review the missing and rejected fields above.";
  });

  clearButton.addEventListener("click", () => {
    sourceText.value = "";
    fileInput.value = "";
    preview.replaceChildren();
    preview.hidden = true;
    suggestions = {};
    message.className = "form-message";
    message.textContent = "Source text cleared.";
    sourceText.focus();
  });
}
