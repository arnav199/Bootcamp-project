# AI Resume Analyzer – Job Role Prediction Dataset

Source: <https://www.kaggle.com/datasets/trendcart/resume-dataset>

- License: MIT
- Downloaded: 2026-07-01
- Archive SHA-256: `024EB0BB2039F138605BFB8E5CD124D283828A2FA2E48C8E1E9DAAE0AFF9BB80`

## Contents

- `training_data.csv`: 10,000 synthetic resume records
- `job_roles.csv`: 324 role profiles and their requirements
- `skills_database.json`: hierarchical skill taxonomy
- `skills_list.csv`: flat skill list
- `test_resumes.json`: small inference test set

## Validation summary

- Training columns: Resume ID, Resume Text, Education, Experience Years, Skills, Job Role, Category
- Distinct job roles: 324
- Distinct categories: 42
- Samples per role: 18–50
- Missing values in training data: 0

## Intended use

Use this dataset for resume parsing, skill extraction, role classification, and
candidate-to-role recommendation experiments. It is synthetic and suitable for
bootstrapping the application, but model performance must be validated against
representative, consented evaluation data before any real hiring use.

Do not use protected characteristics in ranking or recommendation features.
