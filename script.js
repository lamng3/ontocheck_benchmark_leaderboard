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

const ontologyTable = document.querySelector("#ontology-table");
const sortSelect = document.querySelector("#sort-ontologies");
const filterContainer = document.querySelector("#ontology-filters");
const categoryChart = document.querySelector("#category-chart");
const domainGrid = document.querySelector("#domain-grid");

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

renderLeaderboard();
renderFilters();
renderCategoryChart();
renderDomains();
