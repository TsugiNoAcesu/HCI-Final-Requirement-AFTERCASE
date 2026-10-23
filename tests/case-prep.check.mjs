import assert from "node:assert/strict";
import { parseLabeledFields } from "../scripts/case-prep.js";

const fencedSource = [
  "```text",
  "Case title: The Example Lake Disappearance",
  "Case number:",
  "My progress: Not Started",
  "Real-world status: Unsolved",
  "Location: Example Lake, Ohio",
  "Categories: Missing Persons, Unsolved Mysteries",
  "Keywords: disappearance, lake, 1987",
  "Overview: According to the narrator, a hiker vanished from Example Lake in 1987.",
  "Police are described as having closed the file.",
  "```",
  "## Source and verification notes",
  "- Case number: not supplied; enter it manually.",
  "- Location: given by the narrator only.",
  "- Real-world status: Unsolved is based on the narrator saying no arrest was made."
].join("\n");
const caseA = parseLabeledFields(fencedSource);
assert.equal(caseA.suggestions.caseNumber, undefined);
assert.equal(caseA.suggestions.location, "Example Lake, Ohio");
assert.equal(caseA.suggestions.realWorldStatus, "Unsolved");
assert.equal(caseA.suggestions.summary, "According to the narrator, a hiker vanished from Example Lake in 1987.\nPolice are described as having closed the file.");
assert.deepEqual(caseA.missing, ["caseNumber"]);
assert.deepEqual(caseA.rejected, []);

const caseB = parseLabeledFields([
  "**Case title:** X",
  "**Case number:** 003",
  "**Real-world status:** Unsolved (disputed)",
  "**Categories:** Missing Persons",
  "**Overview:** Short overview."
].join("\n"));
assert.equal(caseB.suggestions.title, "X");
assert.equal(caseB.suggestions.caseNumber, "003");
assert.equal(caseB.suggestions.realWorldStatus, undefined);
assert.deepEqual(caseB.rejected, [{ key: "realWorldStatus", value: "Unsolved (disputed)" }]);

const caseC = parseLabeledFields([
  "Case title: The Example Harbor Fire",
  "Case number: 004",
  "Real-world status: Solved",
  "Location: Example Harbor",
  "Categories: Arson",
  "Overview: The fire started on a Tuesday night.",
  "Location: the old cannery, according to two witnesses, though a third disagreed.",
  "Investigators later named a suspect."
].join("\n"));
assert.equal(caseC.suggestions.location, "Example Harbor");
assert.deepEqual(caseC.suggestions.summary.split("\n"), [
  "The fire started on a Tuesday night.",
  "Location: the old cannery, according to two witnesses, though a third disagreed.",
  "Investigators later named a suspect."
]);

const caseD = parseLabeledFields([
  "Overview: Text first.",
  "Location: Somewhere",
  "Case title: X",
  "Real-world status: Solved",
  "Categories: Murder",
  "Case number: 9"
].join("\n"));
assert.equal(caseD.suggestions.location, "Somewhere");
assert.equal(caseD.suggestions.title, "X");
assert.equal(caseD.suggestions.summary, "Text first.");
assert.deepEqual(caseD.missing, []);

const caseE = parseLabeledFields([
  "## Case title",
  "X",
  "## Overview",
  "Some text.",
  "## Source and verification notes",
  "Case title: Wrong",
  "Overview: Wrong"
].join("\n"));
assert.equal(caseE.suggestions.title, "X");
assert.equal(caseE.suggestions.summary, "Some text.");

const caseF = parseLabeledFields([
  "Case title: Long",
  "Case number: 5",
  "Real-world status: Ongoing",
  "Categories: Test",
  `Overview: ${"A".repeat(3500)}`
].join("\n"));
assert.equal(caseF.overviewTruncated, true);
assert.equal(caseF.suggestions.summary.length, 3000);

console.log("case-prep checks passed (A–F)");
