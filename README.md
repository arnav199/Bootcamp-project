# Career Architect AI

Career Architect AI is a simple student project for resume analysis and resume
building. It runs on the local computer and does not call any paid AI API.

The project can:

- read resume text
- suggest suitable job roles
- compare a resume with a job description
- show matched and missing skills
- build a clean ATS friendly resume
- export resume data as PDF, DOC, or JSON

## Tech Stack

- HTML: creates the page structure.
- CSS: creates the black and white liquid glass design.
- JavaScript: handles button clicks, forms, API calls, and resume preview.
- Node.js: runs the local web server.
- Node HTTP module: creates the API without extra packages.
- CSV and JSON data: stores resume examples, job roles, and skills.
- Node test runner: checks that important functions still work.

## Why These Technologies Are Used

HTML, CSS, and JavaScript are used because they are the basic technologies for a
web application. They are easy to open in a browser and good for a first web
project.

Node.js is used because it lets JavaScript run on the server. This means the
frontend and backend can both use JavaScript.

The project does not use extra npm packages for the server. This keeps the code
simple and easier to explain.

## How To Run

Requirement: Node.js 20 or newer.

```powershell
npm.cmd start
```

Then open:

```text
http://localhost:3000
```

For development mode:

```powershell
npm.cmd run dev
```

## How To Test

```powershell
npm.cmd test
```

To run the small evaluation script:

```powershell
npm.cmd run evaluate
```

## Project Structure

```text
public/                        Frontend files
src/server.js                  Local server and API routes
src/analyzer.js                Resume analysis and scoring logic
src/data.js                    Loads CSV and JSON data
src/validation.js              Checks resume builder input
tests/                         Automated tests
scripts/evaluate.js            Simple evaluation script
data/raw/resume-role-dataset/  Dataset files
```

## Main API Routes

### POST /api/analyze

This route checks resume text and returns:

- predicted role
- score from 0 to 100
- matched skills
- missing skills
- suggested roles

Example body:

```json
{
  "resumeText": "Bachelor's in Computer Science. Skills: Python, SQL...",
  "jobDescription": "We need a data analyst with Python and SQL.",
  "targetRole": "Data Analyst"
}
```

### POST /api/resume

This route checks the resume builder data and returns a clean JSON resume
schema.

### GET /api/meta

This route returns basic model information like number of records, roles, and
available role titles.

## How The Analyzer Works

The analyzer loads the dataset when the server starts. It reads resume examples,
job roles, and skills. Then it makes simple role profiles from that data.

When a user enters resume text, the analyzer:

1. cleans the text
2. finds known skills
3. checks education and experience
4. compares the text with role profiles
5. calculates a score
6. returns the best roles and skill gaps

The scoring is explainable. It uses skill coverage, text similarity, job title
signals, education, and experience. The score should be used only as guidance.

## Responsible Use

This project is only a learning and decision-support tool. It should not be used
as the only reason to accept or reject a candidate.

The dataset is synthetic, so real-world use would need more testing.
