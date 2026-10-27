#!/usr/bin/env bash
# Build and deploy the public evaluation backend to Cloud Run.
#
# One instance at most: uploads, runs, and sessions live on that instance's
# disk, so a second instance would not see them. It scales to zero when idle.
# CPU stays allocated while the instance runs, because evaluations continue
# in a background thread after the request that started them returns.
set -euo pipefail

PROJECT="${PROJECT:-ontocheck-leaderboard}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-ontocheck-api}"
ORIGINS="${ORIGINS:-https://lamng3.com,https://lamng3.github.io}"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT"

# "^@^" makes @ the separator, since the origin list itself contains commas.
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --no-cpu-throttling \
  --cpu 1 \
  --memory 2Gi \
  --timeout 900 \
  --concurrency 20 \
  --set-env-vars "^@^ONTOCHECK_CORS_ORIGINS=${ORIGINS}@ONTOCHECK_MAX_JOBS=2" \
  --quiet

gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)'
