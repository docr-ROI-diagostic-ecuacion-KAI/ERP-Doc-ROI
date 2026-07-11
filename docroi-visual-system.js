(function(){
  const VERSION = "20260712-institution-identity";
  if (globalThis.__docroiVisualSystem === VERSION) return;
  globalThis.__docroiVisualSystem = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  if (!cfgs || !globalThis.state) return;

  const defaults = ["#7a1f3d", "#0d5f93", "#2e6b4f", "#6d5a1f", "#5a3b8a", "#7a3b22"];

  function fieldsOf(module){ return cfgs[module]?.fields || []; }
  function insertField(module, field, after){
    const fields = fieldsOf(module);
    if (!fields.length || fields.some(f => f[0] === field[0])) return;
    const idx = fields.findIndex(f => f[0] === after);
    fields.splice(idx >= 0 ? idx + 1 : fields.length, 0, field);
  }

  insertField("institutions", ["brandColor", "Color visual de la institucion", "color"], "logoFile");
  (state.institutions || []).forEach((institution, index) => {
    institution.brandColor ||= defaults[index % defaults.length];
  });
  try { save(); } catch { try { saveState(); } catch {} }

  function hexToRgb(hex){
    const clean = String(hex || "").replace("#", "");
    if (clean.length !== 6) return [13, 95, 147];
    return [parseInt(clean.slice(0,2),16), parseInt(clean.slice(2,4),16), parseInt(clean.slice(4,6),16)];
  }

  function tintVars(color){
    const [r,g,b] = hexToRgb(color);
    return {
      color: `rgba(${r}, ${g}, ${b}, 0.86)`,
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      bgStrong: `rgba(${r}, ${g}, ${b}, 0.23)`
    };
  }

  function programFor(module, record){
    if (!record) return null;
    if (module === "programs") return record;
    if (record.programId) return (state.programs || []).find(p => p.id === record.programId) || null;
    if (record.sessionId) {
      const session = (state.sessions || []).find(s => s.id === record.sessionId);
      return session ? (state.programs || []).find(p => p.id === session.programId) || null : null;
    }
    if (record.evaluationId) {
      const evaluation = (state.evaluations || []).find(e => e.id === record.evaluationId);
      return evaluation ? (state.programs || []).find(p => p.id === evaluation.programId) || null : null;
    }
    if (record.financeId) {
      const finance = (state.finances || []).find(f => f.id === record.financeId);
      return finance ? (state.programs || []).find(p => p.id === finance.programId) || null : null;
    }
    if (module === "documents" && Array.isArray(record.sessionIds) && record.sessionIds.length) {
      const session = (state.sessions || []).find(s => s.id === record.sessionIds[0]);
      return session ? (state.programs || []).find(p => p.id === session.programId) || null : null;
    }
    return null;
  }

  function institutionFor(module, record){
    if (!record) return null;
    if (module === "institutions") return record;
    if (record.institutionId) return (state.institutions || []).find(i => i.id === record.institutionId) || null;
    const program = programFor(module, record);
    if (program?.institutionId) return (state.institutions || []).find(i => i.id === program.institutionId) || null;
    return null;
  }

  function logoHtml(institution){
    if (!institution) return "";
    const name = institution.name || "Institucion";
    if (institution.logoFileData) return `<img class="institution-mini-logo" src="${institution.logoFileData}" alt="${name}" />`;
    const initials = String(name).split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    return `<span class="institution-mini-logo institution-mini-placeholder">${initials || "IN"}</span>`;
  }

  function miniBrandHtml(institution){
    if (!institution) return "";
    return `<span class="institution-mini-brand">${logoHtml(institution)}<span>${institution.name || "Institucion"}</span></span>`;
  }

  function allInstitutionalRecords(){
    const modulesToScan = ["institutions", "programs", "sessions", "documents", "evaluations", "finances", "calendar", "alerts", "contacts", "organization"];
    return modulesToScan.flatMap(module => (state[module] || []).map(record => ({ module, record, institution: institutionFor(module, record) })).filter(item => item.institution));
  }

  function inferInstitutionFromText(text){
    const clean = String(text || "").toLowerCase();
    if (!clean) return null;
    const direct = (state.institutions || []).find(institution => clean.includes(String(institution.name || "").toLowerCase()));
    if (direct) return direct;
    const records = allInstitutionalRecords().sort((a, b) => String(b.record.title || b.record.name || b.record.concept || "").length - String(a.record.title || a.record.name || a.record.concept || "").length);
    const hit = records.find(({ record }) => {
      const title = String(record.title || record.name || record.concept || "").toLowerCase();
      return title && title.length > 5 && clean.includes(title);
    });
    return hit?.institution || null;
  }

  function applyVars(node, institution){
    if (!node || !institution) return;
    const vars = tintVars(institution.brandColor);
    node.style.setProperty("--inst-color", vars.color);
    node.style.setProperty("--inst-bg", vars.bg);
    node.style.setProperty("--inst-bg-strong", vars.bgStrong);
  }

  function decorateRecords(){
    document.querySelectorAll("[data-detail-module][data-detail-id], [data-edit-module][data-edit-id]").forEach(button => {
      const module = button.dataset.detailModule || button.dataset.editModule;
      const id = button.dataset.detailId || button.dataset.editId;
      const record = (state[module] || []).find(item => item.id === id);
      const institution = institutionFor(module, record);
      const surface = button.closest(".record-card,.list-row,.calendar-chip,.month-row,.income-line,.predictive-row,.finance-tracking-row,.detail-dialog,.mini-checklist li") || button;
      applyVars(surface, institution);
      addMiniBrand(surface, institution);
    });

    document.querySelectorAll(".chart-row,.visual-chip").forEach(row => {
      const label = row.querySelector("span")?.textContent || "";
      const program = (state.programs || []).find(p => label.includes(p.name));
      const institution = program ? (state.institutions || []).find(i => i.id === program.institutionId) : null;
      applyVars(row, institution);
      addMiniBrand(row, institution);
    });

    document.querySelectorAll(".record-card,.list-row,.calendar-chip,.month-row,.income-line,.predictive-row,.finance-tracking-row,.mini-checklist li").forEach(surface => {
      if (surface.style.getPropertyValue("--inst-color")) return;
      const institution = inferInstitutionFromText(surface.textContent);
      applyVars(surface, institution);
      addMiniBrand(surface, institution);
    });
  }

  function addMiniBrand(surface, institution){
    if (!surface || !institution || surface.querySelector(".institution-mini-brand")) return;
    if (surface.matches(".record-card") && surface.querySelector(".institution-logo,.inherited-logo")) return;
    surface.insertAdjacentHTML("afterbegin", miniBrandHtml(institution));
  }

  function decorateDetailDialog(){
    const dialog = document.querySelector("#detailDialog");
    if (!dialog?.open) return;
    const title = document.querySelector("#detailTitle")?.textContent || "";
    const body = document.querySelector("#detailContent")?.textContent || "";
    const institution = inferInstitutionFromText(`${title} ${body}`);
    const card = dialog.querySelector(".detail-dialog");
    applyVars(card, institution);
    addMiniBrand(card, institution);
  }

  function addDashboardChips(){
    const hero = document.querySelector(".dashboard-hero");
    if (hero) hero.remove();

    document.querySelectorAll(".chart-card").forEach(card => {
      if (card.querySelector(".visual-chip-row")) return;
      const rows = [...card.querySelectorAll(".chart-row")];
      if (!rows.length) return;
      const chipRow = document.createElement("div");
      chipRow.className = "visual-chip-row";
      rows.forEach(row => {
        const chip = document.createElement("span");
        chip.className = "visual-chip";
        chip.innerHTML = row.innerHTML;
        chip.style.cssText = row.style.cssText;
        chipRow.appendChild(chip);
        row.style.display = "none";
      });
      card.appendChild(chipRow);
    });
  }

  function enhanceInstitutionColorPicker(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open) return;
    const kicker = document.querySelector("#dialogKicker")?.textContent || "";
    if (!/Instituciones/i.test(kicker)) return;
    const input = dialog.querySelector('input[name="brandColor"][type="color"]');
    if (!input || input.closest(".color-picker-shell")) return;
    const label = input.closest("label");
    if (!label) return;
    const shell = document.createElement("div");
    shell.className = "color-picker-shell";
    shell.innerHTML = `<div class="color-picker-head"><strong>Color visual de la institucion</strong><span>Se aplicara a programas, sesiones, calendario, alertas y finanzas.</span></div><div class="color-swatch-row"></div>`;
    const row = shell.querySelector(".color-swatch-row");
    defaults.forEach(color => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.style.setProperty("--swatch", color);
      button.setAttribute("aria-label", `Elegir color ${color}`);
      button.addEventListener("click", () => {
        input.value = color;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      row.appendChild(button);
    });
    const preview = document.createElement("span");
    preview.className = "color-preview-pill";
    preview.textContent = "Vista previa";
    const paint = () => {
      preview.style.setProperty("--swatch", input.value || defaults[0]);
      row.querySelectorAll(".color-swatch").forEach(button => button.classList.toggle("active", button.style.getPropertyValue("--swatch").trim().toLowerCase() === String(input.value).toLowerCase()));
    };
    input.addEventListener("input", paint);
    shell.querySelector(".color-picker-head").appendChild(preview);
    shell.appendChild(input);
    label.replaceWith(shell);
    paint();
  }

  function decorate(){
    decorateRecords();
    decorateDetailDialog();
    addDashboardChips();
    enhanceInstitutionColorPicker();
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender) {
    render = function(){
      originalRender();
      setTimeout(decorate, 0);
    };
  }

  document.addEventListener("click", event => {
    const card = event.target.closest(".record-card");
    if (!card || event.target.closest("button,a,input,select,textarea,label")) return;
    const detail = card.querySelector("[data-detail-module][data-detail-id]");
    if (detail) detail.click();
    setTimeout(decorate, 80);
  });

  document.addEventListener("click", () => setTimeout(decorate, 80), true);

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm && !globalThis.__docroiColorOpenFormPatched) {
    globalThis.__docroiColorOpenFormPatched = true;
    openForm = function(module, id){
      originalOpenForm(module, id);
      setTimeout(enhanceInstitutionColorPicker, 0);
    };
  }

  const originalOpenDetail = typeof openDetail === "function" ? openDetail : null;
  if (originalOpenDetail && !globalThis.__docroiDetailIdentityPatched) {
    globalThis.__docroiDetailIdentityPatched = true;
    openDetail = function(module, id){
      originalOpenDetail(module, id);
      setTimeout(decorate, 0);
    };
  }

  setTimeout(decorate, 0);
})();
