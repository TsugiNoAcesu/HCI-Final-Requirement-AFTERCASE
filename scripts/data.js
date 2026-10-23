const DATABASE_NAME = "aftercase-archive";
const DATABASE_VERSION = 1;
const RELATED_STORES = ["timelineEvents", "people", "evidenceItems", "sources", "personalNotes"];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support IndexedDB, so AFTERCASE cannot save cases here."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("cases")) database.createObjectStore("cases", { keyPath: "id" });
      if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "key" });
      for (const storeName of RELATED_STORES) {
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The archive could not be opened."));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The archive request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("The archive change was not saved."));
    transaction.onerror = () => reject(transaction.error ?? new Error("The archive change was not saved."));
  });
}

export async function initializeArchive() {
  const database = await openDatabase();
  database.close();
}

function sortRelatedRecords(records) {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const aHasPosition = Number.isFinite(a.record.position);
      const bHasPosition = Number.isFinite(b.record.position);
      if (aHasPosition && bHasPosition && a.record.position !== b.record.position) {
        return a.record.position - b.record.position;
      }
      if (aHasPosition !== bHasPosition) return aHasPosition ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ record }) => record);
}

export async function getCases() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction("cases", "readonly");
    return await requestResult(transaction.objectStore("cases").getAll());
  } finally {
    database.close();
  }
}

export async function getCasesWithPeople() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(["cases", "people"], "readonly");
    const casesRequest = requestResult(transaction.objectStore("cases").getAll());
    const peopleRequest = requestResult(transaction.objectStore("people").getAll());
    const [cases, people] = await Promise.all([casesRequest, peopleRequest]);
    const namesByCaseId = new Map();
    for (const person of sortRelatedRecords(people)) {
      if (!namesByCaseId.has(person.caseId)) namesByCaseId.set(person.caseId, []);
      namesByCaseId.get(person.caseId).push(person.name ?? "");
    }
    return cases.map((caseRecord) => ({ ...caseRecord, peopleNames: namesByCaseId.get(caseRecord.id) ?? [] }));
  } finally {
    database.close();
  }
}

export async function caseNumberExists(caseNumber, exceptId = null) {
  const normalized = caseNumber.trim().toLocaleLowerCase();
  const cases = await getCases();
  return cases.some((record) => record.id !== exceptId && record.caseNumber?.trim().toLocaleLowerCase() === normalized);
}

export async function getCaseBundle(caseId) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(["cases", ...RELATED_STORES], "readonly");
    const caseRequest = requestResult(transaction.objectStore("cases").get(caseId));
    const relatedRequests = RELATED_STORES.map((storeName) => requestResult(transaction.objectStore(storeName).getAll()));
    const caseRecord = await caseRequest;
    if (!caseRecord) return null;
    const allRelatedRecords = await Promise.all(relatedRequests);
    const relatedRecords = RELATED_STORES.map((storeName, index) => [
      storeName,
      sortRelatedRecords(allRelatedRecords[index].filter((record) => record.caseId === caseId))
    ]);
    return Object.fromEntries([["caseRecord", caseRecord], ...relatedRecords]);
  } finally {
    database.close();
  }
}

export async function saveCaseBundle(bundle) {
  const database = await openDatabase();
  try {
    const storeNames = ["cases", ...RELATED_STORES];
    const transaction = database.transaction(storeNames, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore("cases").put(bundle.caseRecord);

    for (const storeName of RELATED_STORES) {
      const store = transaction.objectStore(storeName);
      const existingRequest = store.getAll();
      existingRequest.onsuccess = () => {
        for (const record of existingRequest.result) {
          if (record.caseId === bundle.caseRecord.id) store.delete(record.id);
        }
        for (const record of bundle[storeName] ?? []) store.put({ ...record, caseId: bundle.caseRecord.id });
      };
    }

    await done;
  } finally {
    database.close();
  }
}

export async function deleteCase(caseId) {
  const database = await openDatabase();
  try {
    const storeNames = ["cases", ...RELATED_STORES];
    const transaction = database.transaction(storeNames, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore("cases").delete(caseId);
    for (const storeName of RELATED_STORES) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        for (const record of request.result) {
          if (record.caseId === caseId) store.delete(record.id);
        }
      };
    }
    await done;
  } finally {
    database.close();
  }
}

export async function deleteDemoCases() {
  const database = await openDatabase();
  try {
    const storeNames = ["cases", ...RELATED_STORES];
    const transaction = database.transaction(storeNames, "readwrite");
    const done = transactionDone(transaction);
    const caseStore = transaction.objectStore("cases");
    const caseRequest = caseStore.getAll();
    let demoIds = new Set();
    caseRequest.onsuccess = () => {
      demoIds = new Set(caseRequest.result.filter((record) => record.isDemo === true).map((record) => record.id));
      for (const id of demoIds) caseStore.delete(id);
      for (const storeName of RELATED_STORES) {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          for (const record of request.result) {
            if (demoIds.has(record.caseId)) store.delete(record.id);
          }
        };
      }
    };
    await done;
    return demoIds.size;
  } finally {
    database.close();
  }
}

export async function setCaseWatchlist(caseId, isWatchlisted) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction("cases", "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore("cases");
    const request = store.get(caseId);
    request.onsuccess = () => {
      if (!request.result) {
        transaction.abort();
        return;
      }
      store.put({ ...request.result, isWatchlisted: Boolean(isWatchlisted) });
    };
    await done;
  } finally {
    database.close();
  }
}

export async function getCollectionBundle() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(["cases", ...RELATED_STORES], "readonly");
    const storeRequests = ["cases", ...RELATED_STORES].map((storeName) =>
      requestResult(transaction.objectStore(storeName).getAll())
    );
    const records = await Promise.all(storeRequests);
    return Object.fromEntries([["schemaVersion", 1], ...["cases", ...RELATED_STORES].map((name, index) => [
      name,
      name === "cases" ? records[index] : sortRelatedRecords(records[index])
    ])]);
  } finally {
    database.close();
  }
}

export async function findImportConflicts(bundle) {
  const existing = await getCollectionBundle();
  const existingCasesById = new Map(existing.cases.map((item) => [item.id, item]));
  const existingNumbers = new Map(existing.cases.filter((item) => typeof item.caseNumber === "string").map((item) => [item.caseNumber.trim().toLocaleLowerCase(), item]));
  const existingIdsByStore = new Map(["cases", ...RELATED_STORES].map((name) => [name, new Set(existing[name].map((item) => item.id))]));
  const conflicts = new Map();

  function addConflict(caseRecord, reason) {
    if (!conflicts.has(caseRecord.id)) conflicts.set(caseRecord.id, { caseId: caseRecord.id, title: caseRecord.title, caseNumber: caseRecord.caseNumber, reasons: [] });
    conflicts.get(caseRecord.id).reasons.push(reason);
  }

  for (const caseRecord of bundle.cases) {
    if (existingCasesById.has(caseRecord.id)) addConflict(caseRecord, "A case with this ID is already saved.");
    const matchingNumber = existingNumbers.get(caseRecord.caseNumber.trim().toLocaleLowerCase());
    if (matchingNumber) addConflict(caseRecord, `Case number ${caseRecord.caseNumber} is already used by “${matchingNumber.title}”.`);
  }

  const incomingCases = new Map(bundle.cases.map((item) => [item.id, item]));
  for (const storeName of RELATED_STORES) {
    for (const record of bundle[storeName]) {
      if (!existingIdsByStore.get(storeName).has(record.id)) continue;
      const caseRecord = incomingCases.get(record.caseId);
      if (caseRecord) addConflict(caseRecord, `An existing ${storeName} record uses one of this case’s IDs.`);
    }
  }
  return [...conflicts.values()];
}

export async function importCollectionBundle(bundle, skippedCaseIds = []) {
  const database = await openDatabase();
  const skipped = new Set(skippedCaseIds);
  const includedCaseIds = new Set(bundle.cases.filter((item) => !skipped.has(item.id)).map((item) => item.id));
  if (includedCaseIds.size === 0) {
    database.close();
    return 0;
  }

  try {
    const storeNames = ["cases", ...RELATED_STORES, "meta"];
    const transaction = database.transaction(storeNames, "readwrite");
    const done = transactionDone(transaction);
    for (const caseRecord of bundle.cases) {
      if (includedCaseIds.has(caseRecord.id)) transaction.objectStore("cases").add(caseRecord);
    }
    for (const storeName of RELATED_STORES) {
      for (const record of bundle[storeName]) {
        if (includedCaseIds.has(record.caseId)) transaction.objectStore(storeName).add(record);
      }
    }
    transaction.objectStore("meta").put({ key: "sample-case-seeded", value: true });
    await done;
    return includedCaseIds.size;
  } finally {
    database.close();
  }
}
