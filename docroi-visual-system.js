(function(){
  const VERSION = "20260711-visual-system";
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
      const surface = button.closest(".record-card,.list-row,.calendar-chip,.month-row,.income-line,.predictive-row") || button;
      applyVars(surface, institution);
    });

    document.querySelectorAll(".chart-row").forEach(row => {
      const label = row.querySelector("span")?.textContent || "";
      const program = (state.programs || []).find(p => label.includes(p.name));
      const institution = program ? (state.institutions || []).find(i => i.id === program.institutionId) : null;
      applyVars(row, institution);
    });
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

  function decorate(){
    decorateRecords();
    addDashboardChips();
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
  });

  setTimeout(decorate, 0);
})();
