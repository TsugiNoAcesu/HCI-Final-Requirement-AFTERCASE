const CASE_TYPES = ["Real", "Fictional"];
const REAL_CASE_STATUSES = ["Solved", "Unsolved", "Ongoing", "Unknown or disputed"];
const MY_PROGRESS_VALUES = ["Not Started", "In Progress", "Completed"];
const RELIABILITY_VALUES = ["Established fact", "Official finding", "Reported allegation", "Conflicting accounts", "Unverified claim", "Personal interpretation"];
const RELATED_STORES = ["timelineEvents", "people", "evidenceItems", "sources", "personalNotes"];

function validHttpUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addOptionalWarnings(caseRecord, warnings) {
  for (const key of ["location", "keywords", "imageUrl", "createdAt", "updatedAt"]) {
    if (!(key in caseRecord)) warnings.push(`${caseRecord.title}: optional field “${key}” is missing.`);
  }
}

export function parseAndValidateImport(text) {
  const errors = [];
  const warnings = [];
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { bundle: null, errors: [`This file is not valid JSON: ${error.message}`], warnings };
  }

  if (!isRecord(value)) return { bundle: null, errors: ["The JSON root must be an object."], warnings };
  if (value.schemaVersion !== 1) errors.push(`Unsupported schema version: ${String(value.schemaVersion ?? "missing")}. AFTERCASE supports version 1.`);
  for (const key of ["cases", ...RELATED_STORES]) {
    if (!Array.isArray(value[key])) errors.push(`The “${key}” field must be an array.`);
  }
  if (errors.length) return { bundle: null, errors, warnings };

  const bundle = { schemaVersion: value.schemaVersion, cases: value.cases, ...Object.fromEntries(RELATED_STORES.map((key) => [key, value[key]])) };
  const caseIds = new Set();
  const caseNumbers = new Set();
  const casesById = new Map();
  for (const [index, record] of bundle.cases.entries()) {
    const label = `Case ${index + 1}`;
    if (!isRecord(record)) { errors.push(`${label} must be an object.`); continue; }
    if (typeof record.id !== "string" || !record.id.trim()) errors.push(`${label} is missing a valid ID.`);
    else if (caseIds.has(record.id)) errors.push(`${label} repeats case ID “${record.id}”.`);
    else { caseIds.add(record.id); casesById.set(record.id, record); }
    if (typeof record.caseNumber !== "string" || !record.caseNumber.trim()) errors.push(`${label} needs a case number.`);
    else {
      const normalized = record.caseNumber.trim().toLocaleLowerCase();
      if (caseNumbers.has(normalized)) errors.push(`${label} repeats case number “${record.caseNumber}”.`);
      caseNumbers.add(normalized);
    }
    if (!CASE_TYPES.includes(record.type)) errors.push(`${label} has an invalid type. Use Real or Fictional.`);
    if (typeof record.title !== "string" || !record.title.trim()) errors.push(`${label} needs a title.`);
    if (typeof record.summary !== "string" || !record.summary.trim()) errors.push(`${label} needs an overview.`);
    if (!Array.isArray(record.categories) || record.categories.length === 0 || record.categories.some((item) => typeof item !== "string" || !item.trim())) errors.push(`${label} needs one or more category names.`);
    if (!MY_PROGRESS_VALUES.includes(record.myProgress)) errors.push(`${label} has an invalid My progress value.`);
    if (record.type === "Real" && !REAL_CASE_STATUSES.includes(record.realWorldStatus)) errors.push(`${label} has an invalid real-world status.`);
    if (record.type === "Fictional" && record.realWorldStatus !== null) errors.push(`${label} is Fictional, so real-world status must be null.`);
    if (record.imageUrl && !validHttpUrl(record.imageUrl)) errors.push(`${label} has an invalid image URL.`);
    addOptionalWarnings(record, warnings);
  }

  for (const storeName of RELATED_STORES) {
    const seenIds = new Set();
    for (const [index, record] of bundle[storeName].entries()) {
      const label = `${storeName} record ${index + 1}`;
      if (!isRecord(record)) { errors.push(`${label} must be an object.`); continue; }
      if (typeof record.id !== "string" || !record.id.trim()) errors.push(`${label} is missing a valid ID.`);
      else if (seenIds.has(record.id)) errors.push(`${label} repeats ID “${record.id}”.`);
      else seenIds.add(record.id);
      if (typeof record.caseId !== "string" || !casesById.has(record.caseId)) {
        errors.push(`${label} refers to a case that is not in this file.`);
        continue;
      }
      const caseRecord = casesById.get(record.caseId);
      if (storeName === "timelineEvents") {
        if (typeof record.description !== "string" || !record.description.trim()) errors.push(`${label} needs event details.`);
        if (caseRecord.type === "Real" && !RELIABILITY_VALUES.includes(record.reliability)) errors.push(`${label} in a Real case needs a valid reliability label.`);
        if (record.reliability && !RELIABILITY_VALUES.includes(record.reliability)) errors.push(`${label} has an invalid reliability label.`);
      } else if (storeName === "people") {
        if (typeof record.name !== "string" || !record.name.trim()) errors.push(`${label} needs a name.`);
      } else if (storeName === "evidenceItems") {
        if (typeof record.title !== "string" || !record.title.trim()) errors.push(`${label} needs a title.`);
        if (typeof record.details !== "string" || !record.details.trim()) errors.push(`${label} needs details.`);
        if (caseRecord.type === "Real" && !RELIABILITY_VALUES.includes(record.reliability)) errors.push(`${label} in a Real case needs a valid reliability label.`);
        if (record.reliability && !RELIABILITY_VALUES.includes(record.reliability)) errors.push(`${label} has an invalid reliability label.`);
      } else if (storeName === "sources") {
        if (typeof record.title !== "string" || !record.title.trim()) errors.push(`${label} needs a title.`);
        if (typeof record.url !== "string" || !validHttpUrl(record.url)) errors.push(`${label} needs a valid http or https URL.`);
      } else if (storeName === "personalNotes") {
        if (typeof record.text !== "string" || !record.text.trim()) errors.push(`${label} needs note text.`);
      }
      if (record.sourceIds !== undefined && !Array.isArray(record.sourceIds)) errors.push(`${label} sourceIds must be an array.`);
    }
  }

  const sourceIdsByCase = new Map();
  for (const source of bundle.sources) {
    if (!isRecord(source)) continue;
    if (!sourceIdsByCase.has(source.caseId)) sourceIdsByCase.set(source.caseId, new Set());
    sourceIdsByCase.get(source.caseId).add(source.id);
  }
  for (const storeName of ["timelineEvents", "people", "evidenceItems"]) {
    for (const record of bundle[storeName]) {
      if (!isRecord(record)) continue;
      if (!Array.isArray(record.sourceIds)) continue;
      const sourceIds = sourceIdsByCase.get(record.caseId) ?? new Set();
      for (const sourceId of record.sourceIds) {
        if (!sourceIds.has(sourceId)) errors.push(`${storeName} record ${record.id} refers to missing source ID “${sourceId}”.`);
      }
    }
  }

  return { bundle: errors.length ? null : bundle, errors, warnings };
}
