(function exposeBatchSelectionUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.batchSelectionUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createBatchSelectionUtils() {
  const CORRECTABLE_CODES = new Set(["due_date_missing", "due_date_ambiguous", "past_due_date"]);

  function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function isConfirmEligible(row, confirmation) {
    const hardError = (row.messages || []).some((item) => item.severity === "error" && !CORRECTABLE_CODES.has(item.code));
    return !hardError && Boolean(row.company) && row.task?.status === "open" && isValidIsoDate(confirmation?.confirmedDueDate || "");
  }

  function buildConfirmationPreview(rows, confirmations, selectedIds, today) {
    const selected = rows.filter((row) => selectedIds.has(row.id));
    const eligible = selected.filter((row) => isConfirmEligible(row, confirmations.get(row.id)));
    const companies = new Set(eligible.map((row) => row.company?.name).filter(Boolean));
    const tasks = new Set(eligible.map((row) => row.task?.name).filter(Boolean));
    const pastCount = eligible.filter((row) => confirmations.get(row.id)?.confirmedDueDate < today).length;
    return {
      ids: eligible.map((row) => row.id),
      rows: eligible,
      selectedCount: selected.length,
      count: eligible.length,
      skippedCount: selected.length - eligible.length,
      companies: [...companies],
      tasks: [...tasks],
      pastCount,
    };
  }

  function applyConfirmation(confirmations, ids) {
    for (const id of ids) {
      const confirmation = confirmations.get(id);
      if (!confirmation) continue;
      confirmation.companyConfirmed = true;
      confirmation.taskConfirmed = true;
      confirmation.dueDateConfirmed = true;
    }
  }

  function removePaths(paths, selectedPaths) {
    const selected = new Set([...selectedPaths].map((item) => String(item).toLowerCase()));
    return paths.filter((item) => !selected.has(String(item).toLowerCase()));
  }

  function removeRows(rows, selectedIds) {
    return rows.filter((row) => !selectedIds.has(row.id));
  }

  return { applyConfirmation, buildConfirmationPreview, isConfirmEligible, isValidIsoDate, removePaths, removeRows };
});
