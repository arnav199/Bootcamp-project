import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/data.js";

test("parseCsv handles quoted commas and escaped quotes", () => {
  const rows = parseCsv('Name,Summary\n"Ada","Built APIs, dashboards, and ""tools"""\n');
  assert.deepEqual(rows, [
    { Name: "Ada", Summary: 'Built APIs, dashboards, and "tools"' },
  ]);
});

