(function(){
  if (!window.__docroiHotfix) return;
  if (modules.programs) modules.programs.cols = ["name", "institutionId", "status", "language", "plannedHours", "amount"];
  if (modules.sessions) modules.sessions.cols = ["title", "programId", "date", "language", "startTime", "status"];
  (state.programs || []).forEach(p => { p.language ||= "Español"; });
  (state.sessions || []).forEach(s => {
    const p = (state.programs || []).find(x => x.id === s.programId) || {};
    s.language ||= p.language || "Español";
  });
  save();
  render();
})();
