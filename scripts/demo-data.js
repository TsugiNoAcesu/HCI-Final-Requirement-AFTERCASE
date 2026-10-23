const reliability = [
  "Official finding",
  "Reported allegation",
  "Established fact",
  "Conflicting accounts",
  "Unverified claim",
  "Personal interpretation"
];

function events(caseId, steps) {
  return steps.map(([dateText, description], index) => ({
    id: `${caseId}-event-${index + 1}`,
    caseId,
    position: index + 1,
    dateText,
    description,
    reliability: reliability[index % reliability.length]
  }));
}

function people(caseId, entries) {
  return entries.map(([name, role, details], index) => ({
    id: `${caseId}-person-${index + 1}`, caseId, position: index + 1, name, role, details
  }));
}

function evidence(caseId, entries) {
  return entries.map(([title, details, quality], index) => ({
    id: `${caseId}-evidence-${index + 1}`, caseId, position: index + 1, title, details, reliability: quality
  }));
}

function sources(caseId, entries) {
  return entries.map(([title, url, publisher], index) => ({
    id: `${caseId}-source-${index + 1}`, caseId, position: index + 1, title, url, publisher, publicationDate: "", notes: "Prototype reference"
  }));
}

function note(caseId, text) {
  return [{ id: `${caseId}-note-1`, caseId, position: 1, text }];
}

function caseRecord(id, caseNumber, title, summary, categories, realWorldStatus, myProgress, location, keywords, isWatchlisted = false) {
  return {
    id, caseNumber, type: "Real", title, summary, categories, realWorldStatus, myProgress, location,
    keywords, imageUrl: null, isWatchlisted, isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

const bundles = [
  {
    caseRecord: caseRecord("demo-s-001", "S-001", "The Bellweather Platform Light", "A night signal appeared on an unused rail platform in the invented town of Bellweather. A station attendant later vanished from the shift ledger, leaving conflicting accounts of the final train.", ["Missing Persons", "Unsolved Mysteries"], "Unsolved", "In Progress", "Bellweather Junction", ["railway", "night signal", "missing attendant"]),
    timelineEvents: events("demo-s-001", [["12 Oct 2018", "A pale signal was reported on Platform 4 after the last scheduled service."], ["13 Oct 2018", "The station log records attendant Mara Venn beginning an overnight shift."], ["Before dawn", "A freight crew said the platform lamps were dark when they passed."], ["14 Oct 2018", "Mara Venn was reported missing by a housemate."], ["Following week", "A search team found a torn timetable near the service tunnel."], ["Later review", "Investigators could not establish whether the signal was a lamp or a reflection."]]),
    people: people("demo-s-001", [["Mara Venn", "Missing station attendant", "Last listed on an overnight shift."], ["Ivo Pell", "Freight conductor", "Reported the platform was dark."], ["Sela Orin", "Housemate", "Filed the initial missing-person report."]]),
    evidenceItems: evidence("demo-s-001", [["Shift ledger", "Lists Mara Venn on the overnight roster.", "Official finding"], ["Torn timetable", "Recovered near the service tunnel; its connection to the disappearance is unverified.", "Unverified claim"]]),
    sources: sources("demo-s-001", [["Bellweather station log", "https://example.com/records/S-001/station-log", "AFTERCASE sample archive"], ["Search summary", "https://example.com/records/S-001/search", "AFTERCASE sample archive"]]),
    personalNotes: note("demo-s-001", "Compare the freight crew's route time with the overnight roster.")
  },
  {
    caseRecord: caseRecord("demo-s-002", "S-002", "The Ashmere Conservatory Fire", "A fire damaged the glasshouse at Ashmere Conservatory after a donor reception. The fictional inquiry concluded that the fire was deliberately set, though witnesses disagreed about who entered the west wing.", ["Murder", "Unsolved Mysteries"], "Solved", "Completed", "Ashmere Conservatory", ["fire", "conservatory", "west wing"]),
    timelineEvents: events("demo-s-002", [["3 May 2020", "The conservatory hosted its annual evening reception."], ["9:18 p.m.", "A caretaker reported smoke near the west glasshouse."], ["9:31 p.m.", "Fire crews arrived and evacuated the north gallery."], ["Next morning", "Inspectors documented an ignition point beside the potting room."], ["One month later", "The inquiry announced its official finding that the fire was intentional."], ["Final review", "Two guests gave conflicting accounts of a person leaving through the west door."]]),
    people: people("demo-s-002", [["Nera Sol", "Conservatory director", "Organized the donor reception."], ["Tovin Rusk", "Night caretaker", "First reported the smoke."], ["Edda Vale", "Inquiry lead", "Presented the fictional inquiry findings."]]),
    evidenceItems: evidence("demo-s-002", [["Fire inspection report", "Records the ignition point and damage pattern.", "Official finding"], ["West door statements", "Guest accounts disagree about who used the exit.", "Conflicting accounts"]]),
    sources: sources("demo-s-002", [["Ashmere inquiry report", "https://example.com/records/S-002/inquiry", "AFTERCASE sample archive"], ["Conservatory incident file", "https://example.com/records/S-002/incident", "AFTERCASE sample archive"]]),
    personalNotes: note("demo-s-002", "This sample file is marked completed; retain the conflicting witness accounts in the summary.")
  },
  {
    caseRecord: caseRecord("demo-s-003", "S-003", "The Lanterns at Cinder Vale", "Three lanterns were seen moving along a disused footpath in Cinder Vale on the evening a delivery driver failed to return home. No source establishes whether the lights were connected to the disappearance.", ["Missing Persons", "Unsolved Mysteries"], "Unknown or disputed", "Not Started", "Cinder Vale", ["lanterns", "footpath", "missing driver"], true),
    timelineEvents: events("demo-s-003", [["22 Nov 2021", "A delivery driver completed the first part of a route through Cinder Vale."], ["7:42 p.m.", "A resident reported three lights on the disused path."], ["8:10 p.m.", "The driver's van was found parked near the old footbridge."], ["Following morning", "A family member filed a missing-person report."], ["Three days later", "Searchers found a sealed lunch tin beside a stone marker."], ["Current file", "The origin and relevance of the lantern sighting remain uncertain."]]),
    people: people("demo-s-003", [["Perrin Doss", "Missing delivery driver", "Last known route ended near the footbridge."], ["Ari Noll", "Resident witness", "Reported seeing lights on the path."], ["Tessa Mire", "Search coordinator", "Recorded the lunch tin in the search inventory."]]),
    evidenceItems: evidence("demo-s-003", [["Van location record", "Places the vehicle near the old footbridge.", "Established fact"], ["Lantern sighting", "A single resident described three moving lights.", "Reported allegation"], ["Lunch tin", "Recovered near a stone marker; ownership is unknown.", "Unverified claim"]]),
    sources: sources("demo-s-003", [["Cinder Vale search log", "https://example.com/records/S-003/search-log", "AFTERCASE sample archive"], ["Route notes", "https://example.com/records/S-003/route", "AFTERCASE sample archive"]]),
    personalNotes: note("demo-s-003", "Watchlisted: check whether later statements clarify the lantern sighting.")
  },
  {
    caseRecord: caseRecord("demo-s-004", "S-004", "The Marrowgate Archive Room", "A locked archive room in Marrowgate's municipal hall was found open after a records clerk reported an unfamiliar voice inside. The case is ongoing in this invented setting, with no confirmed account of how the door was opened.", ["Murder", "Unsolved Mysteries"], "Ongoing", "In Progress", "Marrowgate Municipal Hall", ["archive", "locked room", "records clerk"]),
    timelineEvents: events("demo-s-004", [["6 Feb 2022", "The evening clerk completed the standard archive-room inventory."], ["7:05 p.m.", "A security log recorded a brief power interruption."], ["7:19 p.m.", "The archive-room door was found open."], ["Same evening", "A desk bell was discovered inside the locked records cabinet."], ["Following day", "Hall staff submitted separate accounts of hearing a voice."], ["Current review", "Investigators have not confirmed how the door opened."]]),
    people: people("demo-s-004", [["Dara Quill", "Evening clerk", "Completed the inventory before the alarm."], ["Oren Pike", "Hall guard", "Recorded the power interruption."], ["Mina Fallow", "Records supervisor", "Reported the open archive-room door."]]),
    evidenceItems: evidence("demo-s-004", [["Security log", "Shows a short power interruption before the door was found open.", "Established fact"], ["Desk bell", "Found inside the records cabinet; no one has explained how it got there.", "Unverified claim"]]),
    sources: sources("demo-s-004", [["Municipal hall incident file", "https://example.com/records/S-004/incident", "AFTERCASE sample archive"], ["Staff statements", "https://example.com/records/S-004/statements", "AFTERCASE sample archive"]]),
    personalNotes: note("demo-s-004", "Compare the power interruption with the guard's patrol schedule.")
  }
];

export default {
  schemaVersion: 1,
  cases: bundles.map((bundle) => bundle.caseRecord),
  timelineEvents: bundles.flatMap((bundle) => bundle.timelineEvents),
  people: bundles.flatMap((bundle) => bundle.people),
  evidenceItems: bundles.flatMap((bundle) => bundle.evidenceItems),
  sources: bundles.flatMap((bundle) => bundle.sources),
  personalNotes: bundles.flatMap((bundle) => bundle.personalNotes)
};
