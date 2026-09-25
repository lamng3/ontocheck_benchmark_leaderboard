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
loadCompetencyQuestions();
