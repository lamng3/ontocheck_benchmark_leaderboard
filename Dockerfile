# The public evaluation backend: FOOPS, OOPS, OQuaRE, and OntoCheck for Evaluate.
# Built and deployed with scripts/deploy_backend.sh (Cloud Run).
FROM python:3.13-slim

# git: requirements.txt installs OntoCheck and nl2sparql from GitHub.
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# OntoCheck reads WordNet and the stopword list; fetch them at build time
# instead of on every cold start.
ENV NLTK_DATA=/usr/share/nltk_data
RUN python -c "import nltk; [nltk.download(name, download_dir='/usr/share/nltk_data', quiet=True) for name in ('wordnet', 'stopwords')]"

COPY backend backend
COPY examples examples
COPY pipeline-options.json benchmark-frameworks.json ontocheck-results.json ./
COPY index.html script.js styles.css ./
COPY browser browser

# Uploads and results live on the instance's disk and go when it stops.
ENV ONTOCHECK_DATA=/tmp/ontocheck \
    ONTOCHECK_PUBLIC=1 \
    PYTHONUNBUFFERED=1

CMD exec uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8080}
