const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "have", "in", "is", "it", "of", "on", "or", "our", "that", "the", "their",
  "this", "to", "using", "was", "we", "will", "with", "you", "your", "years",
  "year", "skills", "education", "experience", "responsibilities", "required",
  "preferred", "candidate", "role", "work", "working", "including",
]);

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value = "") {
  return normalize(value)
    .split(" ")
    .map((token) => token.replace(/^[./-]+|[./-]+$/g, ""))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function splitPipe(value = "") {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function educationLevel(text = "") {
  const value = normalize(text);
  if (/\b(phd|ph\.?d|doctorate|doctoral)\b/.test(value)) return 5;
  if (/\b(master|mba|m\.?s|mtech|m\.?tech)\b/.test(value)) return 4;
  if (/\b(bachelor|b\.?s|btech|b\.?tech|undergraduate)\b/.test(value)) return 3;
  if (/\b(diploma|associate)\b/.test(value)) return 2;
  if (/\b(high school|secondary)\b/.test(value)) return 1;
  return 0;
}

function experienceYears(text = "") {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/gi)];
  return matches.length
    ? Math.max(...matches.map((match) => Number(match[1])))
    : 0;
}

function vectorize(text, idf) {
  const counts = new Map();
  for (const token of tokens(text)) increment(counts, token);
  const vector = new Map();
  let norm = 0;
  for (const [token, count] of counts) {
    const weight = (1 + Math.log(count)) * (idf.get(token) ?? 1);
    vector.set(token, weight);
    norm += weight * weight;
  }
  return { vector, norm: Math.sqrt(norm) || 1 };
}

function cosine(left, right) {
  let dot = 0;
  const [small, large] =
    left.vector.size < right.vector.size
      ? [left.vector, right.vector]
      : [right.vector, left.vector];
  for (const [token, weight] of small) dot += weight * (large.get(token) ?? 0);
  return dot / (left.norm * right.norm);
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values) {
  return [...new Set(values)];
}

export function createAnalyzer(dataset) {
  const profiles = new Map();
  const documentFrequency = new Map();
  const roleRequirements = new Map(
    dataset.roles.map((role) => [normalize(role["Job Title"]), role]),
  );

  for (const row of dataset.training) {
    const title = row["Job Role"];
    if (!profiles.has(title)) {
      profiles.set(title, {
        title,
        category: row.Category,
        count: 0,
        experienceTotal: 0,
        skillCounts: new Map(),
        tokenCounts: new Map(),
        educationCounts: new Map(),
      });
    }
    const profile = profiles.get(title);
    profile.count += 1;
    profile.experienceTotal += Number(row["Experience Years"]) || 0;

    for (const skill of splitPipe(row.Skills)) increment(profile.skillCounts, skill);
    increment(profile.educationCounts, row.Education);

    const documentTokens = new Set(tokens(row["Resume Text"]));
    for (const token of documentTokens) increment(documentFrequency, token);
    for (const token of tokens(row["Resume Text"])) increment(profile.tokenCounts, token);
  }

  const docCount = dataset.training.length;
  const idf = new Map(
    [...documentFrequency].map(([token, count]) => [
      token,
      Math.log((docCount + 1) / (count + 1)) + 1,
    ]),
  );

  const skillCatalog = unique([
    ...dataset.skills.map((skill) => skill.name),
    ...dataset.roles.flatMap((role) => splitPipe(role["Required Skills"])),
  ]).sort((a, b) => b.length - a.length);

  const skillLookup = new Map(skillCatalog.map((skill) => [normalize(skill), skill]));

  for (const profile of profiles.values()) {
    const requirement = roleRequirements.get(normalize(profile.title));
    profile.requiredSkills = requirement ? splitPipe(requirement["Required Skills"]) : [];
    profile.requiredExperience = requirement
      ? Number(requirement["Experience Years"]) || 0
      : Math.round(profile.experienceTotal / profile.count);
    profile.educationRequirement = requirement?.["Education Requirement"] ?? "";
    profile.salaryRange = requirement?.["Salary Range"] ?? "Not available";
    profile.averageExperience = profile.experienceTotal / profile.count;

    const weightedTokens = new Map();
    let normValue = 0;
    for (const [token, count] of profile.tokenCounts) {
      const weight = (count / profile.count) * (idf.get(token) ?? 1);
      weightedTokens.set(token, weight);
      normValue += weight * weight;
    }
    profile.vector = { vector: weightedTokens, norm: Math.sqrt(normValue) || 1 };
    profile.topSkills = [...profile.skillCounts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([skill]) => skill);
  }

  function extractSkills(text = "") {
    const haystack = ` ${normalize(text)} `;
    const found = [];
    for (const skill of skillCatalog) {
      const needle = normalize(skill);
      const index = haystack.indexOf(needle);
      if (index < 0) continue;
      const before = haystack[index - 1] ?? " ";
      const after = haystack[index + needle.length] ?? " ";
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
      found.push(skillLookup.get(needle));
    }
    return unique(found);
  }

  function rankRoles(resumeText, limit = 5) {
    const resumeSkills = new Set(extractSkills(resumeText).map(normalize));
    const resumeVector = vectorize(resumeText, idf);
    const resumeTokens = new Set(tokens(resumeText.replaceAll("-", " ")));
    const years = experienceYears(resumeText);

    return [...profiles.values()]
      .map((profile) => {
        const desiredSkills = unique([...profile.requiredSkills, ...profile.topSkills]).slice(0, 14);
        const matched = desiredSkills.filter((skill) => resumeSkills.has(normalize(skill)));
        const skillFit = desiredSkills.length ? matched.length / desiredSkills.length : 0;
        const semanticFit = cosine(resumeVector, profile.vector);
        const roleTokens = tokens(profile.title);
        const titleFit = roleTokens.length
          ? roleTokens.filter((token) => resumeTokens.has(token)).length / roleTokens.length
          : 0;
        const expFit = years
          ? Math.min(years / Math.max(profile.requiredExperience, 1), 1)
          : 0.45;
        const rawScore =
          0.55 * skillFit + 0.25 * semanticFit + 0.12 * titleFit + 0.08 * expFit;
        return {
          title: profile.title,
          category: profile.category,
          score: Math.round(Math.min(rawScore * 125, 100)),
          matchedSkills: matched,
          missingSkills: desiredSkills.filter((skill) => !resumeSkills.has(normalize(skill))).slice(0, 8),
          requiredExperience: profile.requiredExperience,
          salaryRange: profile.salaryRange,
        };
      })
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, limit);
  }

  function analyze(resumeText, jobDescription = "", targetRole = "") {
    if (!resumeText?.trim()) throw new Error("Resume text is required.");

    const resumeSkills = extractSkills(resumeText);
    const rankings = rankRoles(resumeText, 5);
    const predicted = rankings[0];
    const resumeYears = experienceYears(resumeText);
    const resumeEducation = educationLevel(resumeText);

    let jdSkills = extractSkills(jobDescription);
    const targetProfile = roleRequirements.get(normalize(targetRole));
    if (!jdSkills.length && targetProfile) jdSkills = splitPipe(targetProfile["Required Skills"]);

    const jdYears = experienceYears(jobDescription) ||
      Number(targetProfile?.["Experience Years"] ?? 0);
    const jdEducation = educationLevel(jobDescription) ||
      educationLevel(targetProfile?.["Education Requirement"] ?? "");
    const resumeSkillSet = new Set(resumeSkills.map(normalize));
    const matchedSkills = jdSkills.filter((skill) => resumeSkillSet.has(normalize(skill)));
    const missingSkills = jdSkills.filter((skill) => !resumeSkillSet.has(normalize(skill)));

    const hasJobTarget = Boolean(jobDescription.trim() || targetRole.trim());
    const skillScore = jdSkills.length ? matchedSkills.length / jdSkills.length : predicted.score / 100;
    const semanticScore = jobDescription.trim()
      ? cosine(vectorize(resumeText, idf), vectorize(jobDescription, idf))
      : predicted.score / 100;
    const experienceScore = jdYears
      ? Math.min(resumeYears / jdYears, 1)
      : resumeYears
        ? 1
        : 0.5;
    const educationScore = jdEducation
      ? resumeEducation
        ? Math.min(resumeEducation / jdEducation, 1)
        : 0.35
      : 1;

    const score = Math.round(
      100 * (
        (hasJobTarget ? 0.55 : 0.5) * skillScore +
        (hasJobTarget ? 0.25 : 0.35) * semanticScore +
        0.12 * experienceScore +
        0.08 * educationScore
      ),
    );

    const roleAlignment = targetRole
      ? rankings.find((role) => normalize(role.title) === normalize(targetRole))?.score ?? 0
      : predicted.score;

    return {
      score: Math.max(0, Math.min(score, 100)),
      scoreLabel: score >= 80 ? "Strong match" : score >= 60 ? "Competitive" : score >= 40 ? "Developing" : "Low match",
      predictedRole: predicted,
      roleAlignment,
      extracted: {
        skills: resumeSkills,
        experienceYears: resumeYears,
        educationLevel: resumeEducation,
      },
      match: {
        matchedSkills,
        missingSkills,
        skillCoverage: jdSkills.length ? Math.round(skillScore * 100) : null,
        semanticSimilarity: Math.round(semanticScore * 100),
        experienceFit: Math.round(experienceScore * 100),
        educationFit: Math.round(educationScore * 100),
      },
      assessment: {
        macroFit: `${predicted.title} is the strongest trajectory match in the ${predicted.category} category. Experience evidence is ${resumeYears ? `${resumeYears} year(s)` : "not explicitly quantified"}.`,
        microFit: resumeSkills.length
          ? `${resumeSkills.length} recognized skills were extracted; ${matchedSkills.length} directly match the supplied target requirements.`
          : "No catalogued skills were extracted. Add an explicit Skills section using standard terminology.",
        gapAnalysis: missingSkills.length
          ? `Priority gaps: ${missingSkills.slice(0, 6).join(", ")}. Add only skills you can demonstrate through experience or projects.`
          : "No explicit target-skill gaps were detected from the supplied text.",
      },
      recommendations: rankings.slice(0, 3),
      model: {
        algorithm: "TF-IDF semantic centroid + skill/experience weighted ranking",
        trainingRecords: dataset.training.length,
        roleClasses: profiles.size,
      },
    };
  }

  return {
    analyze,
    extractSkills,
    rankRoles,
    meta: {
      trainingRecords: dataset.training.length,
      roles: profiles.size,
      categories: unique([...profiles.values()].map((profile) => profile.category)).length,
      skills: skillCatalog.length,
      roleTitles: [...profiles.keys()].sort(),
    },
  };
}

export const internals = {
  educationLevel,
  experienceYears,
  normalize,
  tokens,
};
