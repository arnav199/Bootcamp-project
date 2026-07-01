const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  meta: null,
  resume: {
    basics: {},
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  },
};

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function loadMeta() {
  try {
    const response = await fetch("/api/meta");
    if (!response.ok) throw new Error("Model unavailable");
    state.meta = await response.json();
    $("#modelStatus").innerHTML = `<span class="status-dot"></span><span>${state.meta.trainingRecords.toLocaleString()} records · ${state.meta.roles} roles · Local model</span>`;
    $("#roleOptions").innerHTML = state.meta.roleTitles
      .map((role) => `<option value="${escapeHtml(role)}"></option>`)
      .join("");
  } catch {
    $("#modelStatus").innerHTML = `<span class="status-dot"></span><span>Model connection unavailable</span>`;
  }
}

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function setView(name) {
  $$(".mode-button").forEach((button) =>
    button.classList.toggle("active", button.dataset.view === name),
  );
  $$(".view").forEach((view) =>
    view.classList.toggle("active", view.id === `${name}View`),
  );
}

$$(".mode-button").forEach((button) =>
  button.addEventListener("click", () => setView(button.dataset.view)),
);

$("#resumeText").addEventListener("input", (event) => {
  $("#resumeCount").textContent = event.target.value.length.toLocaleString();
});

$("#resumeFile").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const content = await file.text();
  let text = content;
  if (file.name.endsWith(".json")) {
    try {
      text = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      showToast("That JSON file could not be parsed.");
      return;
    }
  }
  $("#resumeText").value = text;
  $("#resumeText").dispatchEvent(new Event("input"));
  showToast(`${file.name} imported`);
});

$("#loadDemo").addEventListener("click", () => {
  $("#targetRole").value = "Data Scientist";
  $("#resumeText").value = `ARJUN MEHTA
Data Analyst

SUMMARY
Data analyst with 3 years of experience turning operational data into decision-ready insights.

EXPERIENCE
Data Analyst — Northstar Retail | 2023–Present
- Built Python and SQL forecasting workflows that improved inventory accuracy by 18%.
- Created Tableau dashboards used by 40+ commercial stakeholders.
- Automated weekly reporting with Pandas, reducing preparation time by 12 hours per month.

EDUCATION
Bachelor's in Computer Science

SKILLS
Python, SQL, Pandas, Statistics, Data Analysis, Tableau, Excel, Machine Learning, Communication`;
  $("#jobDescription").value = `We are hiring a Data Scientist with 3+ years of experience. Required skills include Python, SQL, Machine Learning, TensorFlow, Statistics, Data Analysis, Pandas, and data visualization. The candidate should hold a Bachelor's degree and communicate insights to stakeholders.`;
  $("#resumeText").dispatchEvent(new Event("input"));
  showToast("Sample loaded");
});

$("#analyzerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#analyzeButton");
  const error = $("#analyzerError");
  error.textContent = "";
  button.disabled = true;
  button.querySelector("span").textContent = "Mapping evidence…";
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText: $("#resumeText").value,
        jobDescription: $("#jobDescription").value,
        targetRole: $("#targetRole").value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    renderAnalysis(data);
  } catch (caught) {
    error.textContent = caught.message;
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Run deep analysis";
  }
});

function renderChips(element, values, emptyMessage) {
  element.innerHTML = values.length
    ? values.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join("")
    : `<span class="empty-chip">${emptyMessage}</span>`;
}

function renderAnalysis(data) {
  $("#emptyResults").hidden = true;
  $("#analysisResults").hidden = false;
  $("#resultsPanel").classList.remove("empty-state");
  $("#scoreRing").style.setProperty("--score", data.score);
  $("#matchScore").textContent = data.score;
  $("#scoreLabel").textContent = data.scoreLabel;
  $("#predictedRole").textContent = data.predictedRole.title;
  $("#roleCategory").textContent = `${data.predictedRole.category} · ${data.extracted.skills.length} skills recognized`;
  $("#skillCoverage").textContent = data.match.skillCoverage === null ? "N/A" : `${data.match.skillCoverage}%`;
  $("#semanticFit").textContent = `${data.match.semanticSimilarity}%`;
  $("#experienceFit").textContent = `${data.match.experienceFit}%`;
  $("#macroFit").textContent = data.assessment.macroFit;
  $("#microFit").textContent = data.assessment.microFit;
  $("#gapAnalysis").textContent = data.assessment.gapAnalysis;
  renderChips($("#matchedSkills"), data.match.matchedSkills, "Supply a job description to calculate direct matches.");
  renderChips($("#missingSkills"), data.match.missingSkills, "No explicit target gaps detected.");
  $("#recommendations").innerHTML = data.recommendations
    .map((role) => `
      <div class="recommendation">
        <div>
          <strong>${escapeHtml(role.title)}</strong>
          <span>${escapeHtml(role.category)} · ${escapeHtml(role.salaryRange)}</span>
        </div>
        <b>${role.score}</b>
      </div>
    `)
    .join("");
  $("#resultsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function addEntry(type) {
  const plural = type === "project" ? "projectEntries" : `${type}Entries`;
  const template = $(`#${type}Template`);
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector(".remove-button").addEventListener("click", () => {
    node.remove();
    updateResumeState();
  });
  node.addEventListener("input", updateResumeState);
  $(`#${plural}`).append(node);
  updateResumeState();
}

$$("[data-add]").forEach((button) =>
  button.addEventListener("click", () => addEntry(button.dataset.add)),
);

function collectEntries(type) {
  return $$(`[data-entry="${type}"]`).map((entry) => {
    const result = {};
    $$("[data-field]", entry).forEach((field) => {
      result[field.dataset.field] = field.dataset.field === "highlights"
        ? field.value.split("\n").map((line) => line.replace(/^[-•]\s*/, "").trim()).filter(Boolean)
        : field.value.trim();
    });
    return result;
  }).filter((entry) => Object.values(entry).some((value) => Array.isArray(value) ? value.length : value));
}

function updateResumeState() {
  const form = new FormData($("#builderForm"));
  state.resume = {
    basics: {
      name: String(form.get("fullName") || "").trim(),
      title: String(form.get("title") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      location: String(form.get("location") || "").trim(),
      url: String(form.get("url") || "").trim(),
    },
    summary: String(form.get("summary") || "").trim(),
    skills: String(form.get("skills") || "").split(",").map((skill) => skill.trim()).filter(Boolean),
    experience: collectEntries("experience"),
    education: collectEntries("education"),
    projects: collectEntries("project"),
    certifications: [],
  };
  renderResume();
}

$("#builderForm").addEventListener("input", updateResumeState);

function renderResume() {
  const { basics, summary, skills, experience, education, projects } = state.resume;
  $(".resume-preview header h2").textContent = basics.name || "Your Name";
  $(".preview-title").textContent = basics.title || "Professional Title";
  $(".preview-contact").textContent =
    [basics.email, basics.phone, basics.location, basics.url].filter(Boolean).join(" · ") ||
    "email@example.com · City · LinkedIn";

  $("[data-preview='summary'] p").textContent =
    summary || "Your focused professional summary will appear here.";
  $("[data-preview='skills'] p").textContent =
    skills.join(" • ") || "Add role-relevant skills using standard terminology.";

  $("[data-preview='experience']").innerHTML = `<h3>Professional Experience</h3>${
    experience.length
      ? experience.map((item) => `
          <div class="preview-item">
            <div class="preview-item-head">
              <span>${escapeHtml([item.title, item.company].filter(Boolean).join(" — "))}</span>
              <span>${escapeHtml([item.startDate, item.endDate].filter(Boolean).join(" – "))}</span>
            </div>
            ${item.highlights?.length ? `<ul>${item.highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
          </div>`).join("")
      : "<p>Add a role and describe evidence-backed achievements.</p>"
  }`;

  $("[data-preview='education']").innerHTML = `<h3>Education</h3>${
    education.length
      ? education.map((item) => `
          <div class="preview-item">
            <div class="preview-item-head">
              <span>${escapeHtml(item.degree || "")}</span><span>${escapeHtml(item.date || "")}</span>
            </div>
            <p>${escapeHtml([item.institution, item.details].filter(Boolean).join(" · "))}</p>
          </div>`).join("")
      : "<p>Add your education.</p>"
  }`;

  $("[data-preview='projects']").innerHTML = `<h3>Projects</h3>${
    projects.length
      ? projects.map((item) => `
          <div class="preview-item">
            <div class="preview-item-head"><span>${escapeHtml(item.name || "")}</span><span>${escapeHtml(item.technologies || "")}</span></div>
            <p>${escapeHtml(item.description || "")}</p>
          </div>`).join("")
      : "<p>Add relevant projects.</p>"
  }`;
}

function resumeAsText() {
  const { basics, summary, skills, experience, education, projects } = state.resume;
  const lines = [
    basics.name?.toUpperCase(),
    basics.title,
    [basics.email, basics.phone, basics.location, basics.url].filter(Boolean).join(" | "),
    "",
    "PROFESSIONAL SUMMARY",
    summary,
    "",
    "CORE SKILLS",
    skills.join(", "),
    "",
    "PROFESSIONAL EXPERIENCE",
    ...experience.flatMap((item) => [
      [item.title, item.company].filter(Boolean).join(" — "),
      [item.startDate, item.endDate].filter(Boolean).join(" – "),
      ...(item.highlights || []).map((line) => `- ${line}`),
      "",
    ]),
    "EDUCATION",
    ...education.flatMap((item) => [
      [item.degree, item.institution].filter(Boolean).join(" — "),
      [item.date, item.details].filter(Boolean).join(" | "),
      "",
    ]),
    "PROJECTS",
    ...projects.flatMap((item) => [
      [item.name, item.technologies].filter(Boolean).join(" — "),
      item.description,
      "",
    ]),
  ];
  return lines.filter((line, index) => line || lines[index - 1]).join("\n").trim();
}

$("#copyResume").addEventListener("click", async () => {
  updateResumeState();
  await navigator.clipboard.writeText(resumeAsText());
  showToast("ATS text copied");
});

$("#downloadJson").addEventListener("click", async () => {
  updateResumeState();
  const response = await fetch("/api/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.resume),
  });
  const schema = await response.json();
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.resume.basics.name || "resume"}.json`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Resume JSON downloaded");
});

addEntry("experience");
addEntry("education");
addEntry("project");
loadMeta();
