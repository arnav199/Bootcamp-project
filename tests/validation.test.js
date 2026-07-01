import test from "node:test";
import assert from "node:assert/strict";
import { validateResumePayload, validators } from "../src/validation.js";

test("accepts international phone, email, and web formats", () => {
  assert.equal(validators.isPhone("+91 98765 43210"), true);
  assert.equal(validators.isEmail("candidate@example.com"), true);
  assert.equal(validators.isWebAddress("linkedin.com/in/candidate"), true);
});

test("rejects invalid contact details with field-specific errors", () => {
  const result = validateResumePayload({
    basics: {
      name: "A",
      email: "not-an-email",
      phone: "123",
      url: "invalid",
    },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.email);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.url);
});

test("accepts a complete resume payload", () => {
  const result = validateResumePayload({
    basics: {
      name: "Avery Morgan",
      email: "avery@example.com",
      phone: "+91 98765 43210",
      url: "linkedin.com/in/avery",
    },
    summary: "Data analyst with three years of experience producing measurable operational insights.",
    experience: [{
      title: "Data Analyst",
      company: "Acme",
      startDate: "Jan 2023",
      endDate: "Present",
      highlights: ["Reduced reporting time by 35%."],
    }],
    education: [{
      degree: "B.Tech Computer Science",
      institution: "Example University",
    }],
    projects: [{
      name: "Forecasting Engine",
      description: "Built a demand forecasting pipeline.",
    }],
  });
  assert.deepEqual(result, { valid: true, errors: {} });
});

