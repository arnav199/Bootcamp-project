import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const datasetDir = path.join(root, "data", "raw", "resume-role-dataset");

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(datasetDir, name), "utf8"));
}

export function loadDataset() {
  const training = readCsv("training_data.csv");
  const roles = readCsv("job_roles.csv");
  const skillRows = readCsv("skills_list.csv");
  const testResumes = JSON.parse(
    fs.readFileSync(path.join(datasetDir, "test_resumes.json"), "utf8"),
  );

  return {
    training,
    roles,
    skills: skillRows.map((row) => ({
      name: row["Skill Name"],
      category: row.Category,
    })),
    testResumes,
    datasetDir,
  };
}

