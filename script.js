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

const FAIR_PRINCIPLES = {
  A1: {
    title: "Retrievable by identifier",
    about:
      "(Meta)data are retrievable by their identifier using a standardised communications protocol.",
    tests:
      "CN1 checks content negotiation: the ontology URI is requested as RDF and as HTML.",
  },
  "A1.1": {
    title: "Open protocol",
    about:
      "The protocol used to retrieve the ontology is open, free, and universally implementable.",
    tests: "HTTP1 passes when the ontology identifier uses HTTP or HTTPS.",
  },
  A2: {
    title: "Metadata remain available",
    about:
      "Metadata stay accessible even when the ontology itself is no longer available.",
    tests:
      "FIND_3_BIS passes when that metadata is recorded in a public registry. It needs network access.",
  },
  F1: {
    title: "Globally unique, persistent identifier",
    about:
      "(Meta)data are assigned a globally unique and persistent identifier.",
    tests:
      "PURL1 checks a persistent URL. URI1 checks that the URI resolves. URI2 checks that the ontology identifiers agree. VER1 checks that a version IRI is declared, and VER2 checks that it resolves.",
  },
  F2: {
    title: "Rich metadata",
    about: "The ontology is described with rich metadata.",
    tests:
      "OM1 passes when the minimum metadata is present, including a title and a description.",
  },
  F3: {
    title: "Metadata point at the identifier",
    about:
      "Metadata clearly include the identifier of the ontology they describe.",
    tests: "FIND1 passes when the ontology declares a prefix for its own namespace.",
  },
  F4: {
    title: "Registered in a searchable resource",
    about: "(Meta)data are registered or indexed in a searchable resource.",
    tests:
      "FIND2 checks that the prefix is registered. FIND3 checks that the ontology is listed in a community registry. Both need network access.",
  },
  I1: {
    title: "Formal shared language",
    about:
      "(Meta)data use a formal, accessible, shared language for knowledge representation.",
    tests: "RDF1 passes when the ontology is available as RDF.",
  },
  I2: {
    title: "FAIR vocabularies",
    about: "(Meta)data use vocabularies that follow FAIR principles.",
    tests:
      "VOC1 checks reuse of a metadata vocabulary. VOC2 checks reuse of terms from another vocabulary.",
  },
  R1: {
    title: "Rich, relevant description",
    about:
      "(Meta)data are richly described with accurate and relevant attributes.",
    tests:
      "DOC1 checks HTML documentation. OM2 and OM3 check recommended and detailed metadata. VOC3 checks that every term has a label, and VOC4 checks that every term has a definition.",
  },
  "R1.1": {
    title: "Clear license",
    about: "(Meta)data are released with a clear and accessible usage license.",
    tests:
      "OM4.1 checks that a license is declared. OM4.2 checks that the license URI resolves, which needs network access.",
  },
  "R1.2": {
    title: "Detailed provenance",
    about: "(Meta)data are associated with detailed provenance.",
    tests:
      "OM5.1 checks basic provenance, such as a creator. OM5.2 checks detailed provenance.",
  },
};

const CORE_METRICS = {
  altLabelCheck: {
    about: "Share of named classes that have at least one skos:altLabel.",
    calc: "Score = classes with an alternative label / named classes.",
  },
  isolatedElements: {
    about: "Share of named classes that have no link to another class.",
    calc: "Score = isolated classes / named classes.",
  },
  classConnections: {
    about:
      "Connected subgraphs among named classes linked by subClassOf, equivalentClass, or disjointWith.",
    calc: "Score = the number of those connected subgraphs.",
  },
  definitionCheck: {
    about: "Share of named classes that have at least one skos:definition.",
    calc: "Score = classes with a definition / named classes.",
  },
  duplicateLabels: {
    about: "Classes that share the same rdfs:label.",
    calc: "Score = the number of labels used by more than one class.",
  },
  missingDomainRange: {
    about:
      "Object and datatype properties that omit rdfs:domain or rdfs:range.",
    calc: "The score counts properties missing a domain and properties missing a range.",
  },
  leafNodeCheck: {
    about:
      "Leaf classes: declared classes that are never used as a superclass.",
    calc: "This check lists those classes and does not return a coverage score, so the bar stays empty.",
  },
  semanticConnection: {
    about:
      "Root classes that are grounded in a higher-level ontology such as CCO or BFO.",
    calc: "Score = grounded root classes / root classes.",
  },
  classCapitalCheck: {
    about: "Named classes whose local name starts with a capital letter.",
    calc: "Score = complying classes / named classes.",
  },
  classSpaceCheck: {
    about: "Class names that contain a space, which makes Turtle unparseable.",
    calc: "This check lists those names and does not return a coverage score, so the bar stays empty.",
  },
  checkLabel: {
    about: "Share of named classes that have at least one rdfs:label.",
    calc: "Score = labelled classes / named classes.",
  },
};

// ---------- shared helpers ----------

const $ = (selector) => document.querySelector(selector);

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

function isMissing(value) {
  return value === null || value === undefined || value === "" || Number.isNaN(Number(value));
}

// Values stored as fractions (0–1), shown as percentages.
function formatPercent(value) {
  if (isMissing(value)) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

// Published values are already percentages; keep their decimals.
function formatPublished(value) {
  return `${value.toFixed(value % 1 ? 2 : 0)}%`;
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

function bar(percent) {
  return `<span class="bar" aria-hidden="true"><span style="width: ${Math.max(0, Math.min(percent, 100))}%"></span></span>`;
}

function heatClass(score) {
  if (score >= 100) return "h5";
  if (score >= 90) return "h4";
  if (score >= 80) return "h3";
  if (score >= 70) return "h2";
  if (score >= 60) return "h1";
  return "h0";
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

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const SPARQL_TOKEN =
  /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(<[^>\s]*>)|([?$]\w+)|\b(SELECT|DISTINCT|REDUCED|WHERE|PREFIX|BASE|FILTER|OPTIONAL|UNION|MINUS|GRAPH|SERVICE|ORDER|GROUP|BY|HAVING|LIMIT|OFFSET|ASK|CONSTRUCT|DESCRIBE|BIND|VALUES|AS|ASC|DESC|NOT|EXISTS|IN|COUNT|SAMPLE|GROUP_CONCAT|REGEX|LANG|LANGMATCHES|STR|STRSTARTS|CONTAINS|LCASE|UCASE|BOUND|IF|COALESCE|ISIRI|ISURI|ISLITERAL|a)\b|([A-Za-z][\w-]*:[\w.-]*)/gi;

function highlightSparql(text) {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(SPARQL_TOKEN)) {
    html += escapeHtml(text.slice(last, match.index));
    const kind = match[1] ? "com" : match[2] ? "str" : match[4] ? "var" : match[5] ? "kw" : "pre";
    html += `<span class="${kind}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}

function codeBlock(label, text, copyId) {
  return `
    <div class="code-block">
      <header>
        <span>${escapeHtml(label)}</span>
        ${copyId === undefined ? "" : `<button class="copy-query" type="button" data-copy="${copyId}">Copy</button>`}
      </header>
      <pre><code>${highlightSparql(text)}</code></pre>
    </div>
  `;
}

// One tooltip element, shared by metric rows and chart rows.
const tipEl = document.createElement("div");
tipEl.className = "tip";
tipEl.hidden = true;
tipEl.setAttribute("role", "tooltip");
document.body.appendChild(tipEl);

function showTip(html, rect) {
  if (!html) return;
  tipEl.innerHTML = html;
  tipEl.hidden = false;
  const width = Math.min(340, window.innerWidth - 24);
  tipEl.style.width = `${width}px`;
  let left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
  let top = rect.bottom + 8;
  const height = tipEl.offsetHeight;
  if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
  tipEl.style.left = `${left}px`;
  tipEl.style.top = `${top}px`;
}

function hideTip() {
  tipEl.hidden = true;
}

/**
 * Sortable table. Each column: {key, label, value(row), cell(row, ctx), cls, sortable}.
 * state = {key, dir}. Ranks follow the active column when it is numeric.
 */
function renderTable(table, columns, rows, state, options = {}) {
  const active = columns.find((column) => column.key === state.key) || columns[0];
  const sorted = [...rows].sort((a, b) => {
    const left = active.value(a);
    const right = active.value(b);
    const order = typeof left === "string" ? left.localeCompare(right) : left - right;
    return state.dir === "asc" ? order : -order;
  });
  const best = {};
  // Underline a column's best value only when one row holds it alone.
  columns.forEach((column) => {
    if (!column.best) return;
    const values = rows.map((row) => column.value(row));
    const top = Math.max(...values);
    if (values.filter((value) => value === top).length === 1) best[column.key] = top;
  });
  const rankBy = typeof active.value(rows[0]) === "number" ? active : columns.find((c) => c.rankDefault);

  const head = columns
    .map((column) => {
      const sort = column.key === active.key ? ` aria-sort="${state.dir === "asc" ? "ascending" : "descending"}"` : "";
      const label = column.sortable === false
        ? escapeHtml(column.label)
        : `<button type="button" data-sort="${column.key}">${escapeHtml(column.label)}</button>`;
      return `<th scope="col" class="${column.headCls || column.cls || ""}"${sort}>${label}</th>`;
    })
    .join("");

  const body = sorted
    .map((row) => {
      const rank = rankBy ? 1 + rows.filter((other) => rankBy.value(other) > rankBy.value(row)).length : 0;
      const ctx = { rank, best };
      const attrs = options.rowAttrs ? options.rowAttrs(row) : "";
      const cells = columns
        .map((column) => {
          const isBest = column.key in best && column.value(row) === best[column.key] ? " best" : "";
          return `<td class="${column.cls || ""}${isBest}">${column.cell(row, ctx)}</td>`;
        })
        .join("");
      return `<tr${attrs}>${cells}</tr>`;
    })
    .join("");
  table.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

function bindSorting(table, state, rerender) {
  table.addEventListener("click", (event) => {
    const button = event.target.closest("th button[data-sort]");
    if (!button) return;
    const key = button.dataset.sort;
    if (state.key === key) {
      state.dir = state.dir === "asc" ? "desc" : "asc";
    } else {
      state.key = key;
      state.dir = key === "name" ? "asc" : "desc";
    }
    rerender();
  });
}

// ---------- leaderboard ----------

const board = $("#board");
const boardState = { key: "coverage", dir: "desc" };

const boardColumns = [
  {
    key: "rank",
    label: "Rank",
    sortable: false,
    cls: "rank",
    value: () => 0,
    cell: (_row, ctx) => `<span class="${ctx.rank === 1 ? "first" : ""}">${ctx.rank}</span>`,
  },
  {
    key: "name",
    label: "Ontology",
    cls: "l sticky-col",
    value: (row) => row.name,
    cell: (row) => `<span class="name">${escapeHtml(row.name)}<small>${escapeHtml(row.fullName)}</small></span>`,
  },
  {
    key: "coverage",
    label: "Coverage",
    best: true,
    rankDefault: true,
    value: (row) => row.coverage,
    cell: (row) => `<span class="score-cell"><span class="num">${row.coverage.toFixed(1)}%</span>${bar(row.coverage)}</span>`,
  },
  ...categoryNames.map((name, index) => ({
    key: `category-${index}`,
    label: name,
    cls: "heat",
    headCls: "wrap",
    value: (row) => row.categories[index],
    cell: (row) => {
      const score = row.categories[index];
      return `<span class="${heatClass(score)}" title="${escapeHtml(`${row.name} · ${name}: ${score}%`)}">${score}</span>`;
    },
  })),
  {
    key: "terms",
    label: "Terms",
    value: (row) => row.terms,
    cell: (row) => row.terms.toLocaleString(),
  },
];

function renderBoard() {
  renderTable(board, boardColumns, ontologies, boardState);
}

bindSorting(board, boardState, renderBoard);

// Category profile: a dot per ontology on each category lane, one highlighted.
const profileChips = $("#profile-chips");
const profileChart = $("#profile-chart");
let profileFocus = 0;

function renderProfileChips() {
  profileChips.innerHTML = ontologies
    .map(
      (ontology, index) =>
        `<button type="button" class="chip" data-index="${index}" aria-pressed="${index === profileFocus}">${escapeHtml(ontology.name)}</button>`,
    )
    .join("");
}

function profileRows() {
  return [
    { name: "Overall", values: ontologies.map((o) => o.coverage) },
    ...categoryNames.map((name, index) => ({ name, values: ontologies.map((o) => o.categories[index]) })),
  ];
}

function renderProfile() {
  const width = profileChart.clientWidth;
  if (!width) return;
  const rows = profileRows();
  const labelWidth = Math.min(140, Math.round(width * 0.3));
  const right = 36;
  const laneHeight = 34;
  const top = 26;
  const height = top + rows.length * laneHeight + 4;
  const min = 50;
  const x = (value) => labelWidth + ((value - min) / (100 - min)) * (width - labelWidth - right);
  const ticks = [50, 60, 70, 80, 90, 100];

  const grid = ticks
    .map(
      (tick) => `
        <line x1="${x(tick)}" x2="${x(tick)}" y1="${top - 6}" y2="${height}" />
        <text x="${x(tick)}" y="${top - 12}" text-anchor="middle">${tick}${tick === 100 ? "%" : ""}</text>
      `,
    )
    .join("");

  const lanes = rows
    .map((row, rowIndex) => {
      const y = top + rowIndex * laneHeight + laneHeight / 2;
      const others = row.values
        .map((value, index) => (index === profileFocus ? "" : `<circle class="other" cx="${x(value)}" cy="${y}" r="5" />`))
        .join("");
      const focusValue = row.values[profileFocus];
      const fx = x(focusValue);
      const labelLeft = fx > width - right - 30;
      return `
        <g class="lane-row" data-row="${rowIndex}">
          <rect class="hit" x="0" y="${y - laneHeight / 2}" width="${width}" height="${laneHeight}" />
          <text class="cat" x="0" y="${y + 4}" ${rowIndex === 0 ? 'font-weight="600"' : ""}>${escapeHtml(row.name)}</text>
          <line class="lane" x1="${labelWidth}" x2="${width - right}" y1="${y}" y2="${y}" />
          ${others}
          <circle class="focus" cx="${fx}" cy="${y}" r="6.5" />
          <text class="val" x="${labelLeft ? fx - 12 : fx + 12}" y="${y + 4}" text-anchor="${labelLeft ? "end" : "start"}">${focusValue}</text>
        </g>
      `;
    })
    .join("");

  profileChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"
      aria-label="${escapeHtml(`${ontologies[profileFocus].name} coverage by category, compared with the other ontologies`)}">
      <g class="grid axis">${grid}</g>
      ${lanes}
    </svg>
    <div class="profile-legend">
      <span><i style="background: var(--accent)"></i>${escapeHtml(ontologies[profileFocus].name)}</span>
      <span><i style="background: var(--dot-muted)"></i>Other ontologies</span>
    </div>
  `;
}

function profileTip(rowIndex) {
  const row = profileRows()[rowIndex];
  const ranked = ontologies
    .map((ontology, index) => ({ name: ontology.name, value: row.values[index], focus: index === profileFocus }))
    .sort((a, b) => b.value - a.value);
  return `
    <strong>${escapeHtml(row.name)}</strong>
    ${ranked
      .map((item) => `<p>${item.focus ? "<b>" : ""}${escapeHtml(item.name)} · ${item.value}%${item.focus ? "</b>" : ""}</p>`)
      .join("")}
  `;
}

profileChips.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  profileFocus = Number(button.dataset.index);
  renderProfileChips();
  renderProfile();
});

profileChart.addEventListener("mousemove", (event) => {
  const lane = event.target.closest(".lane-row");
  if (!lane) return hideTip();
  showTip(profileTip(Number(lane.dataset.row)), {
    left: event.clientX + 12,
    top: event.clientY - 10,
    bottom: event.clientY + 4,
  });
});
profileChart.addEventListener("mouseleave", hideTip);

let resizeTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderProfile, 120);
});

// ---------- domains ----------

const domainBoard = $("#domain-board");
const domainState = { key: "recall", dir: "desc" };
const domainFrameworkStatus = $("#domain-framework-status");
const domainFrameworkResults = $("#domain-framework-results");
const domainDetailTitle = $("#domain-detail-title");
let frameworkBenchmarks = { domains: [] };
let selectedDomain = domains[0].name;

function frameworkFor(name) {
  const saved = (frameworkBenchmarks.domains || []).find((item) => item.name === name);
  return saved && !saved.error ? saved : null;
}

function optionalNumber(value) {
  return isMissing(value) ? -1 : Number(value);
}

const domainColumns = [
  {
    key: "name",
    label: "Domain",
    cls: "l sticky-col",
    value: (row) => row.name,
    cell: (row) => `<button type="button" class="row-btn" data-domain="${escapeHtml(row.name)}">${escapeHtml(row.name)}</button>`,
  },
  {
    key: "recall",
    label: "Recall",
    best: true,
    rankDefault: true,
    value: (row) => row.recall,
    cell: (row) => `<span class="score-cell"><span class="num">${formatPublished(row.recall)}</span>${bar(row.recall)}</span>`,
  },
  {
    key: "precision",
    label: "Precision",
    best: true,
    value: (row) => row.precision,
    cell: (row) => `<span class="score-cell"><span class="num">${formatPublished(row.precision)}</span>${bar(row.precision)}</span>`,
  },
  {
    key: "matched",
    label: "Task terms matched",
    value: (row) => row.matched / row.taskTerms,
    cell: (row) => `${row.matched} / ${row.taskTerms}`,
  },
  {
    key: "terms",
    label: "Ontology terms",
    value: (row) => row.terms,
    cell: (row) => row.terms.toLocaleString(),
  },
  {
    key: "foops",
    label: "FOOPS",
    value: (row) => optionalNumber(frameworkFor(row.name)?.foops?.overall),
    cell: (row) => {
      const overall = frameworkFor(row.name)?.foops?.overall;
      return isMissing(overall) ? "—" : `${overall}%`;
    },
  },
  ...["critical", "important", "minor"].map((severity) => ({
    key: severity,
    label: `OOPS ${severity}`,
    value: (row) => optionalNumber(frameworkFor(row.name)?.oops?.summary?.[severity]),
    cell: (row) => {
      const count = frameworkFor(row.name)?.oops?.summary?.[severity];
      return isMissing(count) ? "—" : `<span class="sev ${severity}">${count}</span>`;
    },
  })),
];

function renderDomainBoard() {
  renderTable(domainBoard, domainColumns, domains, domainState, {
    rowAttrs: (row) => ` data-domain="${escapeHtml(row.name)}" aria-selected="${row.name === selectedDomain}"`,
  });
}

function renderFoopsTests(panel) {
  const tests = panel.tests || [];
  if (!tests.length) return "";
  const rows = tests
    .map((test) => {
      const state = test.passed === true ? "pass" : test.passed === false ? "critical" : "skip";
      const word = test.passed === true ? "Passed" : test.passed === false ? "Failed" : "Skipped";
      return `
        <tr title="${escapeHtml(test.message || "")}">
          <td>${escapeHtml(test.source_id || test.id)}</td>
          <td>${escapeHtml(test.name || "")}</td>
          <td>${escapeHtml(test.fair_principle || "")}</td>
          <td><span class="sev ${state}">${word}</span></td>
        </tr>
      `;
    })
    .join("");
  return `
    <section class="panel wide">
      <div class="panel-head">
        <h3>FOOPS tests</h3>
        <span class="kicker">${plural(tests.length, "test")}</span>
      </div>
      <div class="tests"><table>${rows}</table></div>
    </section>
  `;
}

function showFrameworkDomain(name) {
  selectedDomain = name;
  renderDomainBoard();
  const domain = domains.find((item) => item.name === name);
  const saved = frameworkFor(name);
  domainDetailTitle.textContent = `${name} · local OntoCheck run`;
  if (!saved || (!saved.foops && !saved.oops)) {
    domainFrameworkStatus.textContent = "This run is missing.";
    domainFrameworkResults.innerHTML = "";
    return;
  }
  const files = (saved.files || []).join(", ");
  domainFrameworkStatus.textContent = `Local OntoCheck tests${files ? ` on ${files}` : ""}. ${domain.matched} of ${domain.taskTerms} unique task terms matched.`;
  domainFrameworkResults.innerHTML = [
    saved.foops ? renderFoopsPanel(saved.foops) : "",
    saved.oops ? renderOopsPanel(saved.oops) : "",
    saved.foops ? renderFoopsTests(saved.foops) : "",
  ].join("");
}

async function loadFrameworkBenchmarks() {
  renderDomainBoard();
  try {
    const response = await fetch("benchmark-frameworks.json");
    if (!response.ok) throw new Error("missing");
    frameworkBenchmarks = await response.json();
  } catch {
    frameworkBenchmarks = { domains: [] };
  }
  showFrameworkDomain(selectedDomain);
}

bindSorting(domainBoard, domainState, renderDomainBoard);
domainBoard.addEventListener("click", (event) => {
  if (event.target.closest("th")) return;
  const row = event.target.closest("tr[data-domain]");
  if (row) showFrameworkDomain(row.dataset.domain);
});

// ---------- ontology assessment ----------

const severityOrder = { critical: 0, important: 1, minor: 2 };
const assessmentRank = document.querySelector("#assessment-rank");
const assessmentLevels = document.querySelector("#assessment-levels");
const assessmentTables = document.querySelector("#assessment-tables");
const assessmentDomains = document.querySelector("#assessment-domains");
const assessmentHead = document.querySelector("#assessment-head");
const assessmentBody = document.querySelector("#assessment-body");
const assessmentQueries = document.querySelector("#assessment-queries");
const assessmentQueriesHead = document.querySelector("#assessment-queries-head");
const assessmentQueriesBody = document.querySelector("#assessment-queries-body");
// The whitepaper's four-level fitness profile <F_C, (F_S, F_L), F_R, F_D>.
// OOPS, FOOPS, OQuaRE, and OntoCheck's own checks are ontology-quality
// baselines, not a level; the data file stores them as level "0".
const assessmentLevelList = [
  { key: "0", label: "Baselines" },
  { key: "I", label: "I · Conceptual" },
  { key: "II", label: "II · Structural & logical" },
  { key: "III", label: "III · Retrieval" },
  { key: "IV", label: "IV · Downstream reasoning" },
];
// One entry per reported coordinate, in the whitepaper's order.
const fitnessCoordinates = [
  { level: "I", id: "conceptualFitness", symbol: "F_C", name: "Conceptual fitness", about: "Do the ontology's terms support the concepts and properties the questions need?" },
  { level: "II-A", id: "structuralFitness", symbol: "F_S", name: "Structural fitness", about: "Is the connectivity the questions need represented as an admissible schema path?" },
  { level: "II-B", id: "logicalFitness", symbol: "F_L", name: "Logical fitness", about: "Do the required conclusions follow from the ontology's axioms?" },
  { level: "III", id: "retrievalFitness", symbol: "F_R", name: "Retrieval fitness", about: "Does a fixed retriever, guided by the ontology, return the gold evidence within budget?" },
  { level: "IV", id: "answerAccuracy", symbol: "F_D", name: "Downstream reasoning fitness", about: "Can a fixed reasoner answer correctly, along the right path, from that evidence?" },
];
// Rows that are reported but are not one of the five coordinates.
const ontocheckNotes = {
  recall: "OntoCheck term coverage, a Level-I baseline",
  precision: "OntoCheck term coverage, a Level-I baseline",
  counterfactualImportance: "Validates workload weights; not part of conceptual fitness",
  benchmarkScore: "Single score over the benchmark cases",
};
const assessmentKinds = [
  { key: "oops", label: "OOPS" },
  { key: "foops", label: "FOOPS" },
  { key: "oquare", label: "OQuaRE" },
  { key: "ontocheck", label: "OntoCheck" },
];
// Rows exported before levels were recorded.
const ontocheckLevels = {
  recall: "I",
  precision: "I",
  conceptualFitness: "I",
  counterfactualImportance: "I",
  structuralFitness: "II-A",
  logicalFitness: "II-B",
  retrievalFitness: "III",
  benchmarkScore: "IV",
  answerAccuracy: "IV",
  reasoningPath: "IV",
};
// Values read from a row's detail, listed after the row itself.
const ontocheckDerived = {
  conceptualFitness: [
    { key: "aligned_score", name: "Conceptual fitness with aligned support" },
    { key: "ambiguity", name: "Mapping ambiguity" },
  ],
  structuralFitness: [
    { key: "path_coverage", name: "Path coverage" },
    { key: "path_stretch", name: "Path stretch" },
  ],
};
let assessment = { domains: [] };
let assessmentLevel = "0";
let assessmentKind = "oops";
let assessmentDomain = null;
let assessmentSort = "conceptualFitness";

function formatAssessmentValue(value) {
  if (value === null || value === undefined) return "—";
  if (value === true) return "pass";
  if (value === false) return "fail";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return Math.abs(value) < 10 ? value.toFixed(3) : value.toFixed(1);
  }
  return String(value);
}

function assessmentPercent(value) {
  return value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`;
}

function localName(iri) {
  return String(iri).split(/[#/]/).filter(Boolean).pop() || String(iri);
}

function rowLevel(row) {
  return row.level || ontocheckLevels[row.id] || "0";
}

function ontocheckRow(domain, id) {
  return ((domain.tables.ontocheck || {}).rows || []).find((item) => item.id === id);
}

function ontocheckValue(domain, id) {
  const row = ontocheckRow(domain, id);
  return row && row.status === "Success" ? row.value : null;
}

function passShare(summary, weighted) {
  if (!summary || !summary.run) return null;
  if (!weighted) return summary.passed / summary.run;
  if (summary.failed_in_context === null || summary.failed_in_context === undefined) return null;
  return (summary.run - summary.failed_in_context) / summary.run;
}

function rankScores(domain) {
  const t = domain.tables;
  return {
    oops: [passShare(t.oops.summary, false), passShare(t.oops.summary, true)],
    foops: [passShare(t.foops.summary, false), passShare(t.foops.summary, true)],
    oquare: [t.oquare.summary.mean_grade, t.oquare.summary.mean_weighted_grade],
    recall: [ontocheckValue(domain, "recall")],
    conceptualFitness: [ontocheckValue(domain, "conceptualFitness")],
    structuralFitness: [ontocheckValue(domain, "structuralFitness")],
    logicalFitness: [ontocheckValue(domain, "logicalFitness")],
    retrievalFitness: [ontocheckValue(domain, "retrievalFitness")],
    answerAccuracy: [ontocheckValue(domain, "answerAccuracy")],
    reasoningPath: [ontocheckValue(domain, "reasoningPath")],
  };
}

const workloadBaseUrl = "https://github.com/cwru-sdle/OntoCheck/blob/main/SupplementaryMaterials/";

function workloadTag(file, count, folder) {
  if (!file) return "";
  const n = count ? ` · ${count}` : "";
  const href = `${workloadBaseUrl}${folder}/${encodeURIComponent(file)}`;
  return `<a class="tag workload-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(file)}${n}</a>`;
}

function questionsTag(domain) {
  return workloadTag(domain.questions, (domain.queries || []).length, "SPARQL_Queries");
}

function benchmarkTag(domain) {
  return workloadTag(domain.benchmark, (domain.benchmark_cases || []).length, "Benchmarks");
}

function rankCell(label, values, format, status) {
  const [original, weighted] = values;
  const second =
    values.length > 1 ? `<span class="assess-value weighted">${escapeHtml(format(weighted))}</span>` : "";
  const why = status && status !== "Success" ? ` title="${escapeHtml(status)}"` : "";
  return `<td data-label="${escapeHtml(label)}"${why}><span class="assess-value">${escapeHtml(format(original))}</span>${second}</td>`;
}

function renderAssessmentRank() {
  const scored = (assessment.domains || []).filter((domain) => domain.tables);
  if (!scored.length) {
    assessmentRank.innerHTML = '<tr><td colspan="12" class="l"><p class="empty">The assessment results could not be loaded.</p></td></tr>';
    return;
  }
  const rows = scored.map((domain) => ({ domain, scores: rankScores(domain) }));
  const key = (row) => {
    const values = row.scores[assessmentSort];
    const value = values.length > 1 && values[1] !== null ? values[1] : values[0];
    return value === null || value === undefined ? -Infinity : value;
  };
  rows.sort((a, b) => key(b) - key(a));
  document.querySelectorAll(".assess-rank th button").forEach((button) => {
    const th = button.closest("th");
    if (button.dataset.sort === assessmentSort) th.setAttribute("aria-sort", "descending");
    else th.removeAttribute("aria-sort");
  });
  const grade = (value) => (value === null || value === undefined ? "—" : value.toFixed(2));
  const score = (value) => (value === null || value === undefined ? "—" : value.toFixed(3));
  assessmentRank.innerHTML = rows
    .map(
      ({ domain, scores }, index) => `
        <tr>
          <td class="rank" data-label="Rank"><span class="${index === 0 ? "first" : ""}">${index + 1}</span></td>
          <td class="l sticky-col" data-label="Domain">
            <span class="name">${escapeHtml(domain.name)}</span>
            <span class="assess-workload">${questionsTag(domain)}${benchmarkTag(domain)}</span>
          </td>
          ${rankCell("Baseline · OOPS", scores.oops, assessmentPercent)}
          ${rankCell("Baseline · FOOPS", scores.foops, assessmentPercent)}
          ${rankCell("Baseline · OQuaRE", scores.oquare, grade)}
          ${rankCell("Baseline · Term recall", scores.recall, score)}
          ${rankCell("I · Conceptual fitness", scores.conceptualFitness, score)}
          ${rankCell("II-A · Structural fitness", scores.structuralFitness, score)}
          ${rankCell("II-B · Logical fitness", scores.logicalFitness, score, ontocheckRow(domain, "logicalFitness")?.status)}
          ${rankCell("III · Retrieval fitness", scores.retrievalFitness, score, ontocheckRow(domain, "retrievalFitness")?.status)}
          ${rankCell("IV · Answer accuracy", scores.answerAccuracy, score, ontocheckRow(domain, "answerAccuracy")?.status)}
          ${rankCell("IV · Reasoning path", scores.reasoningPath, score, ontocheckRow(domain, "reasoningPath")?.status)}
        </tr>
      `,
    )
    .join("");
}

function assessmentValueCell(row, field) {
  if (!row || (row.status && row.status !== "Success")) {
    return `<td class="missing"${row ? ` title="${escapeHtml(row.status)}"` : ""}>—</td>`;
  }
  const weighted = field === "weighted";
  const value = weighted ? row.weighted : row.original;
  const passed = weighted ? row.passed_in_context ?? row.passed : row.passed;
  const empty = value === null || value === undefined;
  const dot = passed === true ? "pass" : passed === false ? "critical" : "";
  const grade = assessmentKind === "oquare" ? (weighted ? row.weighted_grade : row.grade) : null;
  const same = weighted && row.weighting === "not applicable";
  return `
    <td>
      <span class="assess-value${weighted ? " weighted" : ""}${same ? " same" : ""}">
        ${dot && !empty ? `<i class="sev ${dot}" aria-label="${dot === "pass" ? "passed" : "failed"}"></i>` : ""}${escapeHtml(formatAssessmentValue(value))}${grade ? ` <small>${grade}/5</small>` : ""}
      </span>
    </td>
  `;
}

function plainValueCell(value, status, label, fixed) {
  const ok = !status || status === "Success";
  const text = !ok ? "—" : fixed && typeof value === "number" ? value.toFixed(3) : formatAssessmentValue(value);
  const attrs = (label ? ` data-label="${escapeHtml(label)}"` : "") + (ok ? "" : ` title="${escapeHtml(status)}"`);
  return `
    <td class="${ok ? "" : "missing"}"${attrs}>
      <span class="assess-value">${escapeHtml(text)}</span>
    </td>
  `;
}

function fixedCell(value, label) {
  return plainValueCell(value, null, label, true);
}

function hideQueries() {
  assessmentQueries.hidden = true;
  assessmentQueriesHead.innerHTML = "";
  assessmentQueriesBody.innerHTML = "";
}

function renderFrameworkTable(domain) {
  const rows = (domain.tables[assessmentKind] || {}).rows || [];
  if (assessmentKind === "ontocheck") {
    assessmentHead.innerHTML = '<tr><th scope="col" class="l">Metric</th><th scope="col">Value</th></tr>';
    assessmentBody.innerHTML = rows
      .filter((row) => rowLevel(row) === "0")
      .map(
        (row) => `
          <tr>
            <th scope="row" class="l metric">${escapeHtml(row.name)}</th>
            ${plainValueCell(row.value, row.status)}
          </tr>
        `,
      )
      .join("");
    return;
  }
  const by = [domain.questions ? questionsTag(domain) : "", domain.has_abox ? '<span class="tag">ABox</span>' : ""].join("");
  assessmentHead.innerHTML = `<tr><th scope="col" class="l">Metric</th><th scope="col">Original</th><th scope="col">Weighted <span class="assess-workload">${by}</span></th></tr>`;
  const metricRow = (row) => `
    <tr>
      <th scope="row" class="l metric" title="${escapeHtml(row.description || "")}">
        <span class="tag">${escapeHtml(row.source_id)}</span><span>${escapeHtml(row.name)}</span>
      </th>
      ${assessmentValueCell(row, "original")}
      ${assessmentValueCell(row, "weighted")}
    </tr>
  `;
  if (assessmentKind !== "oops") {
    assessmentBody.innerHTML = rows.map(metricRow).join("");
    return;
  }
  assessmentBody.innerHTML = ["critical", "important", "minor"]
    .map((severity) => {
      const group = rows.filter((row) => row.severity === severity);
      if (!group.length) return "";
      const label = severity[0].toUpperCase() + severity.slice(1);
      return `
        <tr class="group"><th scope="rowgroup" colspan="3" class="l">${label}</th></tr>
        ${group.map(metricRow).join("")}
      `;
    })
    .join("");
}

function sourceTag(domain, row) {
  if (row.kind === "benchmark" || row.id === "counterfactualImportance") return benchmarkTag(domain);
  if (row.kind === "task" || row.kind === "fitness") return questionsTag(domain);
  return "";
}

function renderLevelTable(domain) {
  const rows = ((domain.tables.ontocheck || {}).rows || []).filter((row) => rowLevel(row).split("-")[0] === assessmentLevel);
  const groups = assessmentLevel === "II" ? [["II-A", "II-A · Structural"], ["II-B", "II-B · Logical"]] : [[null, null]];
  assessmentHead.innerHTML =
    '<tr><th scope="col" class="l">Metric</th><th scope="col">Value</th><th scope="col" class="l">Queries</th></tr>';
  const metricRows = (row) => {
    const source = row.status === "Success" ? sourceTag(domain, row) : "";
    const notes = [ontocheckNotes[row.id], row.status === "Success" ? "" : row.status].filter(Boolean);
    const main = `
      <tr>
        <th scope="row" class="l metric">${escapeHtml(row.name)}${notes.map((note) => `<small>${escapeHtml(note)}</small>`).join("")}</th>
        ${plainValueCell(row.value, row.status, null, true)}
        <td class="l"><span class="assess-workload">${source}</span></td>
      </tr>
    `;
    const extra = (ontocheckDerived[row.id] || [])
      .filter(() => row.status === "Success")
      .map(
        (item) => `
          <tr>
            <th scope="row" class="l metric derived">${escapeHtml(item.name)}</th>
            ${fixedCell((row.detail || {})[item.key])}
            <td class="l"><span class="assess-workload">${source}</span></td>
          </tr>
        `,
      )
      .join("");
    return main + extra;
  };
  assessmentBody.innerHTML = groups
    .map(([level, label]) => {
      const group = level ? rows.filter((row) => rowLevel(row) === level) : rows;
      if (!group.length) return "";
      const head = label ? `<tr class="group"><th scope="rowgroup" colspan="3" class="l">${label}</th></tr>` : "";
      return head + group.map(metricRows).join("");
    })
    .join("") || '<tr><td colspan="3" class="missing">—</td></tr>';
  renderQueryTable(domain);
}

function queryCell(id, question) {
  return `
    <th scope="row" class="l metric query">
      <span class="tag">${escapeHtml(id)}</span><span>${escapeHtml(question || "")}</span>
    </th>
  `;
}

function nameList(values, label) {
  if (!values || !values.length) return `<td class="l missing names" data-label="${label}">—</td>`;
  return `<td class="l names" data-label="${label}">${values.map((v) => escapeHtml(v.includes(" --") ? v : localName(v))).join("<br>")}</td>`;
}

function renderQueryTable(domain) {
  const queries = domain.queries || [];
  const cases = domain.benchmark_cases || [];
  if (assessmentLevel === "I" && queries.length) {
    assessmentQueriesHead.innerHTML =
      '<tr><th scope="col" class="l">Query</th><th scope="col">Conceptual fitness</th><th scope="col">Ambiguity</th><th scope="col" class="l">Unsupported</th></tr>';
    assessmentQueriesBody.innerHTML = queries
      .map(
        (q) => `
          <tr>
            ${queryCell(q.qid, q.question)}
            ${fixedCell(q.F_C, "Conceptual fitness")}
            ${fixedCell(q.A_C, "Ambiguity")}
            ${nameList(q.unsupported, "Unsupported")}
          </tr>
        `,
      )
      .join("");
  } else if (assessmentLevel === "II" && queries.length) {
    assessmentQueriesHead.innerHTML =
      '<tr><th scope="col" class="l">Query</th><th scope="col">Structural fitness</th><th scope="col">Path coverage</th><th scope="col" class="l">Unrealised</th></tr>';
    assessmentQueriesBody.innerHTML = queries
      .map(
        (q) => `
          <tr>
            ${queryCell(q.qid, q.question)}
            ${fixedCell(q.F_S, "Structural fitness")}
            ${fixedCell(q.path_coverage, "Path coverage")}
            ${nameList(q.unrealised, "Unrealised")}
          </tr>
        `,
      )
      .join("");
  } else if (assessmentLevel === "IV" && cases.length) {
    assessmentQueriesHead.innerHTML =
      '<tr><th scope="col" class="l">Case</th><th scope="col">Score</th><th scope="col">Answer</th><th scope="col">Path</th></tr>';
    assessmentQueriesBody.innerHTML = cases
      .map(
        (c) => `
          <tr>
            ${queryCell(c.id, c.question)}
            ${fixedCell(c.score, "Score")}
            ${fixedCell(c.constraint_score === null ? c.answer_score : null, "Answer")}
            ${fixedCell(c.evidence_score, "Path")}
          </tr>
        `,
      )
      .join("");
  } else {
    hideQueries();
    return;
  }
  assessmentQueries.hidden = false;
}

function renderAssessmentDetail() {
  const domain = (assessment.domains || []).find((item) => item.name === assessmentDomain);
  if (!domain || !domain.tables) {
    assessmentHead.innerHTML = "";
    assessmentBody.innerHTML = '<tr><td class="l"><p class="empty">No assessment results for this domain.</p></td></tr>';
    hideQueries();
    return;
  }
  if (assessmentLevel === "0") {
    renderFrameworkTable(domain);
    hideQueries();
    return;
  }
  renderLevelTable(domain);
}

function pillButtons(items, active, attribute) {
  return items
    .map(
      (item) => `
        <button type="button" class="chip" data-${attribute}="${escapeHtml(item.key)}" aria-pressed="${item.key === active}">
          ${escapeHtml(item.label)}
        </button>
      `,
    )
    .join("");
}

function renderAssessmentPills() {
  assessmentLevels.innerHTML = pillButtons(assessmentLevelList, assessmentLevel, "level");
  assessmentTables.hidden = assessmentLevel !== "0";
  assessmentTables.innerHTML = pillButtons(assessmentKinds, assessmentKind, "kind");
  assessmentDomains.innerHTML = (assessment.domains || [])
    .filter((domain) => domain.tables)
    .map(
      (domain) => `
        <button type="button" class="chip" aria-pressed="${domain.name === assessmentDomain}" data-domain="${escapeHtml(domain.name)}">
          ${escapeHtml(domain.name)}
        </button>
      `,
    )
    .join("");
}

// How many domains have each coordinate, or why none do.
function renderFramework() {
  const scored = (assessment.domains || []).filter((domain) => domain.tables);
  const cells = fitnessCoordinates.map((coordinate) => {
    const rows = scored.map((domain) => ontocheckRow(domain, coordinate.id)).filter(Boolean);
    const done = rows.filter((row) => row.status === "Success").length;
    const reasons = [...new Set(rows.filter((row) => row.status !== "Success").map((row) => row.status))];
    const state = !scored.length
      ? ""
      : done
        ? `Scored for ${done} of ${scored.length} domains`
        : reasons.join("; ") || "Not in the results";
    return `
      <div class="coord${done ? "" : " pending"}">
        <span class="tag">${escapeHtml(coordinate.level)}</span>
        <b>${escapeHtml(coordinate.name)} <span class="sym">F<sub>${escapeHtml(coordinate.symbol.slice(2))}</sub></span></b>
        <p>${escapeHtml(coordinate.about)}</p>
        <span class="state">${escapeHtml(state)}</span>
      </div>
    `;
  });
  $("#fitness-framework").innerHTML = cells.join("");
}

async function loadAssessment() {
  try {
    const response = await fetch("ontocheck-results.json");
    if (!response.ok) throw new Error("missing");
    assessment = await response.json();
  } catch {
    assessment = { domains: [] };
  }
  const first = (assessment.domains || []).find((domain) => domain.tables);
  assessmentDomain = first ? first.name : null;
  renderFramework();
  renderAssessmentPills();
  renderAssessmentRank();
  renderAssessmentDetail();
}

assessmentLevels.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  assessmentLevel = button.dataset.level;
  renderAssessmentPills();
  renderAssessmentDetail();
});

assessmentTables.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  assessmentKind = button.dataset.kind;
  renderAssessmentPills();
  renderAssessmentDetail();
});

assessmentDomains.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  assessmentDomain = button.dataset.domain;
  renderAssessmentPills();
  renderAssessmentDetail();
});

document.querySelector(".assess-rank thead").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-sort]");
  if (!button) return;
  assessmentSort = button.dataset.sort;
  renderAssessmentRank();
});

// ---------- result panels (domains, evaluate) ----------

function remoteNote(remote, label) {
  if (!remote) return "";
  if (remote.ok) {
    const overall = remote.summary && remote.summary.overall;
    const extra =
      overall === null || overall === undefined ? "" : ` Overall score ${overall}.`;
    return `<p class="note">Public ${escapeHtml(label)} service responded.${escapeHtml(extra)}</p>`;
  }
  return `<p class="note warn">${escapeHtml(remote.detail || `Public ${label} service did not respond.`)} Local OntoCheck tests are shown below.</p>`;
}

function renderOntocheckPanel(panel) {
  const metrics = (panel.metrics || [])
    .map((metric) => {
      const help = CORE_METRICS[metric.name];
      const attrs = help ? ` tabindex="0" data-metric="${escapeHtml(metric.name)}"` : "";
      return `
        <div class="metric-row"${attrs}>
          <span>${escapeHtml(metric.name)}</span>
          ${bar(scoreWidth(metric.score))}
          <strong>${formatPlain(metric.score)}</strong>
        </div>
      `;
    })
    .join("");
  const missing = (panel.missing || [])
    .slice(0, 12)
    .map((term) => `<span>${escapeHtml(term)}</span>`)
    .join("");
  return `
    <section class="panel wide">
      <div class="panel-head">
        <h3>Query coverage</h3>
        <span class="kicker">OntoCheck</span>
      </div>
      <div class="pair">
        <div><span>Recall</span><b class="big">${formatPercent(panel.recall)}</b></div>
        <div><span>Precision</span><b class="big">${formatPercent(panel.precision)}</b></div>
      </div>
      <p class="note">
        ${panel.intersection ?? "—"} of ${panel.task_terms ?? "—"} task terms found
        among ${panel.ontology_terms ?? "—"} ontology terms
        ${panel.query_count ? `· ${panel.query_count} queries` : ""}
      </p>
      ${missing ? `<div class="term-chips" aria-label="Task terms not found">${missing}</div>` : ""}
      ${metrics ? `<div class="metric-list">${metrics}</div>` : ""}
    </section>
  `;
}

function renderFoopsPanel(panel) {
  const principles = (panel.principles || [])
    .map(
      (item) => `
        <div class="metric-row" tabindex="0" data-principle="${escapeHtml(item.id)}" data-passed="${item.passed || 0}" data-failed="${item.failed || 0}" data-skipped="${item.skipped || 0}" data-score="${item.score === null || item.score === undefined ? "" : item.score}">
          <span>${escapeHtml(item.id)}</span>
          ${bar(item.score ?? 0)}
          <strong>${item.score === null || item.score === undefined ? "—" : `${item.score}%`}</strong>
        </div>
      `,
    )
    .join("");
  return `
    <section class="panel">
      <div class="panel-head">
        <h3>FAIR principles</h3>
        <span class="kicker">FOOPS</span>
      </div>
      <b class="big">${isMissing(panel.overall) ? "—" : `${panel.overall}%`}</b>
      ${remoteNote(panel.remote, "FOOPS")}
      <div class="sev-row">
        <span class="sev pass">${panel.passed || 0} passed</span>
        <span class="sev critical">${panel.failed || 0} failed</span>
        <span class="sev skip">${panel.skipped || 0} skipped offline</span>
      </div>
      <div class="metric-list">${principles || '<p class="empty">No local FOOPS tests ran.</p>'}</div>
    </section>
  `;
}

function renderOopsPanel(panel) {
  const summary = panel.summary || {};
  const pitfalls = (panel.pitfalls || [])
    .slice()
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))
    .map(
      (item) => `
        <li>
          <span class="tag">${escapeHtml(item.source_id || item.severity || "pitfall")}</span>
          <span><span class="sev ${escapeHtml(item.severity || "")}">${escapeHtml(item.name || "")}</span><br />${escapeHtml(item.message || "Pitfall detected")}</span>
        </li>
      `,
    )
    .join("");
  return `
    <section class="panel">
      <div class="panel-head">
        <h3>Pitfalls</h3>
        <span class="kicker">OOPS</span>
      </div>
      ${remoteNote(panel.remote, "OOPS")}
      <div class="sev-row">
        <span class="sev critical">${summary.critical || 0} critical</span>
        <span class="sev important">${summary.important || 0} important</span>
        <span class="sev minor">${summary.minor || 0} minor</span>
        ${isMissing(summary.passed) ? "" : `<span class="sev pass">${summary.passed} passed</span>`}
        ${isMissing(summary.skipped) ? "" : `<span class="sev skip">${summary.skipped} skipped</span>`}
      </div>
      ${pitfalls ? `<ul class="list">${pitfalls}</ul>` : '<p class="note">No failing local pitfalls.</p>'}
    </section>
  `;
}

function renderOquarePanel(panel) {
  const characteristics = (panel.characteristics || [])
    .map(
      (item) => `
        <div title="${escapeHtml(item.name)}: ${item.score} / 5">
          <span>${escapeHtml(item.name)}</span>
          <strong>${Number(item.score).toFixed(1)}</strong>
          ${bar((Number(item.score) / 5) * 100)}
        </div>
      `,
    )
    .join("");
  return `
    <section class="panel wide">
      <div class="panel-head">
        <h3>Characteristic scores</h3>
        <span class="kicker">OQuaRE</span>
      </div>
      <p class="note">Scores use OntoCheck's 1–5 static scale. 5 exceeds the published threshold.</p>
      ${characteristics ? `<div class="oquare">${characteristics}</div>` : '<p class="empty">No OQuaRE scores were produced.</p>'}
    </section>
  `;
}

function principleTip(row) {
  const info = FAIR_PRINCIPLES[row.dataset.principle];
  const passed = Number(row.dataset.passed || 0);
  const failed = Number(row.dataset.failed || 0);
  const skipped = Number(row.dataset.skipped || 0);
  const decided = passed + failed;
  const score = row.dataset.score;
  const title = info
    ? `${row.dataset.principle} · ${info.title}`
    : row.dataset.principle;
  const about = info ? info.about : "FAIR principle used by the FOOPS tests on this row.";
  const tests = info ? info.tests : "";
  const calc = decided
    ? `Score = 100 × ${passed} passed / ${decided} decided tests${score === "" ? "" : ` = ${score}%`}. ${skipped} skipped ${skipped === 1 ? "test is" : "tests are"} left out.`
    : `No test for this principle could be decided (${skipped} skipped), so the score is a dash.`;
  return `
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(about)}</p>
    ${tests ? `<p>${escapeHtml(tests)}</p>` : ""}
    <p>${escapeHtml(calc)}</p>
  `;
}

function metricTip(row) {
  const info = CORE_METRICS[row.dataset.metric];
  if (!info) return "";
  const score = row.querySelector("strong");
  return `
    <strong>${escapeHtml(row.dataset.metric)}</strong>
    <p>${escapeHtml(info.about)}</p>
    <p>${escapeHtml(info.calc)} Shown score: ${escapeHtml(score ? score.textContent : "—")}.</p>
  `;
}

const TIP_ROWS = ".metric-row[data-principle], .metric-row[data-metric]";

function rowTip(row) {
  showTip(row.dataset.principle ? principleTip(row) : metricTip(row), row.getBoundingClientRect());
}

document.addEventListener("mouseover", (event) => {
  const row = event.target.closest(TIP_ROWS);
  if (row) rowTip(row);
});
document.addEventListener("mouseout", (event) => {
  const row = event.target.closest(TIP_ROWS);
  if (!row || row.contains(event.relatedTarget)) return;
  hideTip();
});
document.addEventListener("focusin", (event) => {
  const row = event.target.closest(TIP_ROWS);
  if (row) rowTip(row);
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest(TIP_ROWS)) hideTip();
});
window.addEventListener("scroll", hideTip, true);

// ---------- competency questions ----------

const questionSearch = $("#question-search");
const questionSets = $("#question-sets");
const questionCount = $("#question-count");
const questionList = $("#question-list");
const loadMoreQuestions = $("#load-more-questions");
const showLessQuestions = $("#show-less-questions");

let competencyQuestions = [];
let visibleQuestions = [];
let selectedSet = "all";
const questionPageSize = 10;
let questionLimit = questionPageSize;

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

function renderQuestionSets() {
  const count = (domain) => competencyQuestions.filter((item) => item.domain === domain).length;
  const chip = (value, label, n) =>
    `<button type="button" class="chip" data-set="${escapeHtml(value)}" aria-pressed="${selectedSet === value}">${escapeHtml(label)}${
      competencyQuestions.length ? ` <span class="n">${n}</span>` : ""
    }</button>`;
  questionSets.innerHTML = [
    chip("all", "All", competencyQuestions.length),
    ...questionSources.map((source) => chip(source.domain, source.domain, count(source.domain))),
  ].join("");
}

function filterQuestions() {
  const searchTerm = questionSearch.value.trim().toLowerCase();
  visibleQuestions = competencyQuestions.filter((item) => {
    const matchesDomain = selectedSet === "all" || item.domain === selectedSet;
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
  questionCount.textContent = `${plural(visibleQuestions.length, "question")} found`;

  if (!displayed.length) {
    questionList.innerHTML = '<p class="empty">No competency questions match those filters.</p>';
    loadMoreQuestions.hidden = true;
    showLessQuestions.hidden = true;
    return;
  }

  questionList.innerHTML = displayed
    .map(
      (item, index) => `
        <details class="row">
          <summary>
            <span class="tag">${escapeHtml(item.code)} · CQ${String(item.number).padStart(2, "0")}</span>
            <span class="q">${escapeHtml(item.question)}</span>
          </summary>
          ${codeBlock("SPARQL query", item.query, index)}
        </details>
      `,
    )
    .join("");

  loadMoreQuestions.hidden = displayed.length >= visibleQuestions.length;
  showLessQuestions.hidden = questionLimit <= questionPageSize;
  loadMoreQuestions.textContent = `Show more (${visibleQuestions.length - displayed.length} remaining)`;
}

async function loadCompetencyQuestions() {
  renderQuestionSets();
  try {
    const sets = await Promise.all(questionSources.map(fetchQuestionSource));
    competencyQuestions = sets.flat();
    $("#stat-cq-count").textContent = competencyQuestions.length;
    renderQuestionSets();
    renderQuestions();
  } catch (error) {
    questionCount.textContent = "Question sets unavailable";
    questionList.innerHTML = `
      <p class="empty">
        The competency questions could not be loaded. Please try again later.
      </p>
    `;
    console.error(error);
  }
}

async function copyFrom(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1400);
  } catch {
    button.textContent = "Select query to copy";
  }
}

questionSets.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-set]");
  if (!button) return;
  selectedSet = button.dataset.set;
  questionLimit = questionPageSize;
  renderQuestionSets();
  renderQuestions();
});

questionSearch.addEventListener("input", () => {
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
  $("#panel-cqs").scrollIntoView({ behavior: "smooth", block: "start" });
});

questionList.addEventListener("click", (event) => {
  const button = event.target.closest(".copy-query");
  if (button) copyFrom(button, visibleQuestions[Number(button.dataset.copy)].query);
});

// ---------- tabs ----------

const tabs = ["leaderboard", "domains", "assessment", "cqs", "evaluate", "ask"];
// Older links: #benchmark was the leaderboard, #questions was the ask page.
const tabAliases = { benchmark: "leaderboard", questions: "ask" };

function showTab(name) {
  const tab = tabs.includes(name) ? name : tabAliases[name] || "leaderboard";
  tabs.forEach((item) => {
    const active = item === tab;
    $(`#panel-${item}`).hidden = !active;
    const button = $(`#tab-${item}`);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  if (tab === "leaderboard") renderProfile();
  try {
    if (location.hash !== `#${tab}`) {
      history.replaceState(null, "", `#${tab}`);
    }
  } catch {
    // Some local file views refuse history updates. The tab still changes.
  }
}

document.querySelectorAll("[data-tab], [data-tab-target]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const tab = control.dataset.tab || control.dataset.tabTarget;
    if (!tab) return;
    event.preventDefault();
    showTab(tab);
    window.scrollTo(0, 0);
  });
});

$(".tabs").addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const current = tabs.findIndex((tab) => $(`#tab-${tab}`).getAttribute("aria-selected") === "true");
  const next = tabs[(current + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  showTab(next);
  $(`#tab-${next}`).focus();
});

window.addEventListener("hashchange", () => showTab(location.hash.replace("#", "")));

// ---------- backend ----------

let backendOnline = false;

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

function postJson(path, body) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function checkBackend() {
  try {
    await api("/api/health");
    backendOnline = true;
  } catch {
    backendOnline = false;
  }
  document.querySelectorAll("[data-backend-note]").forEach((note) => {
    note.hidden = backendOnline;
    note.innerHTML =
      "The evaluation backend is not reachable from this page. GitHub Pages only shows the published benchmark. " +
      "Start it locally with <code>uvicorn backend.app:app --port 8000</code>, then open " +
      '<a href="http://127.0.0.1:8000/#ask">127.0.0.1:8000</a>.';
  });
  return backendOnline;
}

// ---------- evaluate ----------

const evalForm = $("#eval-form");
const ontologyFile = $("#ontology-file");
const evalOntology = $("#eval-ontology");
const questionOntology = $("#question-ontology");
const evalQuestionSet = $("#eval-question-set");
const domainPrefixes = $("#domain-prefixes");
const evalStatus = $("#eval-status");
const evalResults = $("#eval-results");
const runList = $("#run-list");
const runCount = $("#run-count");
const startButton = $("#start-evaluation");

let storedOntologies = [];

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
    fillOntologySelects();
    evalStatus.textContent = "The evaluation backend is not running.";
  }
}

async function uploadOntology(file, statusEl) {
  const body = new FormData();
  body.append("file", file);
  body.append("name", file.name);
  statusEl.textContent = `Uploading ${file.name}…`;
  const saved = await api("/api/ontologies", { method: "POST", body });
  await refreshOntologies(saved.id);
  statusEl.textContent = `${saved.name} is ready.`;
  return saved;
}

const runColumns = [
  {
    key: "name",
    label: "Ontology",
    cls: "l",
    value: (run) => run.ontology_name || "",
    cell: (run) => `<b>${escapeHtml(run.ontology_name || "Ontology")}</b>`,
  },
  {
    key: "checks",
    label: "Measures",
    cls: "l",
    sortable: false,
    value: () => 0,
    cell: (run) => escapeHtml((run.checks || []).join(" · ")),
  },
  {
    key: "recall",
    label: "Recall",
    value: (run) => optionalNumber(run.summary?.recall),
    cell: (run) => formatPercent(run.summary?.recall),
  },
  {
    key: "foops",
    label: "FOOPS",
    value: (run) => optionalNumber(run.summary?.foops),
    cell: (run) => (isMissing(run.summary?.foops) ? "—" : `${run.summary.foops}%`),
  },
  {
    key: "oquare",
    label: "OQuaRE",
    value: (run) => optionalNumber(run.summary?.oquare),
    cell: (run) => formatPlain(run.summary?.oquare),
  },
  {
    key: "pitfalls",
    label: "Pitfalls",
    value: (run) => (run.summary?.oops_critical || 0) * 100 + (run.summary?.oops_important || 0),
    cell: (run) => {
      const summary = run.summary || {};
      if (isMissing(summary.oops_critical) && isMissing(summary.oops_important)) return run.status === "complete" ? "—" : escapeHtml(run.status);
      return `<span class="sev critical">${summary.oops_critical || 0}</span> <span class="sev important">${summary.oops_important || 0}</span>`;
    },
  },
  {
    key: "created_at",
    label: "When",
    value: (run) => run.created_at || "",
    cell: (run) => `<time datetime="${escapeHtml(run.created_at)}">${escapeHtml(formatWhen(run.created_at))}</time>`,
  },
];
const runState = { key: "created_at", dir: "desc" };
let savedRuns = [];

function renderSavedRuns() {
  runCount.textContent = savedRuns.length ? plural(savedRuns.length, "saved evaluation") : "No saved evaluations yet.";
  if (!savedRuns.length) {
    runList.innerHTML = `<tbody><tr><td class="l"><p class="empty">Finished evaluations stay in the local database and appear here.</p></td></tr></tbody>`;
    return;
  }
  renderTable(runList, runColumns, savedRuns, runState, {
    rowAttrs: (run) => ` data-run-id="${escapeHtml(run.id)}" tabindex="0" title="Open these results"`,
  });
}

async function refreshRuns() {
  try {
    const data = await api("/api/evaluations");
    savedRuns = data.evaluations || [];
    renderSavedRuns();
  } catch {
    savedRuns = [];
    renderSavedRuns();
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
    result.foops ? renderFoopsTests(result.foops) : "",
  ].join("");
  const name = result.ontology ? result.ontology.name : "Ontology";
  evalResults.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>${escapeHtml(name)}</h2>
          <p class="meta">Evaluation results</p>
        </div>
      </div>
      <div class="detail-grid">${panels}</div>
    </div>
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

ontologyFile.addEventListener("change", async () => {
  const file = ontologyFile.files && ontologyFile.files[0];
  if (!file) return;
  try {
    await uploadOntology(file, evalStatus);
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
    const set = evalQuestionSet.value;
    const questions =
      set === "none"
        ? []
        : competencyQuestions
            .filter((item) => item.domain === set)
            .map((item) => ({
              question: item.question,
              sparql_query: item.query,
            }));
    if (set !== "none" && !questions.length) {
      evalStatus.textContent =
        "That question set is not loaded yet. The run will continue without it.";
    }
    const run = await postJson("/api/evaluations", {
      ontology_id: evalOntology.value,
      checks,
      questions,
      domain_prefixes: domainPrefixes.value.trim(),
    });
    await pollEvaluation(run.id);
  } catch (error) {
    evalStatus.textContent = error.message;
    startButton.disabled = false;
  }
});

bindSorting(runList, runState, renderSavedRuns);
runList.addEventListener("click", (event) => {
  if (event.target.closest("th")) return;
  const row = event.target.closest("tr[data-run-id]");
  if (!row) return;
  openSavedRun(row.dataset.runId).catch((error) => {
    evalStatus.textContent = error.message;
  });
});
runList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const row = event.target.closest("tr[data-run-id]");
  if (row) row.click();
});

// ---------- ask ----------

const nlQuestion = $("#nl-question");
const questionContext = $("#question-context");
const sparqlQuestion = $("#sparql-question");
const questionStatus = $("#question-status");
const askResult = $("#ask-result");
const queryResult = $("#query-result");
const intentChip = $("#intent-chip");
const retrieverOptions = $("#retriever-options");
const reasonerOptions = $("#reasoner-options");
const contextOptions = $("#context-options");
const retrieverScript = $("#retriever-script");
const queryEditor = $("#query-editor");

let pipelineOptions = { retrievers: [], reasoners: [], context: [], intents: [] };
let lastContextText = "";

function optionBadge(option) {
  if (option.requires === "planned") return "planned";
  if (option.available === false) return "needs setup";
  if (option.default) return "default";
  return "";
}

function renderOptionList(container, name, options) {
  container.innerHTML = options
    .map((option) => {
      const badge = optionBadge(option);
      const unavailable = option.requires === "planned" || option.available === false;
      return `
        <label class="option${unavailable ? " unavailable" : ""}">
          <input type="radio" name="${name}" value="${escapeHtml(option.id)}" ${option.default ? "checked" : ""} />
          <b>${escapeHtml(option.label)}</b>
          ${badge ? `<span class="badge">${badge}</span>` : "<span></span>"}
          <small>${escapeHtml(option.summary)}</small>
        </label>
      `;
    })
    .join("");
}

function renderContextOptions() {
  contextOptions.innerHTML = pipelineOptions.context
    .map(
      (option) => `
        <label class="${option.id === "same_intent" ? "sub" : ""}">
          <input type="checkbox" value="${escapeHtml(option.id)}" ${option.default ? "checked" : ""} />
          ${escapeHtml(option.label)}
        </label>
      `,
    )
    .join("");
}

function renderScripts(scripts) {
  retrieverScript.innerHTML = scripts.length
    ? scripts.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")
    : '<option value="">No script uploaded</option>';
}

function chosen(name) {
  const input = document.querySelector(`input[name='${name}']:checked`);
  return input ? input.value : "";
}

function syncParams() {
  const retriever = chosen("retriever");
  const reasoner = chosen("reasoner");
  $("#script-params").hidden = retriever !== "script";
  document.querySelector("[data-param='hops']").hidden = reasoner !== "path";
  document.querySelector("[data-param='model']").hidden = reasoner !== "agent";
  document.querySelector("[data-param='engine']").hidden = reasoner !== "owl";
  const usesQuery = retriever === "sparql" || retriever === "cypher";
  $("#query-hint").textContent =
    retriever === "cypher"
      ? "Cypher the retriever runs against Neo4j"
      : usesQuery
        ? "SPARQL the retriever runs; also used for scoring"
        : "SPARQL to score, or to run with the SPARQL retriever";
  if (usesQuery) queryEditor.open = true;
}

async function loadPipelineOptions() {
  try {
    pipelineOptions = await api("/api/pipeline");
  } catch {
    try {
      pipelineOptions = await (await fetch("pipeline-options.json")).json();
    } catch {
      return;
    }
  }
  renderOptionList(retrieverOptions, "retriever", pipelineOptions.retrievers);
  renderOptionList(reasonerOptions, "reasoner", pipelineOptions.reasoners);
  renderContextOptions();
  renderScripts(pipelineOptions.scripts || []);
  syncParams();
  renderMemory();
}

function contextConfig() {
  const config = {};
  contextOptions.querySelectorAll("input[type='checkbox']").forEach((input) => {
    config[input.value] = input.checked;
  });
  config.saved_k = Number($("#context-saved-k").value) || 0;
  config.max_chars = Number($("#context-max").value) || 6000;
  config.notes_text = questionContext.value;
  return config;
}

function pipelineConfig() {
  return {
    retriever: {
      id: chosen("retriever") || "ann",
      k: Number($("#retriever-k").value) || 8,
      script_id: retrieverScript.value || undefined,
    },
    reasoner: {
      id: chosen("reasoner") || "path",
      hops: Number($("#reasoner-hops").value) || 3,
      model: $("#reasoner-model").value.trim(),
      engine: $("#reasoner-engine").value,
    },
    context: contextConfig(),
  };
}

function intentLabel(id) {
  const found = (pipelineOptions.intents || []).find((intent) => intent.id === id);
  return found ? found.label : id || "Unlabelled";
}

function intentTag(id) {
  return `<span class="intent${!id || id === "other" ? " other" : ""}">${escapeHtml(intentLabel(id))}</span>`;
}

function renderAsk(result) {
  const hits = result.retrieved || [];
  const reasoning = result.reasoning || { kind: "none", items: [] };
  const context = result.context || { sections: [], text: "", chars: 0 };
  lastContextText = context.text || "";
  const answer =
    reasoning.kind === "answer"
      ? `<section><div class="card-head"><h2>Answer</h2><span class="meta">${escapeHtml(reasoning.model || "")}</span></div><div class="answer">${escapeHtml(reasoning.text || "No answer.")}</div></section>`
      : "";
  const hitRows = hits
    .map(
      (hit) => `
        <tr>
          <td class="l"><b>${escapeHtml(hit.label)}</b>${hit.iri ? `<br /><span class="why mono">${escapeHtml(hit.iri)}</span>` : ""}</td>
          <td class="l kind">${escapeHtml(hit.kind)}</td>
          <td><span class="score-cell"><span class="num">${hit.score.toFixed(2)}</span>${bar(hit.score * 100)}</span></td>
          <td class="l why">${escapeHtml(hit.why)}</td>
        </tr>
      `,
    )
    .join("");
  const reasoningItems = (reasoning.items || [])
    .map(
      (item) => `
        <li>
          <span class="tag">${item.rule ? escapeHtml(item.rule.split(" ")[0]) : `${item.hops} hop${item.hops === 1 ? "" : "s"}`}</span>
          <span class="p" ${item.rule ? `title="${escapeHtml(item.rule)}"` : ""}>${escapeHtml(item.text)}</span>
        </li>
      `,
    )
    .join("");
  const reasoningTitle = { paths: "Paths", inferences: "Inferred facts" }[reasoning.kind];
  const sections = (context.sections || [])
    .map(
      (section) => `
        <details class="ctx-section">
          <summary><span>${escapeHtml(section.title)}${section.truncated ? " · cut to fit" : ""}</span><span class="meta">${section.text.length.toLocaleString()} chars</span></summary>
          <pre>${escapeHtml(section.text)}</pre>
        </details>
      `,
    )
    .join("");

  askResult.innerHTML = `
    <div class="card result-card">
      ${answer}
      <section>
        <div class="card-head">
          <h2>Retrieved ${intentTag(result.intent?.intent)}</h2>
          <span class="meta">${plural(hits.length, "term")}</span>
        </div>
        ${
          hits.length
            ? `<div class="table-scroll"><table class="board compact hits"><thead><tr><th class="l">Term</th><th class="l">Kind</th><th>Score</th><th class="l">Why</th></tr></thead><tbody>${hitRows}</tbody></table></div>`
            : '<p class="empty">Nothing matched. Try another retriever or rephrase the question.</p>'
        }
      </section>
      ${
        reasoningTitle
          ? `<section><div class="card-head"><h2>${reasoningTitle}</h2><span class="meta">${plural((reasoning.items || []).length, "result")}</span></div>${
              reasoningItems ? `<ul class="paths">${reasoningItems}</ul>` : '<p class="empty">The reasoner found nothing that links these terms.</p>'
            }</section>`
          : ""
      }
      <section>
        <div class="card-head">
          <h2>Context</h2>
          <span class="meta">${(context.chars || 0).toLocaleString()} chars · used by Translate</span>
        </div>
        ${sections || '<p class="empty">No context sections are switched on.</p>'}
      </section>
    </div>
  `;
}

function renderQueryReport(report) {
  const aggregate = report.aggregate || {};
  const queryCount = aggregate.query_count || (report.queries || []).length;
  const rows = (report.queries || [])
    .map(
      (query) => `
        <div class="query-score">
          <span>${escapeHtml(query.nl_text || "SPARQL query")}</span>
          <span class="scores">
            <span>Recall <b>${formatPercent(query.recall)}</b></span>
            <span>Precision <b>${formatPercent(query.precision)}</b></span>
            <span>${query.bindings && query.bindings.ok ? plural(query.bindings.count, "binding") : "query did not execute"}</span>
          </span>
          ${query.error ? `<p class="note warn">${escapeHtml(query.error)}</p>` : ""}
        </div>
      `,
    )
    .join("");
  queryResult.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>${formatPercent(aggregate.recall)} recall · ${formatPercent(aggregate.precision)} precision</h2>
          <p class="meta">
            Combined over ${queryCount} ${queryCount === 1 ? "query" : "queries"}.
            ${aggregate.intersection ?? "—"} shared terms.
          </p>
        </div>
      </div>
      ${rows}
    </div>
  `;
}

function requireGraph() {
  if (questionOntology.value) return true;
  questionStatus.textContent = "Upload a knowledge graph first.";
  return false;
}

$("#ask-run").addEventListener("click", async () => {
  if (!requireGraph()) return;
  if (!nlQuestion.value.trim()) {
    questionStatus.textContent = "Enter a question.";
    return;
  }
  const button = $("#ask-run");
  button.disabled = true;
  questionStatus.textContent = "Retrieving and reasoning…";
  try {
    const result = await postJson("/api/ask", {
      ontology_id: questionOntology.value,
      nl_text: nlQuestion.value,
      query: sparqlQuestion.value,
      ...pipelineConfig(),
    });
    renderAsk(result);
    showIntent(result.intent);
    questionStatus.textContent = "Saved to the question log.";
    refreshMemory();
  } catch (error) {
    questionStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$("#translate-question").addEventListener("click", async () => {
  if (!requireGraph()) return;
  if (!nlQuestion.value.trim()) {
    questionStatus.textContent = "Enter a natural-language question.";
    return;
  }
  questionStatus.textContent = "Translating…";
  try {
    const data = await postJson("/api/questions/translate", {
      ontology_id: questionOntology.value,
      nl_text: nlQuestion.value,
      context: lastContextText || questionContext.value,
    });
    sparqlQuestion.value = data.sparql;
    queryEditor.open = true;
    const translator = data.provider ? `${data.provider} / ${data.model}` : data.model;
    questionStatus.textContent = `Translated with ${translator}${lastContextText ? " using the context above" : ""}. Score the query to save it.`;
    refreshMemory();
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

async function runQuestion(path) {
  if (!requireGraph()) return;
  questionStatus.textContent = "Scoring queries…";
  const { retriever, reasoner, context } = pipelineConfig();
  const report = await postJson(path, {
    ontology_id: questionOntology.value,
    nl_text: nlQuestion.value,
    sparql: sparqlQuestion.value,
    pipeline: { retriever, reasoner, context: { ...context, notes_text: undefined } },
  });
  renderQueryReport(report);
  await refreshMemory();
  questionStatus.textContent = "Saved to the question log.";
}

$("#evaluate-question").addEventListener("click", () => {
  runQuestion("/api/questions/evaluate").catch((error) => {
    questionStatus.textContent = error.message;
  });
});

$("#context-evaluate").addEventListener("click", () => {
  runQuestion("/api/questions/context-evaluate").catch((error) => {
    questionStatus.textContent = error.message;
  });
});

function showIntent(intent) {
  if (!intent || !nlQuestion.value.trim()) {
    intentChip.hidden = true;
    return;
  }
  intentChip.hidden = false;
  intentChip.className = `intent${intent.intent === "other" ? " other" : ""}`;
  intentChip.textContent = `Intent: ${intentLabel(intent.intent)}`;
  intentChip.title = intent.cue ? `Matched “${intent.cue}”` : "No intent cue matched";
}

let intentTimer;
nlQuestion.addEventListener("input", () => {
  window.clearTimeout(intentTimer);
  if (!backendOnline) return;
  intentTimer = window.setTimeout(async () => {
    try {
      showIntent(await postJson("/api/intent", { text: nlQuestion.value }));
    } catch {
      intentChip.hidden = true;
    }
  }, 350);
});

[retrieverOptions, reasonerOptions].forEach((group) => group.addEventListener("change", syncParams));

$("#ask-kg-file").addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    await uploadOntology(file, questionStatus);
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

$("#retriever-file").addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const body = new FormData();
  body.append("file", file);
  questionStatus.textContent = `Uploading ${file.name}…`;
  try {
    const saved = await api("/api/retrievers", { method: "POST", body });
    const data = await api("/api/pipeline");
    renderScripts(data.scripts || []);
    retrieverScript.value = saved.id;
    questionStatus.textContent = `${saved.name} is ready.`;
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

// ---------- question log ----------

const memoryList = $("#memory-list");
const memoryCount = $("#memory-count");
const memorySearch = $("#memory-search");
const intentFilter = $("#intent-filter");
let storedQuestions = [];
let selectedIntent = "all";
let visibleMemory = [];

async function refreshMemory() {
  try {
    const data = await api("/api/questions");
    storedQuestions = data.questions;
    renderMemory();
  } catch {
    memoryCount.textContent = "The question log is available when the backend is running.";
  }
}

function renderIntentFilter() {
  const counts = {};
  storedQuestions.forEach((question) => {
    const key = question.intent || "other";
    counts[key] = (counts[key] || 0) + 1;
  });
  const chip = (id, label, n) =>
    `<button type="button" class="chip" data-intent="${escapeHtml(id)}" aria-pressed="${selectedIntent === id}">${escapeHtml(label)} <span class="n">${n}</span></button>`;
  const known = (pipelineOptions.intents || []).filter((intent) => counts[intent.id]);
  intentFilter.innerHTML = storedQuestions.length
    ? [chip("all", "All intents", storedQuestions.length), ...known.map((intent) => chip(intent.id, intent.label, counts[intent.id]))].join("")
    : "";
  intentFilter.hidden = !storedQuestions.length;
}

function pipelineSummary(pipeline) {
  if (!pipeline) return "";
  const parts = [pipeline.retriever?.id, pipeline.reasoner?.id].filter(Boolean);
  return parts.length ? parts.join(" → ") : "";
}

function renderMemory() {
  renderIntentFilter();
  const term = memorySearch.value.trim().toLowerCase();
  visibleMemory = storedQuestions.filter(
    (question) =>
      (selectedIntent === "all" || (question.intent || "other") === selectedIntent) &&
      (!term ||
        question.nl_text.toLowerCase().includes(term) ||
        (question.sparql || "").toLowerCase().includes(term)),
  );
  if (!storedQuestions.length) {
    memoryList.innerHTML = '<p class="empty">Questions you ask appear here.</p>';
    return;
  }
  memoryCount.textContent = `${plural(visibleMemory.length, "saved question")}${visibleMemory.length === storedQuestions.length ? "" : ` of ${storedQuestions.length}`}`;
  if (!visibleMemory.length) {
    memoryList.innerHTML = '<p class="empty">No saved questions match that search.</p>';
    return;
  }
  memoryList.innerHTML = `
    <div class="row-head memory-row" aria-hidden="true">
      <span>Intent</span><span>Question</span><span>Recall</span><span>Precision</span><span></span>
    </div>
  ` + visibleMemory
    .map((question, index) => {
      const meta = [question.source, pipelineSummary(question.pipeline), formatWhen(question.created_at)].filter(Boolean).join(" · ");
      return `
        <details class="row memory-row">
          <summary>
            ${intentTag(question.intent)}
            <span class="q">${escapeHtml(question.nl_text)}<small>${escapeHtml(meta)}</small></span>
            <span class="num" title="Recall">${formatPercent(question.recall)}</span>
            <span class="num" title="Precision">${formatPercent(question.precision)}</span>
          </summary>
          ${
            question.sparql
              ? codeBlock("SPARQL query", question.sparql, index)
              : '<p class="note no-sparql">No SPARQL yet. Translate the question or score a query to attach one.</p>'
          }
        </details>
      `;
    })
    .join("");
}

memorySearch.addEventListener("input", renderMemory);

intentFilter.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-intent]");
  if (!button) return;
  selectedIntent = button.dataset.intent;
  renderMemory();
});

memoryList.addEventListener("click", (event) => {
  const button = event.target.closest(".copy-query");
  if (button) copyFrom(button, visibleMemory[Number(button.dataset.copy)].sparql);
});

$("#export-questions").addEventListener("click", () => {
  const rows = visibleMemory.length ? visibleMemory : storedQuestions;
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ontocheck-questions${selectedIntent === "all" ? "" : `-${selectedIntent}`}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// ---------- start ----------

renderBoard();
renderProfileChips();
loadFrameworkBenchmarks();
loadAssessment();
const competencyQuestionsReady = loadCompetencyQuestions();
populateEvalQuestionSets();
showTab(location.hash.replace("#", ""));
checkBackend().then((online) => {
  loadPipelineOptions();
  if (!online) {
    fillOntologySelects();
    renderSavedRuns();
    runCount.textContent = "Saved evaluations appear after the backend is running.";
    memoryCount.textContent = "The question log is available when the backend is running.";
    evalStatus.textContent = "The evaluation backend is not running.";
    return;
  }
  refreshOntologies();
  refreshRuns();
  refreshMemory();
});
