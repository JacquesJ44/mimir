import React from "react";
import { Loader2 } from "lucide-react";

const AgreementsTable = ({
  filteredCommissions,
  commissions,
  editedCommissions,
  setEditedCommissions,
  expandedRow,
  toggleRow,
  statusColors,
  userRole,
  applyButtonLoading,
  pauseButtonLoading,
  resumeButtonLoading,
  can,
  onApply,
  onPause,
  onResume,
  onCancel,
}) => {
  const handleActionClick = (action, commissionId) => {
    const handlerMap = {
      apply: () => onApply(commissionId),
      pause: () => onPause(commissionId),
      resume: () => onResume(commissionId),
      cancel: () => onCancel(commissionId),
    };
    handlerMap[action]?.();
  };

  const getLoadingState = (action) => {
    switch (action) {
      case "apply":
        return applyButtonLoading;
      case "pause":
        return pauseButtonLoading;
      case "resume":
        return resumeButtonLoading;
      default:
        return false;
    }
  };

  return (
    <>
      {filteredCommissions.length === 0 ? (
        <p className="text-center text-gray-500">No commissions found.</p>
      ) : (
        <div className="overflow-auto max-h-150">
          <table className="table table-zebra table-auto w-full">
            <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
              <tr>
                <th></th>
                <th>ID</th>
                <th>Salesperson</th>
                <th>Circuit Number</th>
                <th>Client</th>
                <th>GP (R)</th>
                <th>Commission (%)</th>
                <th>Commission (R)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map((c) => {
                const commissionId = c.id;
                const percentage =
                  editedCommissions[commissionId]?.commission_percentage ??
                  c.commission_percentage ??
                  10;
                const gp =
                  c.mrc != null && c.sellingPrice != null
                    ? Number(c.sellingPrice) - Number(c.mrc)
                    : 0;
                const commissionValue = gp * (percentage / 100);
                const isPercentageEditable = c.status === "new";

                return (
                  <React.Fragment key={commissionId}>
                    <tr>
                      <td>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => toggleRow(commissionId)}
                        >
                          {expandedRow === commissionId ? "−" : "+"}
                        </button>
                      </td>
                      <td>{commissionId}</td>
                      <td>{c.salesperson_name}</td>
                      <td>{c.circuitNumber || "-"}</td>
                      <td>{c.siteB_name || "-"}</td>
                      <td>{gp ? `R${gp.toFixed(2)}` : "-"}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="input input-sm input-bordered w-20"
                          value={percentage}
                          disabled={!isPercentageEditable}
                          onChange={(e) =>
                            setEditedCommissions((prev) => ({
                              ...prev,
                              [commissionId]: {
                                ...prev[commissionId],
                                commission_percentage: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {commissionValue
                          ? `R${commissionValue.toFixed(2)}`
                          : "-"}
                      </td>
                      <td>
                        <span
                          className={`badge badge-outline ${
                            statusColors[c.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {c.status || "-"}
                        </span>
                      </td>
                      <td>
                        {["admin", "finance"].includes(userRole) ? (
                          <div className="dropdown dropdown-end">
                            <label
                              tabIndex={0}
                              className="btn btn-xs btn-accent"
                            >
                              Actions
                            </label>
                            <ul
                              tabIndex={0}
                              className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40"
                            >
                              {["apply", "pause", "resume", "cancel"].map(
                                (action) => {
                                  if (!can(c.status, action)) return null;

                                  const isLoading = getLoadingState(action);

                                  return (
                                    <li key={action}>
                                      <button
                                        disabled={isLoading}
                                        onClick={() =>
                                          handleActionClick(
                                            action,
                                            commissionId
                                          )
                                        }
                                      >
                                        {isLoading ? (
                                          <Loader2
                                            className={`w-4 h-4 animate-spin ${
                                              action === "apply"
                                                ? "w-5 h-5"
                                                : ""
                                            }`}
                                          />
                                        ) : (
                                          action.charAt(0).toUpperCase() +
                                            action.slice(1)
                                        )}
                                      </button>
                                    </li>
                                  );
                                }
                              )}
                            </ul>
                          </div>
                        ) : (
                          can(c.status, "apply") && (
                            <button
                              className="btn btn-xs btn-accent"
                              disabled={applyButtonLoading}
                              onClick={() => onApply(commissionId)}
                            >
                              {applyButtonLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </button>
                          )
                        )}
                      </td>
                    </tr>

                    {expandedRow === commissionId ? (
                      <tr className="bg-base-100">
                        <td colSpan={10}>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 text-sm">
                            <div>
                              <span className="font-semibold">Contract:</span>
                              <div>{c.contractTerm || "-"} months</div>
                            </div>
                            <div>
                              <span className="font-semibold">
                                Effective Date:
                              </span>
                              <div>
                                {c.start_date
                                  ? new Date(c.start_date).toLocaleDateString(
                                      "en-GB",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold">Created:</span>
                              <div>
                                {c.created_at
                                  ? new Date(c.created_at).toLocaleDateString(
                                      "en-GB",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold">Updated:</span>
                              <div>
                                {c.updated_at
                                  ? new Date(c.updated_at).toLocaleDateString(
                                      "en-GB",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold">Notes:</span>
                              <div>{c.notes || "-"}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default AgreementsTable;
