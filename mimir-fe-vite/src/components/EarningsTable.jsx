import React from "react";

const EarningsTable = ({
  filteredEarnings,
  statusColors,
  canFilterBySalesPerson,
  totalEarned,
  getLedgerActions,
  onLedgerAction,
}) => {
  return (
    <div className="text-center text-base-content">
      {filteredEarnings.length === 0 ? (
        <p className="text-center text-gray-500">
          No earnings summary found.
        </p>
      ) : (
        <div className="overflow-auto max-h-150">
          <table className="table table-zebra table-auto w-full">
            <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
              <tr>
                <th>Agr. ID</th>
                <th>Salesperson</th>
                <th>Circuit Number</th>
                <th>Client</th>
                <th>Active Days</th>
                <th>Period Ending</th>
                <th>Entry Type</th>
                <th>Commission (R)</th>
                <th>Status</th>
                {canFilterBySalesPerson && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEarnings.map((e) => {
                const isReversed = e.effective_status === "reversed";
                const commissionValue = isReversed
                  ? `-R${Number(e.commission_value ?? 0).toFixed(2)}`
                  : e.commission_value != null
                  ? `R${Number(e.commission_value).toFixed(2)}`
                  : "-";

                const rowKey = `${e.id}-${e.entry_type}-${e.effective_status}`;

                return (
                  <tr key={rowKey}>
                    <td>{e.commission_id || "-"}</td>
                    <td>
                      {`${e.user_name || ""} ${e.user_surname || ""}`.trim() ||
                        "-"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {e.circuit_number || "-"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {e.client_name || "-"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {e.active_days || "-"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {e.period_end || "-"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div
                        className="tooltip tooltip-left"
                        data-tip={`Ledger ID: ${e.id}`}
                      >
                        <span className="cursor-help">
                          {e.entry_type || "-"}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`text-right whitespace-nowrap ${
                        isReversed ? "text-red-600 font-semibold" : ""
                      }`}
                    >
                      {commissionValue}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          statusColors[e.effective_status] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {e.effective_status}
                      </span>
                    </td>
                    {canFilterBySalesPerson && (
                      <td>
                        <div className="dropdown">
                          <label tabIndex={0} className="btn btn-xs btn-accent">
                            Actions
                          </label>
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32 static"
                          >
                            {getLedgerActions(e).length === 0 && (
                              <li>
                                <button disabled>
                                  No actions available
                                </button>
                              </li>
                            )}
                            {getLedgerActions(e).map((action, idx) => (
                              <li key={`${e.id}-action-${idx}`}>
                                <button
                                  onClick={() =>
                                    onLedgerAction({
                                      ledgerId: e.id,
                                      userId: e.user_id,
                                      action: action.type,
                                    })
                                  }
                                  disabled={action.disabled}
                                >
                                  {action.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-700">
              <tr className="font-semibold border-t">
                <td colSpan="9" className="text-right pr-4">
                  Total Earned
                </td>
                <td>R {totalEarned.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default EarningsTable;
