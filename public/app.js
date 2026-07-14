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

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function fileBaseName(resume = state.resume) {
  return (resume.basics?.name || "resume")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "resume";
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadMeta() {
  try {
    const response = await fetch("/api/meta");
    if (!response.ok) throw new Error("Model unavailable");

    state.meta = await response.json();
    $("#modelStatus").innerHTML =
      `<span class="status-dot"></span><span>${state.meta.trainingRecords.toLocaleString()} records - ${state.meta.roles} roles - Local model</span>`;
    $("#roleOptions").innerHTML = state.meta.roleTitles
      .map((role) => `<option value="${escapeHtml(role)}"></option>`)
      .join("");
  } catch {
    $("#modelStatus").innerHTML = `<span class="status-dot"></span><span>Model unavailable</span>`;
  }
}

function setValidationError(field, message = "") {
  if (!field) return false;
  const label = field.closest("label");
  let feedback = label?.querySelector(".validation-message");

  if (message) {
    field.classList.add("invalid");
    field.setAttribute("aria-invalid", "true");
    if (!feedback && label) {
      feedback = document.createElement("span");
      feedback.className = "validation-message";
      feedback.setAttribute("role", "alert");
      label.append(feedback);
    }
    if (feedback) feedback.textContent = message;
    return false;
  }

  field.classList.remove("invalid");
  field.removeAttribute("aria-invalid");
  feedback?.remove();
  return true;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function validPhone(value) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

function validWebAddress(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return Boolean(url.hostname && (url.hostname.includes(".") || url.hostname === "localhost"));
  } catch {
    return false;
  }
}

function validateBasicField(field) {
  const value = field.value.trim();

  switch (field.name) {
    case "fullName":
      if (!value) return setValidationError(field, "Full name is required.");
      if (value.length < 2 || !/\p{L}/u.test(value)) {
        return setValidationError(field, "Enter a valid full name.");
      }
      break;
    case "title":
      if (value && value.length < 2) {
        return setValidationError(field, "Title is too short.");
      }
      break;
    case "email":
      if (!value) return setValidationError(field, "Email is required.");
      if (!validEmail(value)) return setValidationError(field, "Enter a valid email address.");
      break;
    case "phone":
      if (!value) return setValidationError(field, "Phone number is required.");
      if (!validPhone(value)) {
        return setValidationError(field, "Use a valid phone number with 7 to 15 digits.");
      }
      break;
    case "url":
      if (value && !validWebAddress(value)) {
        return setValidationError(field, "Enter a valid website or LinkedIn address.");
      }
      break;
    case "location":
      if (value && value.length < 2) {
        return setValidationError(field, "Enter a valid location.");
      }
      break;
    case "summary":
      if (value && value.length < 40) {
        return setValidationError(field, "Write at least 40 characters for the summary.");
      }
      break;
    default:
      break;
  }

  return setValidationError(field);
}

function repeatEntryHasContent(entry) {
  return $$("[data-field]", entry).some((field) => field.value.trim());
}

function validateRepeatField(field, entryHasContent = true) {
  if (!entryHasContent) return setValidationError(field);

  const type = field.closest("[data-entry]")?.dataset.entry;
  const key = field.dataset.field;
  const value = field.value.trim();
  const required = {
    experience: {
      title: "Job title is required.",
      company: "Company is required.",
      startDate: "Start date is required.",
      highlights: "Add at least one achievement.",
    },
    education: {
      degree: "Degree is required.",
      institution: "Institution is required.",
    },
    project: {
      name: "Project name is required.",
      description: "Project description is required.",
    },
    certification: {
      name: "Certificate name is required.",
      issuer: "Issuer is required.",
      date: "Date is required.",
    },
  };

  if (required[type]?.[key] && !value) {
    return setValidationError(field, required[type][key]);
  }
  return setValidationError(field);
}

function validateBuilder() {
  let valid = true;

  $$("input[name], textarea[name]", $("#builderForm")).forEach((field) => {
    if (!validateBasicField(field)) valid = false;
  });

  $$("[data-entry]").forEach((entry) => {
    const hasContent = repeatEntryHasContent(entry);
    $$("[data-field]", entry).forEach((field) => {
      if (!validateRepeatField(field, hasContent)) valid = false;
    });
  });

  if (!valid) {
    $(".invalid", $("#builderForm"))?.focus();
    showToast("Please fix the highlighted fields.");
  }
  return valid;
}

function setView(name) {
  $$(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  $$(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${name}View`);
  });
}

function renderChips(element, values, emptyMessage) {
  element.innerHTML = values.length
    ? values.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join("")
    : `<span class="empty-chip">${emptyMessage}</span>`;
}

function renderAnalysis(data) {
  $("#emptyResults").hidden = true;
  $("#analysisResults").hidden = false;
  $("#scoreRing").style.setProperty("--score", data.score);
  $("#matchScore").textContent = data.score;
  $("#scoreLabel").textContent = data.scoreLabel;
  $("#predictedRole").textContent = data.predictedRole.title;
  $("#roleCategory").textContent = `${data.predictedRole.category} - ${data.extracted.skills.length} skills found`;
  $("#skillCoverage").textContent = data.match.skillCoverage === null ? "N/A" : `${data.match.skillCoverage}%`;
  $("#semanticFit").textContent = `${data.match.semanticSimilarity}%`;
  $("#experienceFit").textContent = `${data.match.experienceFit}%`;
  $("#macroFit").textContent = data.assessment.macroFit;
  $("#microFit").textContent = data.assessment.microFit;
  $("#gapAnalysis").textContent = data.assessment.gapAnalysis;

  renderChips($("#matchedSkills"), data.match.matchedSkills, "Add a job description to compare skills.");
  renderChips($("#missingSkills"), data.match.missingSkills, "No missing skills found from the given text.");

  $("#recommendations").innerHTML = data.recommendations
    .map((role) => `
      <div class="recommendation">
        <div>
          <strong>${escapeHtml(role.title)}</strong>
          <span>${escapeHtml(role.category)} - ${escapeHtml(role.salaryRange)}</span>
        </div>
        <b>${role.score}</b>
      </div>
    `)
    .join("");

  $("#resultsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectEntries(type) {
  return $$(`[data-entry="${type}"]`)
    .map((entry) => {
      const result = {};
      $$("[data-field]", entry).forEach((field) => {
        result[field.dataset.field] = field.dataset.field === "highlights"
          ? field.value
            .split("\n")
            .map((line) => line.replace(/^[-*]\s*/, "").trim())
            .filter(Boolean)
          : field.value.trim();
      });
      return result;
    })
    .filter((entry) => Object.values(entry).some((value) => Array.isArray(value) ? value.length : value));
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
    skills: String(form.get("skills") || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    experience: collectEntries("experience"),
    education: collectEntries("education"),
    projects: collectEntries("project"),
    certifications: collectEntries("certification"),
  };

  renderResume();
}

function renderListSection(selector, title, items, emptyText, renderItem) {
  $(selector).innerHTML = `<h3>${title}</h3>${
    items.length ? items.map(renderItem).join("") : `<p>${emptyText}</p>`
  }`;
}

function renderResume() {
  const { basics, summary, skills, experience, education, projects, certifications } = state.resume;

  $(".resume-preview header h2").textContent = basics.name || "Your Name";
  $(".preview-title").textContent = basics.title || "Professional Title";
  $(".preview-contact").textContent =
    [basics.email, basics.phone, basics.location, basics.url].filter(Boolean).join(" | ") ||
    "email@example.com | City | LinkedIn";

  $("[data-preview='summary'] p").textContent = summary || "Your summary will appear here.";
  $("[data-preview='skills'] p").textContent = skills.join(", ") || "Add skills separated by commas.";

  renderListSection("[data-preview='experience']", "Experience", experience, "Add your experience.", (item) => `
    <div class="preview-item">
      <div class="preview-item-head">
        <span>${escapeHtml([item.title, item.company].filter(Boolean).join(" - "))}</span>
        <span>${escapeHtml([item.startDate, item.endDate].filter(Boolean).join(" to "))}</span>
      </div>
      ${item.highlights?.length ? `<ul>${item.highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
    </div>
  `);

  renderListSection("[data-preview='education']", "Education", education, "Add your education.", (item) => `
    <div class="preview-item">
      <div class="preview-item-head">
        <span>${escapeHtml(item.degree || "")}</span>
        <span>${escapeHtml(item.date || "")}</span>
      </div>
      <p>${escapeHtml([item.institution, item.details].filter(Boolean).join(" | "))}</p>
    </div>
  `);

  renderListSection("[data-preview='projects']", "Projects", projects, "Add your projects.", (item) => `
    <div class="preview-item">
      <div class="preview-item-head">
        <span>${escapeHtml(item.name || "")}</span>
        <span>${escapeHtml(item.technologies || "")}</span>
      </div>
      <p>${escapeHtml(item.description || "")}</p>
    </div>
  `);

  renderListSection("[data-preview='certifications']", "Certifications", certifications, "Add your certifications.", (item) => `
    <div class="preview-item">
      <div class="preview-item-head">
        <span>${escapeHtml([item.name, item.issuer].filter(Boolean).join(" - "))}</span>
        <span>${escapeHtml(item.date || "")}</span>
      </div>
      ${item.credentialId ? `<p>${escapeHtml(item.credentialId)}</p>` : ""}
    </div>
  `);
}

function addEntry(type) {
  const targetId = type === "project" ? "projectEntries" : `${type}Entries`;
  const template = $(`#${type}Template`);
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector(".remove-button").addEventListener("click", () => {
    node.remove();
    updateResumeState();
  });
  node.addEventListener("input", updateResumeState);
  $(`#${targetId}`).append(node);
  updateResumeState();
}

function resumeAsText(resume = state.resume) {
  const { basics, summary, skills, experience, education, projects, certifications } = resume;
  const lines = [
    basics.name?.toUpperCase(),
    basics.title,
    [basics.email, basics.phone, basics.location, basics.url].filter(Boolean).join(" | "),
    "",
    "PROFESSIONAL SUMMARY",
    summary,
    "",
    "SKILLS",
    skills.join(", "),
    "",
    "EXPERIENCE",
    ...experience.flatMap((item) => [
      [item.title, item.company].filter(Boolean).join(" - "),
      [item.startDate, item.endDate].filter(Boolean).join(" to "),
      ...(item.highlights || []).map((line) => `- ${line}`),
      "",
    ]),
    "EDUCATION",
    ...education.flatMap((item) => [
      [item.degree, item.institution].filter(Boolean).join(" - "),
      [item.date, item.details].filter(Boolean).join(" | "),
      "",
    ]),
    "PROJECTS",
    ...projects.flatMap((item) => [
      [item.name, item.technologies].filter(Boolean).join(" - "),
      item.description,
      "",
    ]),
    "CERTIFICATIONS",
    ...certifications.flatMap((item) => [
      [item.name, item.issuer].filter(Boolean).join(" - "),
      [item.date, item.credentialId].filter(Boolean).join(" | "),
      "",
    ]),
  ];

  return lines.filter((line, index) => line || lines[index - 1]).join("\n").trim();
}

function resumeAsDocHtml(resume) {
  const { basics, summary, skills, experience, education, projects, certifications } = resume;
  const section = (title, content) => content ? `<h2>${title}</h2>${content}` : "";
  const contact = [basics.email, basics.phone, basics.location, basics.url].filter(Boolean).join(" | ");

  const experienceHtml = experience.map((item) => `
    <div class="item">
      <p><strong>${escapeHtml([item.title, item.company].filter(Boolean).join(" - "))}</strong>
      <span>${escapeHtml([item.startDate, item.endDate].filter(Boolean).join(" to "))}</span></p>
      ${item.highlights?.length ? `<ul>${item.highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  const educationHtml = education.map((item) => `
    <div class="item">
      <p><strong>${escapeHtml([item.degree, item.institution].filter(Boolean).join(" - "))}</strong>
      <span>${escapeHtml(item.date || "")}</span></p>
      ${item.details ? `<p>${escapeHtml(item.details)}</p>` : ""}
    </div>
  `).join("");

  const projectHtml = projects.map((item) => `
    <div class="item">
      <p><strong>${escapeHtml(item.name || "")}</strong>
      <span>${escapeHtml(item.technologies || "")}</span></p>
      <p>${escapeHtml(item.description || "")}</p>
    </div>
  `).join("");

  const certificationHtml = certifications.map((item) => `
    <div class="item">
      <p><strong>${escapeHtml([item.name, item.issuer].filter(Boolean).join(" - "))}</strong>
      <span>${escapeHtml(item.date || "")}</span></p>
      ${item.credentialId ? `<p>${escapeHtml(item.credentialId)}</p>` : ""}
    </div>
  `).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(basics.name || "Resume")}</title>
    <style>
      body { color: #111111; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; }
      h1 { margin: 0; font-size: 22pt; text-transform: uppercase; }
      h2 { margin: 18pt 0 6pt; border-bottom: 1px solid #999999; font-size: 10pt; text-transform: uppercase; }
      p { margin: 4pt 0; }
      ul { margin: 4pt 0 0 16pt; padding: 0; }
      .title { font-weight: bold; }
      .contact { color: #555555; font-size: 9pt; }
      .item { margin-bottom: 9pt; }
      .item p:first-child { display: flex; justify-content: space-between; gap: 12pt; }
      span { color: #444444; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(basics.name || "Resume")}</h1>
    ${basics.title ? `<p class="title">${escapeHtml(basics.title)}</p>` : ""}
    ${contact ? `<p class="contact">${escapeHtml(contact)}</p>` : ""}
    ${section("Professional Summary", summary ? `<p>${escapeHtml(summary)}</p>` : "")}
    ${section("Skills", skills.length ? `<p>${escapeHtml(skills.join(", "))}</p>` : "")}
    ${section("Experience", experienceHtml)}
    ${section("Education", educationHtml)}
    ${section("Projects", projectHtml)}
    ${section("Certifications", certificationHtml)}
  </body>
</html>`;
}

function pdfSafeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
}

function escapePdfText(value) {
  return pdfSafeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "");
}

function wrapPdfLine(line, maxLength = 92) {
  if (!line) return [""];

  const wrapped = [];
  let current = "";
  for (const word of pdfSafeText(line).split(/\s+/)) {
    if (!word) continue;
    if (word.length > maxLength) {
      if (current) wrapped.push(current);
      for (let index = 0; index < word.length; index += maxLength) {
        wrapped.push(word.slice(index, index + maxLength));
      }
      current = "";
    } else if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
    } else {
      wrapped.push(current);
      current = word;
    }
  }
  if (current) wrapped.push(current);
  return wrapped;
}

function buildPdfBlob(resume) {
  const encoder = new TextEncoder();
  const lines = resumeAsText(resume)
    .split("\n")
    .flatMap((line) => wrapPdfLine(line));
  const pages = [[]];
  const maxLinesPerPage = 48;

  lines.forEach((line) => {
    if (pages.at(-1).length >= maxLinesPerPage) pages.push([]);
    pages.at(-1).push(line);
  });

  const objects = [];
  const setObject = (number, body) => {
    objects[number - 1] = `${number} 0 obj\n${body}\nendobj\n`;
  };
  const addObject = (body) => {
    const number = objects.length + 1;
    setObject(number, body);
    return number;
  };

  setObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  setObject(2, "");
  setObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const pageRefs = pages.map((pageLines) => {
    const textCommands = pageLines.map((line) => line ? `(${escapePdfText(line)}) Tj` : "").join("\nT*\n");
    const stream = `BT\n/F1 10 Tf\n50 742 Td\n14 TL\n${textCommands}\nET`;
    const contentObject = addObject(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);
    return `${pageObject} 0 R`;
  });

  setObject(2, `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += object;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

async function getValidatedResume() {
  updateResumeState();
  if (!validateBuilder()) return null;

  const response = await fetch("/api/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.resume),
  });
  const schema = await response.json();

  if (!response.ok) {
    showToast(schema.error || "Resume details are invalid.");
    return null;
  }

  return schema;
}

$$(".mode-button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("#resumeText").addEventListener("input", (event) => {
  $("#resumeCount").textContent = event.target.value.length.toLocaleString();
});

$("#resumeFile").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["txt", "md", "json"].includes(extension)) {
    event.target.value = "";
    $("#analyzerError").textContent = "Please import a TXT, Markdown, or JSON file.";
    return;
  }
  if (file.size > 1_000_000) {
    event.target.value = "";
    $("#analyzerError").textContent = "File size must be below 1 MB.";
    return;
  }

  const content = await file.text();
  let text = content;
  if (file.name.endsWith(".json")) {
    try {
      text = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      showToast("JSON file could not be read.");
      return;
    }
  }

  $("#resumeText").value = text;
  $("#resumeText").dispatchEvent(new Event("input"));
  $("#analyzerError").textContent = "";
  showToast(`${file.name} imported`);
});

$("#loadDemo").addEventListener("click", () => {
  $("#targetRole").value = "Data Scientist";
  $("#resumeText").value = `ARJUN MEHTA
Data Analyst

SUMMARY
Data analyst with 3 years of experience turning operational data into useful insights.

EXPERIENCE
Data Analyst - Northstar Retail | 2023-Present
- Built Python and SQL forecasting workflows that improved inventory accuracy by 18%.
- Created Tableau dashboards used by 40+ business users.
- Automated weekly reporting with Pandas, saving 12 hours per month.

EDUCATION
Bachelor's in Computer Science

SKILLS
Python, SQL, Pandas, Statistics, Data Analysis, Tableau, Excel, Machine Learning, Communication`;
  $("#jobDescription").value = `We are hiring a Data Scientist with 3+ years of experience. Required skills include Python, SQL, Machine Learning, TensorFlow, Statistics, Data Analysis, Pandas, and data visualization. The candidate should hold a Bachelor's degree and communicate insights clearly.`;
  $("#resumeText").dispatchEvent(new Event("input"));
  showToast("Sample added");
});

$("#analyzerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#analyzeButton");
  const error = $("#analyzerError");
  error.textContent = "";

  const resumeText = $("#resumeText").value.trim();
  const jobDescription = $("#jobDescription").value.trim();

  if (!resumeText) {
    error.textContent = "Resume text is required.";
    $("#resumeText").focus();
    return;
  }
  if (resumeText.length < 80) {
    error.textContent = "Resume text is too short. Add at least 80 characters.";
    $("#resumeText").focus();
    return;
  }
  if (jobDescription && jobDescription.length < 40) {
    error.textContent = "Job description is too short for comparison.";
    $("#jobDescription").focus();
    return;
  }

  button.disabled = true;
  button.textContent = "Analyzing...";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText,
        jobDescription,
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
    button.textContent = "Analyze";
  }
});

$$("[data-add]").forEach((button) => {
  button.addEventListener("click", () => addEntry(button.dataset.add));
});

$("#builderForm").addEventListener("input", (event) => {
  updateResumeState();
  if (!event.target.classList.contains("invalid")) return;

  if (event.target.dataset.field) {
    validateRepeatField(event.target, repeatEntryHasContent(event.target.closest("[data-entry]")));
  } else {
    validateBasicField(event.target);
  }
});

$("#builderForm").addEventListener("focusout", (event) => {
  if (!event.target.matches("input, textarea")) return;

  if (event.target.dataset.field) {
    validateRepeatField(event.target, repeatEntryHasContent(event.target.closest("[data-entry]")));
  } else {
    validateBasicField(event.target);
  }
});

$("#copyResume").addEventListener("click", async () => {
  updateResumeState();
  if (!validateBuilder()) return;

  await navigator.clipboard.writeText(resumeAsText());
  showToast("Resume text copied");
});

$("#downloadJson").addEventListener("click", async () => {
  const schema = await getValidatedResume();
  if (!schema) return;

  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${fileBaseName(schema)}.json`);
  showToast("Resume JSON downloaded");
});

$("#downloadPdf").addEventListener("click", async () => {
  const schema = await getValidatedResume();
  if (!schema) return;

  downloadBlob(buildPdfBlob(schema), `${fileBaseName(schema)}.pdf`);
  showToast("Resume PDF downloaded");
});

$("#downloadDoc").addEventListener("click", async () => {
  const schema = await getValidatedResume();
  if (!schema) return;

  const blob = new Blob([resumeAsDocHtml(schema)], { type: "application/msword" });
  downloadBlob(blob, `${fileBaseName(schema)}.doc`);
  showToast("Resume DOC downloaded");
});

addEntry("experience");
addEntry("education");
addEntry("project");
addEntry("certification");
loadMeta();
