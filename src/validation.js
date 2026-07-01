function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function isPhone(value) {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isWebAddress(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return Boolean(url.hostname && (url.hostname.includes(".") || url.hostname === "localhost"));
  } catch {
    return false;
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateResumePayload(payload = {}) {
  const errors = {};
  const basics = payload.basics && typeof payload.basics === "object" ? payload.basics : {};
  const name = text(basics.name);
  const email = text(basics.email);
  const phone = text(basics.phone);
  const url = text(basics.url);
  const summary = text(payload.summary);

  if (!name) errors.name = "Full name is required.";
  else if (name.length < 2 || name.length > 80 || !/\p{L}/u.test(name)) {
    errors.name = "Enter a valid name between 2 and 80 characters.";
  }

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!isPhone(phone)) {
    errors.phone = "Use a valid phone number containing 7–15 digits.";
  }

  if (url && !isWebAddress(url)) {
    errors.url = "Enter a valid LinkedIn or portfolio address.";
  }

  if (summary && (summary.length < 40 || summary.length > 700)) {
    errors.summary = "Professional summary must contain 40–700 characters.";
  }

  const experience = Array.isArray(payload.experience) ? payload.experience : [];
  experience.forEach((entry, index) => {
    if (!text(entry.title)) errors[`experience.${index}.title`] = "Job title is required.";
    if (!text(entry.company)) errors[`experience.${index}.company`] = "Company is required.";
    if (!text(entry.startDate)) errors[`experience.${index}.startDate`] = "Start date is required.";
    if (!Array.isArray(entry.highlights) || !entry.highlights.some(text)) {
      errors[`experience.${index}.highlights`] = "Add at least one achievement.";
    }
  });

  const education = Array.isArray(payload.education) ? payload.education : [];
  education.forEach((entry, index) => {
    if (!text(entry.degree)) errors[`education.${index}.degree`] = "Degree is required.";
    if (!text(entry.institution)) {
      errors[`education.${index}.institution`] = "Institution is required.";
    }
  });

  const projects = Array.isArray(payload.projects) ? payload.projects : [];
  projects.forEach((entry, index) => {
    if (!text(entry.name)) errors[`project.${index}.name`] = "Project name is required.";
    if (!text(entry.description)) {
      errors[`project.${index}.description`] = "Project description is required.";
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export const validators = { isEmail, isPhone, isWebAddress };

