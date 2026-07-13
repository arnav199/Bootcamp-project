import test from "node:test";
import assert from "node:assert/strict";
import { createAnalyzer, internals } from "../src/analyzer.js";
import { loadDataset } from "../src/data.js";

const analyzer = createAnalyzer(loadDataset());

test("dataset builds a model with expected coverage", () => {
  assert.equal(analyzer.meta.trainingRecords, 10_000);
  assert.equal(analyzer.meta.roles, 324);
  assert.ok(analyzer.meta.skills >= 100);
});

test("extracts canonical technical skills without partial-word matches", () => {
  const skills = analyzer.extractSkills("Built APIs with Python, Node.js, React, and C++.");
  assert.ok(skills.includes("Python"));
  assert.ok(skills.includes("Node.js"));
  assert.ok(skills.includes("React"));
  assert.ok(skills.includes("C++"));
});

test("extracts experience and education levels", () => {
  assert.equal(internals.experienceYears("Over 4+ years of experience"), 4);
  assert.equal(internals.educationLevel("Master's in Data Science"), 4);
  assert.equal(internals.educationLevel("Bachelor's in Engineering"), 3);
});

test("analyzes a targeted resume and returns bounded scoring", () => {
  const result = analyzer.analyze(
    "Bachelor's in Data Science. 3 years. Skills: Python, SQL, Machine Learning, Statistics, Pandas, Data Analysis.",
    "Data Scientist with 3 years. Requires Python, SQL, Machine Learning, TensorFlow, Statistics and Data Analysis.",
    "Data Scientist",
  );
  assert.ok(result.score >= 50 && result.score <= 100);
  assert.equal(result.match.missingSkills.includes("TensorFlow"), true);
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.model.trainingRecords, 10_000);
});

test("uses the requested target role when it is not the top prediction", () => {
  const result = analyzer.analyze(
    "Built Python APIs, deployed Node.js services, and collaborated with product teams. 4 years of experience. Bachelor's in Computer Science.",
    "",
    "Software Engineer",
  );
  assert.ok(result.roleAlignment > 0);
  assert.notEqual(result.match.skillCoverage, null);
  assert.ok(result.match.skillCoverage > 0);
});

