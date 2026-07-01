# Career Architect AI

A local-first resume analyzer, job-description matcher, career recommender, and
ATS-compatible resume builder. The intelligence engine is trained at startup
from the bundled Kaggle resume-role dataset and does not call an external AI API.

## Features

- Predicts the strongest role and three career directions from resume text
- Scores resume-to-job fit from 0–100
- Extracts canonical skills, education level, and years of experience
- Reports matched skills, missing skills, semantic fit, and experience fit
- Builds a structured resume with a live ATS-safe preview
- Exports a strict JSON resume schema or plain ATS text
- Runs entirely on the local machine after startup

## Run

Requirements: Node.js 20 or newer. No package installation is required.

```powershell
npm.cmd start
```

Open <http://localhost:3000>.

Development mode:

```powershell
npm.cmd run dev
```

## Test and evaluate

```powershell
npm.cmd test
npm.cmd run evaluate
```

The evaluation script measures top-1 and top-3 recall against the dataset's
small held-out example set. It is a smoke test, not a production benchmark.

## Model

The engine loads 10,000 synthetic resumes covering 324 job-role labels. It
builds:

1. TF-IDF document-frequency weights from the training corpus.
2. A semantic centroid for each job role.
3. Per-role skill-frequency, education, and experience profiles.
4. A deterministic weighted ranker combining skill coverage (55%), semantic
   similarity (25%), title evidence (12%), and experience fit (8%).

Targeted job matching separately combines skill coverage (55%), semantic
similarity (25%), experience (12%), and education (8%). Every score is
explainable from these components.

## API

### `POST /api/analyze`

```json
{
  "resumeText": "Bachelor's in Computer Science...",
  "jobDescription": "We are hiring a software engineer...",
  "targetRole": "Software Engineer"
}
```

`jobDescription` and `targetRole` are optional. Without them, the endpoint
returns role recommendations based on the resume.

### `POST /api/resume`

Normalizes builder data into the resume JSON schema.

### `GET /api/meta`

Returns loaded model coverage and available role titles.

## Project structure

```text
data/raw/resume-role-dataset/  Training data and provenance
public/                        Browser interface
scripts/evaluate.js            Held-out sample evaluation
src/analyzer.js                Training, extraction, scoring, recommendations
src/data.js                    Dataset loader and CSV parser
src/server.js                  Zero-dependency HTTP and JSON API server
tests/                         Unit and integration tests
```

## Responsible-use boundary

This project is decision-support software, not an automated hiring authority.
The bundled data is synthetic. Do not add protected characteristics to scoring,
and do not use a score as the sole basis for an employment decision. Before
real-world use, validate performance and disparate impact on representative,
consented evaluation data.

Dataset source and license details are documented in
[`data/raw/resume-role-dataset/README.md`](data/raw/resume-role-dataset/README.md).
