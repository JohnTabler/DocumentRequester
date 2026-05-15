/* ============================================================
   SDCCD Document Request — app.js
   Handles: data loading, cascading filters, checklist, form
   ============================================================ */

(function () {
  "use strict";

// ── EmailJS Config ─────────────────────────────────────────
  const EMAILJS_PUBLIC_KEY      = "MZ9UQ4CwdKnUxbBmB";
  const EMAILJS_SERVICE_ID      = "service_neenpj9";
  const EMAILJS_APPROVER_TMPL   = "template_s9epbca";
  const EMAILJS_CONFIRM_TMPL    = "template_pmo4jg8";
  const APPROVER_EMAIL          = "johntabler@gmail.com";

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

    // ── Campus Display Names ───────────────────────────────────
  const CAMPUS_NAMES = {
    "01-City":          "City College",
    "02-Mesa":          "Mesa College",
    "03-Miramar":       "Miramar College",
    "04-CE-Chavez":     "Continuing Education – César Chávez",
    "04-CE-ECC":        "Continuing Education – Educational Cultural Complex",
    "04-CE-MC":         "Continuing Education – Mid-City",
    "04-CE-Mesa":       "Continuing Education – Mesa",
    "04-CE-Miramar":    "Continuing Education – Miramar",
    "04-CE-WC":         "Continuing Education – West City",
    "05-District":      "District Office",
    "06-District Wide": "District Wide",
    "06-Other":         "Other",
    "07-Other":         "Other"
  };

  // ── State ──────────────────────────────────────────────────
  let allDocuments = [];
  let filteredDocuments = [];
  let selectedDocuments = new Set();

  // ── DOM References ─────────────────────────────────────────
  const filterCampus    = document.getElementById("filter-campus");
  const filterBuilding  = document.getElementById("filter-building");
  const filterProject   = document.getElementById("filter-project");
  const filterDoctype   = document.getElementById("filter-doctype");

  const btnSearch       = document.getElementById("btn-search");
  const btnReset        = document.getElementById("btn-reset");
  const btnSelectAll    = document.getElementById("btn-select-all");
  const btnDeselectAll  = document.getElementById("btn-deselect-all");
  const btnSubmit       = document.getElementById("btn-submit");
  const btnNewRequest   = document.getElementById("btn-new-request");

  const resultsEmpty    = document.getElementById("results-empty");
  const resultsNone     = document.getElementById("results-none");
  const resultsList     = document.getElementById("results-list");
  const resultsCount    = document.getElementById("results-count");
  const checklist       = document.getElementById("document-checklist");

  const selectedSummary = document.getElementById("selected-summary");
  const selectedList    = document.getElementById("selected-list");
  const validationMsg       = document.getElementById("form-validation-msg");
  const searchValidationMsg = document.getElementById("search-validation-msg");

  const sectionConfirm  = document.getElementById("section-confirmation");
  const sectionForm     = document.getElementById("section-form");
  const sectionResults  = document.getElementById("section-results");
  const sectionFilters  = document.getElementById("section-filters");

  const reqName         = document.getElementById("req-name");
  const reqEmail        = document.getElementById("req-email");
  const reqOrg          = document.getElementById("req-org");
  const reqMessage      = document.getElementById("req-message");

  const footerYear      = document.getElementById("footer-year");

  // ── Init ───────────────────────────────────────────────────
  footerYear.textContent = new Date().getFullYear();

  const DATA_URL = "https://raw.githubusercontent.com/JohnTabler/DocumentRequester/main/data/DataTest.json";

fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load documents.json");
      return res.json();
    })
    .then((data) => {
      allDocuments = data;
      populateTopLevelFilters();
      bindFilterCascade();
    })
    .catch((err) => {
      console.error("Data load error:", err);
      resultsEmpty.textContent =
        "Unable to load document data. Please refresh the page or contact support.";
    });

  // ── Populate top-level filter dropdowns (Campus, DocType) ──
  function populateTopLevelFilters() {
    populateSelect(filterCampus, uniqueSorted(allDocuments, "campus", CAMPUS_NAMES), "— All Campuses —", CAMPUS_NAMES);
    filterBuilding.disabled = true;
    filterProject.disabled  = true;
    filterDoctype.disabled  = true;
    btnSearch.classList.add("btn-disabled");
  }

  // ── Cascading filter logic ─────────────────────────────────
  function bindFilterCascade() {
    filterCampus.addEventListener("change", onCampusChange);
    filterBuilding.addEventListener("change", onBuildingChange);
    filterProject.addEventListener("change", onProjectChange);
  }

  function onCampusChange() {
    const campus = filterCampus.value;

    // Reset + disable all downstream
    filterBuilding.value = "";
    filterProject.value  = "";
    filterDoctype.value  = "";
    filterProject.disabled  = true;
    filterDoctype.disabled  = true;

    if (!campus) {
      filterBuilding.disabled = true;
      btnSearch.classList.add("btn-disabled");
      populateSelect(filterBuilding, [], "— All Buildings —");
      return;
    }

    const subset = allDocuments.filter((d) => d.campus === campus);
    populateSelect(filterBuilding, uniqueSorted(subset, "building"), "— All Buildings —");
    filterBuilding.disabled = false;
  }

  function onBuildingChange() {
    const campus   = filterCampus.value;
    const building = filterBuilding.value;

    // Reset downstream
    filterProject.value = "";
    filterDoctype.value = "";

    if (!building) {
      filterProject.disabled = true;
      filterDoctype.disabled = true;
      btnSearch.classList.add("btn-disabled");
      populateSelect(filterProject, [], "— All Projects —");
      populateSelect(filterDoctype, [], "— All Types —");
      return;
    }

    const subset = allDocuments.filter((d) => d.campus === campus && d.building === building);
    populateSelect(filterProject, uniqueSorted(subset, "project"), "— All Projects —");
    populateSelect(filterDoctype, uniqueSorted(subset, "documentType"), "— All Types —");
    filterProject.disabled = false;
    filterDoctype.disabled = false;
    btnSearch.classList.remove("btn-disabled");
  }

  function onProjectChange() {
    const campus   = filterCampus.value;
    const building = filterBuilding.value;
    const project  = filterProject.value;

    filterDoctype.value = "";

    const subset = project
      ? allDocuments.filter((d) => d.campus === campus && d.building === building && d.project === project)
      : allDocuments.filter((d) => d.campus === campus && d.building === building);

    populateSelect(filterDoctype, uniqueSorted(subset, "documentType"), "— All Types —");
  }

  // ── Search ─────────────────────────────────────────────────
  btnSearch.addEventListener("click", runSearch);

  function runSearch() {
    if (btnSearch.classList.contains("btn-disabled")) {
      searchValidationMsg.textContent = "Please select a Campus and Building before searching.";
      searchValidationMsg.classList.remove("hidden");
      return;
    }
    searchValidationMsg.classList.add("hidden");
    const campus   = filterCampus.value;
    const building = filterBuilding.value;
    const project  = filterProject.value;
    const doctype  = filterDoctype.value;

    filteredDocuments = allDocuments.filter((doc) => {
      if (campus   && doc.campus        !== campus)   return false;
      if (building && doc.building      !== building) return false;
      if (project  && doc.project       !== project)  return false;
      if (doctype  && doc.documentType  !== doctype)  return false;
      return true;
    });

    renderResults();
  }

  function renderResults() {
    // Reset selections when results change
    selectedDocuments.clear();
    updateSelectedSummary();

    resultsEmpty.classList.add("hidden");

    if (filteredDocuments.length === 0) {
      resultsNone.classList.remove("hidden");
      resultsList.classList.add("hidden");
      resultsCount.textContent = "";
      return;
    }

    resultsNone.classList.add("hidden");
    resultsList.classList.remove("hidden");
    resultsCount.textContent = `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? "s" : ""} found`;

    checklist.innerHTML = "";
    filteredDocuments.forEach((doc, idx) => {
      const li = document.createElement("li");
      li.dataset.idx = idx;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id   = `doc-${idx}`;
      cb.addEventListener("change", () => toggleDocument(doc, cb.checked, li));

      const info = document.createElement("div");
      info.className = "doc-info";

      const name = document.createElement("span");
      name.className = "doc-name";
      name.textContent = doc.name;

      const meta = document.createElement("span");
      meta.className = "doc-meta";
      const parts = [doc.documentType, doc.project, doc.campus].filter((v) => v && v !== "Other");
      meta.textContent = parts.join(" · ");

      info.appendChild(name);
      info.appendChild(meta);
      li.appendChild(cb);
      li.appendChild(info);

      // Click anywhere on row to toggle
      li.addEventListener("click", (e) => {
        if (e.target !== cb) cb.click();
      });

      checklist.appendChild(li);
    });
  }

  function toggleDocument(doc, checked, li) {
    if (checked) {
      selectedDocuments.add(doc.name);
      li.classList.add("selected");
    } else {
      selectedDocuments.delete(doc.name);
      li.classList.remove("selected");
    }
    updateSelectedSummary();
  }

  // ── Select / Deselect All ──────────────────────────────────
  btnSelectAll.addEventListener("click", () => {
    checklist.querySelectorAll("input[type=checkbox]").forEach((cb, i) => {
      cb.checked = true;
      cb.closest("li").classList.add("selected");
      selectedDocuments.add(filteredDocuments[i].name);
    });
    updateSelectedSummary();
  });

  btnDeselectAll.addEventListener("click", () => {
    checklist.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.checked = false;
      cb.closest("li").classList.remove("selected");
    });
    selectedDocuments.clear();
    updateSelectedSummary();
  });

  // ── Reset Filters ──────────────────────────────────────────
  btnReset.addEventListener("click", () => {
    filterCampus.value   = "";
    filterBuilding.value = "";
    filterProject.value  = "";
    filterDoctype.value  = "";
    filterBuilding.disabled = true;
    filterProject.disabled  = true;
    filterDoctype.disabled  = true;
    btnSearch.classList.add("btn-disabled");

    filteredDocuments = [];
    selectedDocuments.clear();

    resultsEmpty.classList.remove("hidden");
    resultsNone.classList.add("hidden");
    resultsList.classList.add("hidden");
    resultsCount.textContent = "";
    updateSelectedSummary();
  });

  // ── Selected Summary ───────────────────────────────────────
  function updateSelectedSummary() {
    if (selectedDocuments.size === 0) {
      selectedSummary.classList.add("hidden");
      return;
    }
    selectedSummary.classList.remove("hidden");
    selectedList.innerHTML = "";
    selectedDocuments.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      selectedList.appendChild(li);
    });
  }

  // ── Form Submit ────────────────────────────────────────────
  btnSubmit.addEventListener("click", handleSubmit);

  function handleSubmit() {
    clearValidation();

    const name  = reqName.value.trim();
    const email = reqEmail.value.trim();
    const errors = [];

    if (!name)  { errors.push("Full name is required."); reqName.classList.add("invalid"); }
    if (!email) { errors.push("Email address is required."); reqEmail.classList.add("invalid"); }
    else if (!isValidEmail(email)) { errors.push("Please enter a valid email address."); reqEmail.classList.add("invalid"); }
    if (selectedDocuments.size === 0) errors.push("Please select at least one document.");

    if (errors.length > 0) {
      validationMsg.innerHTML = errors.map((e) => `<div>${e}</div>`).join("");
      validationMsg.classList.remove("hidden");
      return;
    }

    // ── Build document list for email ──────────────────────────
    const docDetails = Array.from(selectedDocuments).map((docName) => {
      const doc = allDocuments.find((d) => d.name === docName);
      const meta = doc
        ? [
            doc.campus   ? `Campus: ${CAMPUS_NAMES[doc.campus] || doc.campus}` : null,
            doc.building ? `Building: ${doc.building}` : null,
            doc.project  ? `Project: ${doc.project}`  : null,
          ].filter(Boolean).join(" · ")
        : null;
      return meta ? `• ${docName}\n  ${meta}` : `• ${docName}`;
    }).join("\n");

    const templateParams = {
      requester_name:    name,
      requester_email:   email,
      requester_org:     reqOrg.value.trim() || "Not provided",
      requester_message: reqMessage.value.trim() || "None",
      document_list:     docDetails,
    };

    // ── Loading state ──────────────────────────────────────────
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Sending…";

    // ── Send both emails ───────────────────────────────────────
    Promise.all([
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_APPROVER_TMPL, {
        ...templateParams,
        to_email: APPROVER_EMAIL,
      }),
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CONFIRM_TMPL, {
        ...templateParams,
        to_email: email,
      }),
    ])
      .then(() => {
        showConfirmation();
      })
      .catch((err) => {
        console.error("EmailJS error:", err);
        validationMsg.innerHTML = "<div>There was a problem sending your request. Please try again or contact us directly.</div>";
        validationMsg.classList.remove("hidden");
      })
      .finally(() => {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Submit Request";
      });
  }

  function showConfirmation() {
    sectionFilters.classList.add("hidden");
    sectionResults.classList.add("hidden");
    sectionForm.classList.add("hidden");
    sectionConfirm.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  btnNewRequest.addEventListener("click", () => {
    // Reset everything
    sectionConfirm.classList.add("hidden");
    sectionFilters.classList.remove("hidden");
    sectionResults.classList.remove("hidden");
    sectionForm.classList.remove("hidden");

    filterCampus.value = "";
    filterBuilding.value = "";
    filterProject.value = "";
    filterDoctype.value = "";
    filterBuilding.disabled = true;
    filterProject.disabled  = true;
    filterDoctype.disabled  = true;
    btnSearch.classList.add("btn-disabled");

    reqName.value = "";
    reqEmail.value = "";
    reqOrg.value = "";
    reqMessage.value = "";

    filteredDocuments = [];
    selectedDocuments.clear();

    resultsEmpty.classList.remove("hidden");
    resultsNone.classList.add("hidden");
    resultsList.classList.add("hidden");
    resultsCount.textContent = "";
    updateSelectedSummary();
    clearValidation();

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ── Helpers ────────────────────────────────────────────────
  function populateSelect(selectEl, values, placeholder, labelMap = {}) {
    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = labelMap[v] || v;
      selectEl.appendChild(opt);
    });
    restoreValue(selectEl, current);
  }

  function restoreValue(selectEl, value) {
    if (value && [...selectEl.options].some((o) => o.value === value)) {
      selectEl.value = value;
    }
  }

  function uniqueSorted(arr, key, labelMap = {}) {
    const values = arr.map((d) => d[key]).filter(Boolean);
    const seen = new Set();
    const deduped = [];
    values.forEach((v) => {
      const label = labelMap[v] || v;
      if (!seen.has(label)) {
        seen.add(label);
        deduped.push(v);
      }
    });
    return deduped.sort((a, b) => (labelMap[a] || a).localeCompare(labelMap[b] || b));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function clearValidation() {
    validationMsg.classList.add("hidden");
    validationMsg.innerHTML = "";
    [reqName, reqEmail].forEach((el) => el.classList.remove("invalid"));
  }
})();