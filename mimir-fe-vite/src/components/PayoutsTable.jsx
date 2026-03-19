import React from "react";

const PayoutsTable = ({ filteredPayouts, statusColors, totalsByStatus }) => {
  return (
    <>
      <div className="text-center text-base-content">
        {filteredPayouts.length === 0 ? (
          <p className="text-center text-gray-500">No payout summary found.</p>
        ) : (
          <div className="overflow-auto max-h-150">
            <table className="table table-zebra table-auto w-full">
              <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
                <tr>
                  <th>ID</th>
                  <th>Salesperson</th>
                  <th>Circuit Number</th>
                  <th>Client</th>
                  <th>Active Days</th>
                  <th>Period Ending</th>
                  <th>Entry Type</th>
                  <th>Commission (R)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((p) => {
                  const fullName =
                    [p.user_name, p.user_surname]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || "-";

                  const isReversed = p.effective_status === "reversed";
                  const commissionStr =
                    p?.commission_value != null &&
                    !Number.isNaN(Number(p.commission_value))
                      ? isReversed
                        ? `-R${Number(p.commission_value).toFixed(2)}`
                        : `R${Number(p.commission_value).toFixed(2)}`
                      : "-";

                  const statusClass =
                    statusColors?.[p.effective_status] ??
                    "bg-gray-100 text-gray-800";

                  const rowKey = `${p.id}-${p.entry_type}-${p.effective_status}`;

                  return (
                    <tr key={rowKey}>
                      <td>{p.id}</td>
                      <td>{fullName}</td>
                      <td className="text-right whitespace-nowrap">
                        {p.circuit_number || "-"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {p.client_name || "-"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {p.active_days ?? "-"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {p.period_end || "-"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {p.entry_type || "-"}
                      </td>
                      <td
                        className={`text-right whitespace-nowrap ${
                          isReversed ? "text-red-600 font-semibold" : ""
                        }`}
                      >
                        {commissionStr}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <span className={`badge ${statusClass}`}>
                          {p.effective_status ?? "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold border-t">
                <tr>
                  <td colSpan="5" className="text-right pr-4">
                    Totals
                  </td>
                  <td></td>
                  <td></td>
                  <td>
                    <div className="flex flex-col">
                      <span>Paid: R{totalsByStatus.paid.toFixed(2)}</span>
                      <span>Reversed: R{totalsByStatus.reversed.toFixed(2)}</span>
                      <span>Total: R{totalsByStatus.total.toFixed(2)}</span>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default PayoutsTable;
