const ontologies = [
  {
    name: "MDS-Onto",
    fullName: "Materials Data Science Ontology",
    terms: 2187,
    coverage: 96.7,
    categories: [100, 100, 100, 100, 89, 87, 93],
  },
  {
    name: "PMDCo",
    fullName: "Platform MaterialDigital Core Ontology",
    terms: 1469,
    coverage: 95.3,
    categories: [100, 96, 97, 100, 89, 93, 87],
  },
  {
    name: "AM-Ontology",
    fullName: "Additive Manufacturing Ontology",
    terms: 695,
    coverage: 77.3,
    categories: [83, 96, 57, 96, 61, 80, 67],
  },
  {
    name: "EMMO",
    fullName: "Elementary Multiperspective Material Ontology",
    terms: 3859,
    coverage: 96.0,
    categories: [100, 100, 93, 96, 94, 87, 100],
  },
  {
    name: "CHAMEO",
    fullName: "Characterisation Methodology Ontology",
    terms: 255,
    coverage: 76.8,
    categories: [69, 84, 92, 79, 78, 67, 53],
  },
];

const categoryNames = [
  "Material identity",
  "Manufacturing",
  "Characterization",
  "Properties",
  "Provenance",
  "Simulation",
  "Degradation",
];

const domains = [
  {
    name: "EBSD",
    terms: 89,
    taskTerms: 36,
    matched: 35,
    recall: 97.22,
    precision: 39.33,
  },
  {
    name: "Capacitors",
    terms: 87,
    taskTerms: 38,
    matched: 38,
    recall: 100,
    precision: 43.68,
  },
  {
    name: "GeoOutage",
    terms: 10,
    taskTerms: 10,
    matched: 10,
    recall: 100,
    precision: 100,
  },
  {
    name: "Geospatial",
    terms: 100,
    taskTerms: 37,
    matched: 37,
    recall: 100,
    precision: 37,
  },
  {
    name: "Materials Processing",
    terms: 127,
    taskTerms: 14,
    matched: 14,
    recall: 100,
    precision: 11.02,
  },
  {
    name: "XRD",
    terms: 318,
    taskTerms: 33,
    matched: 33,
    recall: 100,
    precision: 10.38,
  },
];

const questionSources = [
  {
    domain: "General materials science",
    code: "General",
    file: "MaterialsScience_General.json",
    type: "json",
  },
  { domain: "Capacitors", code: "CAP", file: "Capacitors.json", type: "json" },
  { domain: "EBSD", code: "EBSD", file: "EBSD.json", type: "json" },
  { domain: "GeoOutage", code: "GEO", file: "GeoOutage.json", type: "json" },
  {
    domain: "Geospatial",
    code: "GSP",
    file: "Geospatial.json",
    type: "json",
  },
  { domain: "XRD", code: "XRD", file: "XRD.json", type: "json" },
  {
    domain: "Materials Processing",
    code: "MAT",
    file: "MatProc.md",
    type: "markdown",
  },
  {
    domain: "Cross-domain Case Study 1",
    code: "CS1",
    file: "CaseStudy1.json",
    type: "json",
  },
  {
    domain: "Cross-domain Case Study 2",
    code: "CS2",
    file: "CaseStudy2.json",
    type: "json",
  },
];

const questionBaseUrl =
  "https://raw.githubusercontent.com/cwru-sdle/OntoCheck/main/SupplementaryMaterials/SPARQL_Queries/";

const ontologyTable = document.querySelector("#ontology-table");
const sortSelect = document.querySelector("#sort-ontologies");
const filterContainer = document.querySelector("#ontology-filters");
const categoryChart = document.querySelector("#category-chart");
const domainGrid = document.querySelector("#domain-grid");
const questionSearch = document.querySelector("#question-search");
const questionDomain = document.querySelector("#question-domain");
const questionCount = document.querySelector("#question-count");
const questionList = document.querySelector("#question-list");
const loadMoreQuestions = document.querySelector("#load-more-questions");
const showLessQuestions = document.querySelector("#show-less-questions");

let competencyQuestions = [];
let visibleQuestions = [];
const questionPageSize = 10;
let questionLimit = questionPageSize;

function scoreClass(score) {
  if (score >= 95) return "top";
  if (score >= 80) return "mid";
  return "low";
}

function renderLeaderboard(sortBy = "coverage") {
  const sorted = [...ontologies].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return b[sortBy] - a[sortBy];
  });

  ontologyTable.innerHTML = sorted
    .map(
      (ontology, index) => `
        <tr>
          <td class="rank ${index === 0 ? "first" : ""}">
            ${String(index + 1).padStart(2, "0")}
          </td>
          <td class="ontology-name">
            ${ontology.name}
            <small>${ontology.fullName}</small>
          </td>
          <td class="metric-number">${ontology.terms.toLocaleString()}</td>
          <td>
            <span class="coverage-badge ${scoreClass(ontology.coverage)}">
              ${ontology.coverage.toFixed(1)}%
            </span>
          </td>
          <td>
            <div class="score-track" aria-label="${ontology.coverage}% coverage">
              <span style="width: ${ontology.coverage}%"></span>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderFilters() {
  filterContainer.innerHTML = ontologies
    .map(
      (ontology, index) => `
        <button
          type="button"
          data-index="${index}"
          class="${index === 0 ? "active" : ""}"
          aria-pressed="${index === 0}"
        >
          ${ontology.name}
        </button>
      `,
    )
    .join("");
}

function renderCategoryChart(ontologyIndex = 0) {
  const ontology = ontologies[ontologyIndex];
  categoryChart.setAttribute(
    "aria-label",
    `${ontology.name} competency coverage by category`,
  );
  categoryChart.innerHTML = ontology.categories
    .map(
      (score, index) => `
        <div class="category-item">
          <span class="category-score">${score}%</span>
          <div
            class="category-bar"
            style="height: ${Math.max(score * 1.45, 8)}px"
            title="${categoryNames[index]}: ${score}%"
          ></div>
          <span class="category-label">${categoryNames[index]}</span>
        </div>
      `,
    )
    .join("");
}

function renderDomains() {
  domainGrid.innerHTML = domains
    .map(
      (domain) => `
        <article class="domain-card">
          <header>
            <h3>${domain.name}</h3>
            <span class="term-count">${domain.terms} ontology terms</span>
          </header>
          <div class="domain-metrics">
            <div>
              <strong>${domain.recall.toFixed(domain.recall % 1 ? 2 : 0)}%</strong>
              <span>Recall</span>
            </div>
            <div>
              <strong>${domain.precision.toFixed(domain.precision % 1 ? 2 : 0)}%</strong>
              <span>Precision</span>
            </div>
          </div>
          <p class="match-line">
            ${domain.matched} of ${domain.taskTerms} unique task terms matched
          </p>
        </article>
      `,
    )
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );
}

function parseMarkdownQuestions(markdown, source) {
  const pattern =
    /\*\*CQ(\d+)\.\s+(.+?)\*\*\s*```sparql\s*([\s\S]*?)```/g;

  return [...markdown.matchAll(pattern)].map((match) => ({
    domain: source.domain,
    code: source.code,
    number: Number(match[1]),
    question: match[2].trim(),
    query: match[3].trim(),
  }));
}

async function fetchQuestionSource(source) {
  const response = await fetch(`${questionBaseUrl}${source.file}`);
  if (!response.ok) {
    throw new Error(`Could not load ${source.file} (${response.status})`);
  }

  if (source.type === "markdown") {
    return parseMarkdownQuestions(await response.text(), source);
  }

  const rows = await response.json();
  return rows.map((row, index) => ({
    domain: source.domain,
    code: source.code,
    number: index + 1,
    question: row.question,
    query: row.sparql_query || "",
  }));
}

function populateQuestionDomains() {
  questionDomain.insertAdjacentHTML(
    "beforeend",
    questionSources
      .map(
        (source) =>
          `<option value="${escapeHtml(source.domain)}">${escapeHtml(source.domain)}</option>`,
      )
      .join(""),
  );
}

function filterQuestions() {
  const searchTerm = questionSearch.value.trim().toLowerCase();
  const selectedDomain = questionDomain.value;

  visibleQuestions = competencyQuestions.filter((item) => {
    const matchesDomain =
      selectedDomain === "all" || item.domain === selectedDomain;
    const matchesSearch =
      !searchTerm ||
      item.question.toLowerCase().includes(searchTerm) ||
      item.query.toLowerCase().includes(searchTerm);
    return matchesDomain && matchesSearch;
  });
}

function renderQuestions() {
  filterQuestions();
  const displayed = visibleQuestions.slice(0, questionLimit);

  questionCount.textContent = `${visibleQuestions.length} question${
    visibleQuestions.length === 1 ? "" : "s"
  } found`;

  if (!displayed.length) {
    questionList.innerHTML =
      '<p class="empty-state">No competency questions match those filters.</p>';
    loadMoreQuestions.hidden = true;
    showLessQuestions.hidden = true;
    return;
  }

  questionList.innerHTML = displayed
    .map(
      (item, index) => `
        <details class="question-item">
          <summary>
            <span class="question-tag">
              ${escapeHtml(item.code)} · CQ${String(item.number).padStart(2, "0")}
            </span>
            <span class="question-text">${escapeHtml(item.question)}</span>
          </summary>
          <div class="query-panel">
            <header>
              <span>SPARQL query</span>
              <button class="copy-query" type="button" data-index="${index}">
                Copy
              </button>
            </header>
            <pre><code>${escapeHtml(item.query)}</code></pre>
          </div>
        </details>
      `,
    )
    .join("");

  loadMoreQuestions.hidden = displayed.length >= visibleQuestions.length;
  showLessQuestions.hidden = questionLimit <= questionPageSize;
  loadMoreQuestions.textContent = `Show more (${visibleQuestions.length - displayed.length} remaining)`;
}

async function loadCompetencyQuestions() {
  populateQuestionDomains();

  try {
    const questionSets = await Promise.all(
      questionSources.map(fetchQuestionSource),
    );
    competencyQuestions = questionSets.flat();
    renderQuestions();
  } catch (error) {
    questionCount.textContent = "Question sets unavailable";
    questionList.innerHTML = `
      <p class="empty-state">
        The competency questions could not be loaded. Please try again later.
      </p>
    `;
    console.error(error);
  }
}

sortSelect.addEventListener("change", (event) => {
  renderLeaderboard(event.target.value);
});

filterContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  filterContainer.querySelectorAll("button").forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderCategoryChart(Number(button.dataset.index));
});

questionSearch.addEventListener("input", () => {
  questionLimit = questionPageSize;
  renderQuestions();
});

questionDomain.addEventListener("change", () => {
  questionLimit = questionPageSize;
  renderQuestions();
});

loadMoreQuestions.addEventListener("click", () => {
  questionLimit += questionPageSize;
  renderQuestions();
});

showLessQuestions.addEventListener("click", () => {
  questionLimit = questionPageSize;
  renderQuestions();
  document
    .querySelector(".question-explorer")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});

questionList.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-query");
  if (!button) return;

  const item = visibleQuestions[Number(button.dataset.index)];
  try {
    await navigator.clipboard.writeText(item.query);
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1400);
  } catch {
    button.textContent = "Select query to copy";
  }
});

renderLeaderboard();
renderFilters();
renderCategoryChart();
renderDomains();
const competencyQuestionsReady = loadCompetencyQuestions();

const tabs = ["benchmark", "evaluate", "questions"];
const evalForm = document.querySelector("#eval-form");
const ontologyFile = document.querySelector("#ontology-file");
const evalOntology = document.querySelector("#eval-ontology");
const questionOntology = document.querySelector("#question-ontology");
const evalQuestionSet = document.querySelector("#eval-question-set");
const domainPrefixes = document.querySelector("#domain-prefixes");
const evalStatus = document.querySelector("#eval-status");
const evalResults = document.querySelector("#eval-results");
const runList = document.querySelector("#run-list");
const runCount = document.querySelector("#run-count");
const startButton = document.querySelector("#start-evaluation");
const nlQuestion = document.querySelector("#nl-question");
const sparqlQuestion = document.querySelector("#sparql-question");
const questionStatus = document.querySelector("#question-status");
const queryResult = document.querySelector("#query-result");
const memoryList = document.querySelector("#memory-list");
const memoryCount = document.querySelector("#memory-count");
const memorySearch = document.querySelector("#memory-search");

let storedOntologies = [];
let storedQuestions = [];

function showTab(name) {
  const tab = tabs.includes(name) ? name : "benchmark";
  tabs.forEach((item) => {
    const panel = document.querySelector(`#panel-${item}`);
    const button = document.querySelector(`#tab-${item}`);
    const active = item === tab;
    panel.hidden = !active;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  try {
    if (location.hash !== `#${tab}`) {
      history.replaceState(null, "", `#${tab}`);
    }
  } catch {
    // Some local file views refuse history updates. The tab still changes.
  }
}

function explainApiFailure(response, data) {
  let detail = data && (data.detail || data.message);
  if (Array.isArray(detail)) {
    detail = detail
      .map((item) => (item && item.msg) || JSON.stringify(item))
      .join("; ");
  }
  if (typeof detail === "string" && detail.trim()) return detail;
  if (!response || response.status === 404) {
    return "This page is not being served by the evaluation backend. GitHub Pages cannot run evaluations. Start the backend, then open http://127.0.0.1:8000.";
  }
  return `The evaluation service returned HTTP ${response.status}.`;
}

async function api(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error(
      "The evaluation backend is not running. Start it, then open http://127.0.0.1:8000.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(explainApiFailure(response, data));
  }
  return data;
}

function fillOntologySelects(preferredId) {
  const markup = storedOntologies.length
    ? storedOntologies
        .map(
          (ontology) =>
            `<option value="${escapeHtml(ontology.id)}">${escapeHtml(ontology.name)}</option>`,
        )
        .join("")
    : `<option value="">Upload an ontology first</option>`;
  [evalOntology, questionOntology].forEach((select) => {
    const current = preferredId || select.value;
    select.innerHTML = markup;
    if (storedOntologies.some((ontology) => ontology.id === current)) {
      select.value = current;
    }
  });
}

function populateEvalQuestionSets() {
  evalQuestionSet.insertAdjacentHTML(
    "beforeend",
    questionSources
      .map(
        (source) =>
          `<option value="${escapeHtml(source.domain)}">${escapeHtml(source.domain)}</option>`,
      )
      .join(""),
  );
}

async function refreshOntologies(preferredId) {
  try {
    const data = await api("/api/ontologies");
    storedOntologies = data.ontologies;
    fillOntologySelects(preferredId);
    if (!storedOntologies.length) {
      evalStatus.textContent = "Upload an ontology to begin.";
    }
  } catch {
    evalStatus.textContent =
      "The evaluation backend is not running. Start it, then open http://127.0.0.1:8000. The GitHub Pages site cannot run evaluations.";
  }
}

async function refreshMemory() {
  try {
    const data = await api("/api/questions");
    storedQuestions = data.questions;
    renderMemory();
  } catch {
    memoryCount.textContent = "Question memory is unavailable until the service is running.";
  }
}

async function uploadOntology(file) {
  const body = new FormData();
  body.append("file", file);
  body.append("name", file.name);
  evalStatus.textContent = `Uploading ${file.name}…`;
  const saved = await api("/api/ontologies", { method: "POST", body });
  await refreshOntologies(saved.id);
  evalStatus.textContent = `${saved.name} is ready.`;
  return saved;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatPlain(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return escapeHtml(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function scoreWidth(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  if (number <= 1) return Math.max(number * 100, 0);
  if (number <= 5) return (number / 5) * 100;
  return Math.min(number, 100);
}

function remoteNote(remote, label) {
  if (!remote) return "";
  if (remote.ok) {
    const overall = remote.summary && remote.summary.overall;
    const extra =
      overall === null || overall === undefined ? "" : ` Overall score ${overall}.`;
    return `<p class="remote-note">Public ${escapeHtml(label)} service responded.${escapeHtml(extra)}</p>`;
  }
  return `<p class="remote-note">${escapeHtml(remote.detail || `Public ${label} service did not respond.`)} Local OntoCheck tests are shown below.</p>`;
}

function renderOntocheckPanel(panel) {
  const metrics = (panel.metrics || [])
    .map(
      (metric) => `
        <div class="metric-row">
          <span>${escapeHtml(metric.name)}</span>
          <div class="score-track" aria-hidden="true"><span style="width: ${scoreWidth(metric.score)}%"></span></div>
          <strong>${formatPlain(metric.score)}</strong>
        </div>
      `,
    )
    .join("");
  const missing = (panel.missing || [])
    .slice(0, 12)
    .map((term) => `<span>${escapeHtml(term)}</span>`)
    .join("");
  return `
    <article class="result-panel wide">
      <header>
        <div>
          <p class="kicker">OntoCheck</p>
          <h3>Query coverage</h3>
        </div>
      </header>
      <div class="domain-metrics">
        <div>
          <strong>${formatPercent(panel.recall)}</strong>
          <span>Recall</span>
        </div>
        <div>
          <strong>${formatPercent(panel.precision)}</strong>
          <span>Precision</span>
        </div>
      </div>
      <p class="match-line">
        ${panel.intersection ?? "—"} of ${panel.task_terms ?? "—"} task terms found
        among ${panel.ontology_terms ?? "—"} ontology terms
        ${panel.query_count ? `· ${panel.query_count} queries` : ""}
      </p>
      ${missing ? `<div class="term-chips">${missing}</div>` : ""}
      ${metrics ? `<div class="metric-list">${metrics}</div>` : ""}
    </article>
  `;
}

function renderFoopsPanel(panel) {
  const principles = (panel.principles || [])
    .map(
      (item) => `
        <div class="metric-row">
          <span>${escapeHtml(item.id)}</span>
          <div class="score-track" aria-hidden="true"><span style="width: ${item.score ?? 0}%"></span></div>
          <strong>${item.score === null || item.score === undefined ? "—" : `${item.score}%`}</strong>
        </div>
      `,
    )
    .join("");
  return `
    <article class="result-panel">
      <header>
        <div>
          <p class="kicker">FOOPS</p>
          <h3>FAIR tests</h3>
        </div>
        <span class="coverage-badge ${scoreClass(panel.overall || 0)}">${panel.overall === null || panel.overall === undefined ? "—" : `${panel.overall}%`}</span>
      </header>
      ${remoteNote(panel.remote, "FOOPS")}
      <p class="match-line">${panel.passed || 0} passed · ${panel.failed || 0} failed · ${panel.skipped || 0} skipped offline</p>
      <div class="metric-list">${principles || '<p class="empty-state">No local FOOPS tests ran.</p>'}</div>
    </article>
  `;
}

function renderOopsPanel(panel) {
  const summary = panel.summary || {};
  const pitfalls = (panel.pitfalls || [])
    .slice(0, 12)
    .map(
      (item) => `
        <li>
          <span class="question-tag">${escapeHtml(item.source_id || item.severity || "pitfall")}</span>
          <span>${escapeHtml(item.message || item.name || "Pitfall detected")}</span>
        </li>
      `,
    )
    .join("");
  return `
    <article class="result-panel">
      <header>
        <div>
          <p class="kicker">OOPS</p>
          <h3>Pitfalls</h3>
        </div>
      </header>
      ${remoteNote(panel.remote, "OOPS")}
      <div class="severity-row">
        <span><i class="legend-dot low"></i> ${summary.critical || 0} critical</span>
        <span><i class="legend-dot mid"></i> ${summary.important || 0} important</span>
        <span><i class="legend-dot top"></i> ${summary.minor || 0} minor</span>
      </div>
      ${pitfalls ? `<ul class="pitfall-list">${pitfalls}</ul>` : '<p class="match-line">No failing local pitfalls.</p>'}
    </article>
  `;
}

function renderOquarePanel(panel) {
  const characteristics = panel.characteristics || [];
  const bars = characteristics
    .map(
      (item) => `
        <div class="category-item">
          <span class="category-score">${Number(item.score).toFixed(1)}</span>
          <div class="category-bar" style="height: ${Math.max(item.score * 28, 8)}px" title="${escapeHtml(item.name)}: ${item.score} / 5"></div>
          <span class="category-label">${escapeHtml(item.name)}</span>
        </div>
      `,
    )
    .join("");
  return `
    <article class="result-panel wide">
      <header>
        <div>
          <p class="kicker">OQuaRE</p>
          <h3>Characteristic scores</h3>
        </div>
      </header>
      <p class="match-line">Scores use OntoCheck's 1–5 static scale. 5 exceeds the published threshold.</p>
      <div class="category-chart oquare-chart">${bars || '<p class="empty-state">No OQuaRE scores were produced.</p>'}</div>
    </article>
  `;
}

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderSavedRuns(evaluations) {
  runCount.textContent = `${evaluations.length} saved evaluation${
    evaluations.length === 1 ? "" : "s"
  }`;
  if (!evaluations.length) {
    runList.innerHTML =
      '<p class="empty-state">Finished evaluations stay in the local database and appear here.</p>';
    return;
  }
  runList.innerHTML = evaluations
    .map((run) => {
      const summary = run.summary || {};
      const bits = [];
      if (summary.recall !== null && summary.recall !== undefined) {
        bits.push(`${formatPercent(summary.recall)} recall`);
      }
      if (summary.foops !== null && summary.foops !== undefined) {
        bits.push(`FOOPS ${summary.foops}%`);
      }
      if (summary.oquare !== null && summary.oquare !== undefined) {
        bits.push(`OQuaRE ${summary.oquare}`);
      }
      if (summary.oops_critical || summary.oops_important) {
        bits.push(
          `${summary.oops_critical || 0} critical, ${summary.oops_important || 0} important pitfalls`,
        );
      }
      return `
        <button class="saved-run" type="button" data-run-id="${escapeHtml(run.id)}">
          <span class="saved-run-name">${escapeHtml(run.ontology_name || "Ontology")}</span>
          <span class="saved-run-meta">${escapeHtml((run.checks || []).join(" · "))}</span>
          <span class="saved-run-score">${escapeHtml(bits.join(" · ") || run.status)}</span>
          <time datetime="${escapeHtml(run.created_at)}">${escapeHtml(formatWhen(run.created_at))}</time>
        </button>
      `;
    })
    .join("");
}

async function refreshRuns() {
  try {
    const data = await api("/api/evaluations");
    renderSavedRuns(data.evaluations || []);
  } catch {
    runCount.textContent = "Saved evaluations appear after the backend is running.";
  }
}

async function openSavedRun(id) {
  const data = await api(`/api/evaluations/${id}`);
  if (data.status !== "complete" || !data.result) {
    evalStatus.textContent = data.error || "That evaluation has no saved result yet.";
    return;
  }
  renderEvaluation(data.result);
  evalStatus.textContent = "Opened a saved evaluation.";
  evalResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderEvaluation(result) {
  const panels = [
    result.ontocheck ? renderOntocheckPanel(result.ontocheck) : "",
    result.foops ? renderFoopsPanel(result.foops) : "",
    result.oops ? renderOopsPanel(result.oops) : "",
    result.oquare ? renderOquarePanel(result.oquare) : "",
  ].join("");
  const name = result.ontology ? result.ontology.name : "Ontology";
  evalResults.innerHTML = `
    <div class="section-heading result-heading">
      <div>
        <p class="kicker">Results</p>
        <h3>${escapeHtml(name)}</h3>
      </div>
    </div>
    <div class="result-grid">${panels}</div>
  `;
}

async function pollEvaluation(id) {
  const data = await api(`/api/evaluations/${id}`);
  if (data.status === "complete") {
    evalStatus.textContent = "Evaluation complete. It is saved for this browser.";
    startButton.disabled = false;
    renderEvaluation(data.result || {});
    refreshRuns();
    return;
  }
  if (data.status === "failed") {
    evalStatus.textContent = data.error || "Evaluation failed.";
    startButton.disabled = false;
    refreshRuns();
    return;
  }
  evalStatus.textContent = "Evaluation is running…";
  window.setTimeout(() => {
    pollEvaluation(id).catch((error) => {
      evalStatus.textContent = error.message;
      startButton.disabled = false;
    });
  }, 1200);
}

function renderQueryReport(report) {
  const aggregate = report.aggregate || {};
  const rows = (report.queries || [])
    .map(
      (query) => `
        <article class="query-score">
          <p>${escapeHtml(query.nl_text || "SPARQL query")}</p>
          <div>
            <span class="coverage-badge ${scoreClass((query.recall || 0) * 100)}">${formatPercent(query.recall)} recall</span>
            <span class="coverage-badge ${scoreClass((query.precision || 0) * 100)}">${formatPercent(query.precision)} precision</span>
            <span class="term-count">${query.bindings && query.bindings.ok ? `${query.bindings.count} bindings` : "query did not execute"}</span>
          </div>
          ${query.error ? `<p class="remote-note">${escapeHtml(query.error)}</p>` : ""}
        </article>
      `,
    )
    .join("");
  queryResult.innerHTML = `
    <article class="result-panel wide">
      <header>
        <div>
          <p class="kicker">Query aggregate</p>
          <h3>${formatPercent(aggregate.recall)} recall · ${formatPercent(aggregate.precision)} precision</h3>
        </div>
      </header>
      <p class="match-line">
        Combined over ${aggregate.query_count || (report.queries || []).length} queries.
        ${aggregate.intersection ?? "—"} shared terms.
      </p>
      <div class="query-score-list">${rows}</div>
    </article>
  `;
}

function renderMemory() {
  const term = memorySearch.value.trim().toLowerCase();
  const visible = storedQuestions.filter(
    (question) =>
      !term ||
      question.nl_text.toLowerCase().includes(term) ||
      question.sparql.toLowerCase().includes(term),
  );
  memoryCount.textContent = `${visible.length} saved question${visible.length === 1 ? "" : "s"}`;
  if (!visible.length) {
    memoryList.innerHTML =
      '<p class="empty-state">No saved questions match that search.</p>';
    return;
  }
  memoryList.innerHTML = visible
    .map(
      (question) => `
        <details class="question-item">
          <summary>
            <span class="question-tag">${formatPercent(question.recall)}</span>
            <span class="question-text">${escapeHtml(question.nl_text)}</span>
          </summary>
          <div class="query-panel">
            <header><span>SPARQL query</span></header>
            <pre><code>${escapeHtml(question.sparql)}</code></pre>
          </div>
        </details>
      `,
    )
    .join("");
}

document.querySelectorAll("[data-tab], [data-tab-target]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const tab = control.dataset.tab || control.dataset.tabTarget;
    if (!tab) return;
    event.preventDefault();
    showTab(tab);
  });
});

ontologyFile.addEventListener("change", async () => {
  const file = ontologyFile.files && ontologyFile.files[0];
  if (!file) return;
  try {
    await uploadOntology(file);
  } catch (error) {
    evalStatus.textContent = error.message;
  }
});

evalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const checks = [...evalForm.querySelectorAll("input[name='check']:checked")].map(
    (input) => input.value,
  );
  if (!checks.length) {
    evalStatus.textContent = "Select at least one of FOOPS, OOPS, or OQuaRE.";
    return;
  }
  if (!evalOntology.value) {
    evalStatus.textContent = "Upload an ontology before starting an evaluation.";
    return;
  }
  startButton.disabled = true;
  evalStatus.textContent = "Starting evaluation…";
  evalResults.innerHTML = "";
  try {
    await competencyQuestionsReady;
    const selectedSet = evalQuestionSet.value;
    const questions =
      selectedSet === "none"
        ? []
        : competencyQuestions
            .filter((item) => item.domain === selectedSet)
            .map((item) => ({
              question: item.question,
              sparql_query: item.query,
            }));
    if (selectedSet !== "none" && !questions.length) {
      evalStatus.textContent =
        "That question set is not loaded yet. The run will continue without it.";
    }
    const run = await api("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ontology_id: evalOntology.value,
        checks,
        questions,
        domain_prefixes: domainPrefixes.value.trim(),
      }),
    });
    await pollEvaluation(run.id);
  } catch (error) {
    evalStatus.textContent = error.message;
    startButton.disabled = false;
  }
});

document.querySelector("#translate-question").addEventListener("click", async () => {
  if (!questionOntology.value) {
    questionStatus.textContent = "Upload an ontology on the Evaluate tab first.";
    return;
  }
  if (!nlQuestion.value.trim()) {
    questionStatus.textContent = "Enter a natural-language question.";
    return;
  }
  questionStatus.textContent = "Translating…";
  try {
    const data = await api("/api/questions/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ontology_id: questionOntology.value,
        nl_text: nlQuestion.value,
      }),
    });
    sparqlQuestion.value = data.sparql;
    const translator = data.provider ? `${data.provider} / ${data.model}` : data.model;
    questionStatus.textContent = `Translated with ${translator}. Evaluate to save it.`;
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

async function runQuestion(path) {
  if (!questionOntology.value) {
    questionStatus.textContent = "Choose an uploaded ontology.";
    return;
  }
  questionStatus.textContent = "Scoring queries…";
  const report = await api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ontology_id: questionOntology.value,
      nl_text: nlQuestion.value,
      sparql: sparqlQuestion.value,
    }),
  });
  renderQueryReport(report);
  await refreshMemory();
  questionStatus.textContent = "Saved to question memory.";
}

document.querySelector("#evaluate-question").addEventListener("click", () => {
  runQuestion("/api/questions/evaluate").catch((error) => {
    questionStatus.textContent = error.message;
  });
});

document.querySelector("#context-evaluate").addEventListener("click", () => {
  runQuestion("/api/questions/context-evaluate").catch((error) => {
    questionStatus.textContent = error.message;
  });
});

memorySearch.addEventListener("input", renderMemory);

runList.addEventListener("click", (event) => {
  const button = event.target.closest(".saved-run");
  if (!button) return;
  openSavedRun(button.dataset.runId).catch((error) => {
    evalStatus.textContent = error.message;
  });
});

populateEvalQuestionSets();
const initialTab = location.hash.replace("#", "");
showTab(tabs.includes(initialTab) ? initialTab : "benchmark");
refreshOntologies();
refreshRuns();
refreshMemory();
