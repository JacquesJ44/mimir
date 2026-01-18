// src/pages/Commissions.js
import React, { useEffect, useState, Fragment, use } from "react";
import axios from "./AxiosInstance"; 
import { Loader2 } from "lucide-react";

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editedCommissions, setEditedCommissions] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);

  const [applyButtonLoading, setApplyButtonLoading] = useState(false);

  // Status → Tailwind color mapping
  const statusColors = {
    new: "bg-purple-100 text-purple-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    paused: "bg-yellow-100 text-yellow-800",
    expired: "bg-gray-300 text-gray-600",
    pending: "bg-orange-100 text-orange-800",
  };

  const toggleRow = (id) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  const fetchCommissions = async () => {
    try {
      const res = await axios.get("/api/commissions");
      setCommissions(res.data);
      // console.log("Fetched commissions:", res.data);
    } catch (err) {
      console.error("Error fetching commissions:", err);
      setError("Failed to load commissions.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCommissions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-accent"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  const applyCommission = async (commissionId) => {
    // Get the commission percentage from edited state or default to 10
    const commission_percentage =
      editedCommissions[commissionId]?.commission_percentage ??
      commissions.find(c => c.id === commissionId)?.commission_percentage ??
      10;

    // console.log("Submitting commission:", { commissionId, commission_percentage });

    try {
      setApplyButtonLoading(true);
      const res = await axios.post(
        "/api/commissions/apply",
        {
          commission_id: commissionId,
          commission_percentage,
        },
        {
          headers: {
            "Content-Type": "application/json", // ensure JSON
          },
        }
      );

      console.log("Response from server:", res.data);
      alert("Commission submitted for approval");

      // ✅ This runs AFTER user clicks OK
      await fetchCommissions();

    } catch (err) {
      console.error("Error submitting commission:", err.response?.data || err);
      alert("Failed to submit commission");
    } finally {
      setApplyButtonLoading(false);
    }
  };

  return (
    <div className="p-6 bg-base-200 min-h-screen">
      <div className="max-w-7xl mx-auto card bg-white dark:bg-gray-800 shadow-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Commission Overview
        </h2>

        {commissions.length === 0 ? (
          <p className="text-center text-gray-500">No commissions found.</p>
        ) : (
          // Table container: scrollable both vertically and horizontally
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
                {commissions.map((c) => {
                  const commissionId = c.id;
                  const percentage = editedCommissions[commissionId]?.commission_percentage ?? c.commission_percentage ?? 10;
                  const gp = c.mrc != null && c.sellingPrice != null ? Number(c.sellingPrice) - Number(c.mrc) : 0;
                  const commissionValue = gp * (percentage / 100);
                  const isExpired = c.status !== 'new' && c.status !== 'paused';

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
                            disabled={isExpired}
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
                        <td className="text-right whitespace-nowrap">{commissionValue ? `R${commissionValue.toFixed(2)}` : "-"}</td>
                        <td>
                          <span className={`badge badge-outline ${statusColors[c.status] || "bg-gray-100 text-gray-800"}`}>
                            {c.status || "-"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-xs btn-accent"
                            disabled={isExpired || applyButtonLoading}
                            onClick={() => applyCommission(commissionId)}
                          >
                            {applyButtonLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Apply"}
                          </button>
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
                                <span className="font-semibold">Effective Date:</span>
                                <div>{c.start_date ? new Date(c.start_date).toLocaleDateString() : "-"}</div>
                              </div>
                              <div>
                                <span className="font-semibold">Created:</span>
                                <div>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}</div>
                              </div>
                              <div>
                                <span className="font-semibold">Updated:</span>
                                <div>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "-"}</div>
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
      </div>  
    </div>
  );

};

export default Commissions;
