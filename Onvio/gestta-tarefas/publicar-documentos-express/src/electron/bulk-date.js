(function exposeBulkDateUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.bulkDateUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createBulkDateUtils() {
  function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function todayIso(now = new Date()) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isEligible(row, correctableCodes) {
    const allowed = new Set(correctableCodes || ["due_date_missing", "due_date_ambiguous", "past_due_date"]);
    const hasHardError = (row.messages || []).some((item) => item.severity === "error" && !allowed.has(item.code));
    return !hasHardError && Boolean(row.task);
  }

  function buildPreview(rows, confirmations, selectedIds, newDate, today = todayIso()) {
    if (!isValidIsoDate(newDate)) throw new Error("Informe uma data de vencimento valida.");
    const selected = rows.filter((row) => selectedIds.has(row.id) && isEligible(row));
    if (!selected.length) throw new Error("Selecione ao menos um documento elegivel.");

    const previousDates = new Map();
    let overwrittenCount = 0;
    for (const row of selected) {
      const previous = confirmations.get(row.id)?.confirmedDueDate || "";
      previousDates.set(previous, (previousDates.get(previous) || 0) + 1);
      if (previous && previous !== newDate) overwrittenCount += 1;
    }

    return {
      ids: selected.map((row) => row.id),
      count: selected.length,
      newDate,
      previousDates: [...previousDates.entries()].map(([date, count]) => ({ date, count })),
      overwrittenCount,
      isPast: newDate < today,
    };
  }

  function apply(confirmations, ids, newDate) {
    const values = [];
    for (const id of ids) {
      const confirmation = confirmations.get(id);
      if (!confirmation) continue;
      values.push({
        id,
        confirmedDueDate: confirmation.confirmedDueDate,
        dueDateConfirmed: confirmation.dueDateConfirmed,
      });
      confirmation.confirmedDueDate = newDate;
      confirmation.dueDateConfirmed = true;
    }
    return { appliedDate: newDate, values };
  }

  function undo(confirmations, snapshot) {
    if (!snapshot) return;
    for (const value of snapshot.values) {
      const confirmation = confirmations.get(value.id);
      if (!confirmation) continue;
      confirmation.confirmedDueDate = value.confirmedDueDate;
      confirmation.dueDateConfirmed = value.dueDateConfirmed;
    }
  }

  function editDate(confirmation, newDate) {
    confirmation.confirmedDueDate = newDate;
    confirmation.dueDateConfirmed = false;
  }

  return { apply, buildPreview, editDate, isEligible, isValidIsoDate, todayIso, undo };
});
