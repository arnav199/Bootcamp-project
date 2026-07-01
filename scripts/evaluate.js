import { createAnalyzer } from "../src/analyzer.js";
import { loadDataset } from "../src/data.js";

const dataset = loadDataset();
const analyzer = createAnalyzer(dataset);
let topOneHits = 0;
let topThreeHits = 0;

for (const sample of dataset.testResumes) {
  const expected = new Set(sample.expected_roles);
  const ranked = analyzer.rankRoles(
    `${sample.description ?? ""}\n${sample.resume_text ?? ""}`,
    3,
  );
  if (expected.has(ranked[0]?.title)) topOneHits += 1;
  if (ranked.some((role) => expected.has(role.title))) topThreeHits += 1;
  console.log(
    `${sample.name.padEnd(18)} expected=${sample.expected_roles[0].padEnd(28)} ranked=${ranked.map((role) => role.title).join(" > ")}`,
  );
}

const total = dataset.testResumes.length;
console.log("\nEvaluation summary");
console.log(`Samples:       ${total}`);
console.log(`Top-1 recall: ${(100 * topOneHits / total).toFixed(1)}%`);
console.log(`Top-3 recall: ${(100 * topThreeHits / total).toFixed(1)}%`);
