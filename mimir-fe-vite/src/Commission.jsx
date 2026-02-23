// src/pages/Commissions.js
import React, { useEffect, useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "./AxiosInstance"; 
import { Loader2 } from "lucide-react";

const Commissions = () => {
  const [userRole, setUserRole] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editedCommissions, setEditedCommissions] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);
  
  const [applyButtonLoading, setApplyButtonLoading] = useState(false);
  
  const [activeView, setActiveView] = useState("Agreements");

  // These are states for filtering by month and year, and per sales person (for 'admin' and 'finance' roles only)
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("");

  const currentYear = new Date().getFullYear();

  // const [commissionLedger, setCommissionLedger] = useState([]);

  // const [payoutWindowReached, setPayoutWindowReached] = useState(false);


  // Optional: centralize what views exist so it’s easy to add more later.
  const views = [
    { key: "Agreements", label: "Agreements" },
    { key: "Earned", label: "Earned" },
    { key: "Payouts", label: "Payouts" },
    { key: "Projections", label: "Projections" },
    // Add more as needed
  ];
  
  // Status → Tailwind color mapping
  const statusColors = {
    new: "bg-purple-100 text-purple-800",
    active: "bg-green-100 text-green-800",
    paid: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    paused: "bg-blue-100 text-blue-800",
    cancelled: "bg-yellow-100 text-yellow-800",
    expired: "bg-gray-300 text-gray-600",
    pending: "bg-orange-100 text-orange-800",
  };
  
  const toggleRow = (id) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    // 1️⃣ Get user role from token
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserRole(decodedToken.role);
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);


  //===========================================================================================================================


  // Fetch ALL commissions from the API and dislay on Agreements view
  const fetchCommissions = async () => {
    try {
      const res = await axios.get("/mimir/api/commissions");
      setCommissions(res.data);
      // console.log("Fetched commissions:", res.data);
    } catch (err) {
      console.error("Error fetching commissions:", err);
      setError("Failed to load commissions.");
    } finally {
      setLoading(false);
    }
  };
  
  // Apply commission changes for a specific commission ID
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
        "/mimir/api/commissions/apply",
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
  
  // Display earnings summary in Earned view
  const [earnings, setEarnings] = useState([]);
  const fetchEarningsSummary = async () => {
    try {
      const res = await axios.get("/mimir/api/commissions/earnings_summary");
      setEarnings(res.data);
      // console.log("Fetched earnings summary:", res.data);
    } catch (err) {
      console.error("Error fetching earnings summary", err);
    }
  };

  // Display paid summary in Payout view
  const [payouts, setPayouts] = useState([]);
  const fetchPayoutSummary = async () => {
    try {
      const res = await axios.get("/mimir/api/commissions/payout_summary");
      setPayouts(res.data);
      // console.log("Fetched payout summary:", res.data);
    } catch (err) {
      console.error("Error fetching payout summary", err);
    }
  };

  const payCommission = async (ledgerId, userId) => {
    try {
      const res = await axios.post("/mimir/api/commissions/pay", {
        user_id: userId,
        earned_ledger_ids: [ledgerId], // single payout
        payment_date: new Date().toISOString().slice(0, 10),
        notes: "Manual payout"
      });

      // Success
      if (res.status === 200 && res.data.status === "success") {
        alert("Commission paid successfully");
      }

      // Partial success
      else if (res.status === 207 || res.data.status === "partial") {
        alert(
          `Partial payout: Paid ${res.data.paid_entries}. Failed: ${res.data.failed_entries.join(
            ", "
          )}`
        );
      }

      // Anything else = failure
      else {
        alert("Failed to pay commission: " + (res.data.message || "Unknown error"));
      }

      // Refresh payouts table
      await fetchEarningsSummary();

    } catch (err) {
      console.error("Payment failed:", err.response?.data || err);

      // If backend returned a response
      if (err.response?.data?.message) {
        alert("Failed to pay commission: " + err.response.data.message);
      } else {
        alert("Failed to pay commission: Server error");
      }
    }
  };

  const canFilterBySalesPerson =
  userRole === "admin" || userRole === "finance";

  const filterByMonthYearAndSalesperson = (records, dateField) => {
    return records.filter((r) => {
      if (!r[dateField]) return true;

      const d = new Date(r[dateField]);

      const matchesMonth =
        selectedMonth === "" || d.getMonth() === Number(selectedMonth);

      const matchesYear =
        selectedYear === "" || d.getFullYear() === Number(selectedYear);

      const matchesSalesperson =
      selectedSalesPerson === "" ||
      r.salesperson_name === selectedSalesPerson ||
      `${r.user_name ?? ""} ${r.user_surname ?? ""}`.trim() === selectedSalesPerson;
      
      return matchesMonth && matchesYear && matchesSalesperson;
    });
  };
  
  //=====================================================================================================================================
  // Kill switch state and countdown timer for next auto-payout batch
  
  // ---------- Kill Switch and Auto-Payout Cycle ----------
  const [cycle, setCycle] = useState(null); // holds backend timestamps
  const [phase, setPhase] = useState(null); // COUNTDOWN | WAITING_FOR_ACCRUAL
  const [countdown, setCountdown] = useState("");
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(null); // null = loading
  // const [serverOffset, setServerOffset] = useState(0);
  // const refreshedRef = useRef(false);
  
  // 2️⃣ Fetch kill switch state from backend
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/mimir/api/commissions/kill-switch", { withCredentials: true });

        // Accept both shapes: { enabled: true } or { autoPayoutEnabled: true }
        const raw =
          res?.data?.enabled ??
          res?.data?.autoPayoutEnabled ??
          res?.data?.commission_auto_pay; // if you ever return the raw DB field

        const enabled =
          typeof raw === "boolean"
            ? raw
            : String(raw).toLowerCase() === "true" || raw === "on";

        if (!cancelled) setAutoPayoutEnabled(enabled);
        // console.log("[KILL-PARSED]", { raw, enabled });
      } catch (err) {
        console.error("[KILL-GET][ERROR]", err);
        if (!cancelled) setAutoPayoutEnabled(prev => prev ?? null); // don't force false
      }
    })();

    return () => { cancelled = true; };
  }, []);


    // Toggle kill switch
    const toggleAutoPayout = async () => {
    if (typeof autoPayoutEnabled !== "boolean") return;

    const optimistic = !autoPayoutEnabled;
    setAutoPayoutEnabled(optimistic);

    try {
      const res = await axios.post(
        "/mimir/api/commissions/kill-switch",
        { autoPayoutEnabled: optimistic },
        { withCredentials: true }
      );
      const v = res?.data?.autoPayoutEnabled;
      const confirmed = typeof v === "boolean" ? v : String(v).toLowerCase() === "true";
      setAutoPayoutEnabled(confirmed);
    } catch (err) {
      console.error("Toggle failed; reverting:", err);
      setAutoPayoutEnabled(prev => !prev);
    }
  };


  
  // FETCH: Cycle status (independent)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/mimir/api/commissions/cycle-status", { withCredentials: true });
        if (!cancelled) {
          setCycle(res.data ?? null);
          // setPhase(res.data?.phase ?? null);
          // setCountdown(res.data?.countdown ?? "");
        }
      } catch (err) {
        console.error("[cycle-status] fetch failed:", err);
        if (!cancelled) setCycle(prev => prev ?? null);
      }
    })();
    // console.log("cycle-status fetch initiated", cycle);
    return () => { cancelled = true; };
  }, []);


  // Countdown / phase updater
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!cycle) return;

    // Always sync phase directly from backend
    setPhase(cycle.phase);

    // Debug log: show phase and key dates
    console.log("DEBUG Frontend Cycle:", {
      phase: cycle.phase,
      now: cycle.now,
      current_payout: cycle.current_payout,
      current_accrual: cycle.current_accrual,
      next_payout: cycle.next_payout,
      next_accrual: cycle.next_accrual
    });

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (cycle.phase === "COUNTDOWN") {
        const payoutTs = Date.parse(cycle.current_payout);
        const now = Date.now();
        const diff = payoutTs - now;

        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
        const s = Math.floor((diff / 1000) % 60);

        setCountdown(`${d}d ${h}h ${m}m ${s}s`);
      } else {
        setCountdown("");
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [cycle]);

  // Get label for display
  // utils: force to boolean if backend ever sends "true"/"false" strings
  const toBool = (v) =>
    typeof v === "boolean" ? v : String(v).trim().toLowerCase() === "true";

  const getCountdownLabel = () => {
    if (autoPayoutEnabled === null || phase === null) {
      return "Loading auto-payout status…";
    }

    const enabled = toBool(autoPayoutEnabled);

    if (!enabled) {
      return "AUTO PAYOUT DISABLED (Kill Switch Active)";
    }

    if (phase === "WAITING_FOR_ACCRUAL") {
      return "Awaiting next accrual batch (1st of month @ 02:00).";
    }

    if (phase === "COUNTDOWN") {
      return `Next auto-payout in: ${countdown ?? ""}`.trim();
    }

    return ""; // no fallback needed anymore
  };

//===========================================================================================================================
  
  // const payAllForUser = async (userId) => {
  //   if (!window.confirm("Pay all pending commissions for this user?")) return;

  //   try {
  //     setPayingUserId(userId);

  //     await axios.post("/api/commissions/pay_all", {
  //       user_id: userId,
  //       pay_date: new Date().toISOString().slice(0, 10)
  //     });

  //     await fetchPayoutSummary();
  //   } catch (err) {
  //     console.error("Payment failed", err);
  //     alert("Payment failed");
  //   } finally {
  //     setPayingUserId(null);
  //   }
  // };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        switch (activeView) {
          case "Agreements":
            await fetchCommissions();
            break;

          case "Earned":
            await fetchEarningsSummary();
            break;

          case "Payouts":
            await fetchPayoutSummary();
            break;

          // case "Projections":
          //   await fetchProjections(); // if you have it
          //   break;

          default:
            break;
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeView]);


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

  const salespersonOptions = [
    ...new Set(
      commissions.map((c) => c.salesperson_name).filter(Boolean)
    ),
  ];

  const filteredCommissions =
    filterByMonthYearAndSalesperson(commissions, "start_date");

  const filteredEarnings =
    filterByMonthYearAndSalesperson(earnings, "period_end");

  const filteredPayouts =
    filterByMonthYearAndSalesperson(payouts, "period_end");

  
  return (
    <div className="p-6 bg-base-200 min-h-screen">
      <div className="max-w-7xl mx-auto card bg-white dark:bg-gray-800 shadow-xl p-8">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold capitalize">
            {activeView}
          </h2>

          {/* Kill Switch Panel */}
          {canFilterBySalesPerson && (
            <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-lg shadow-sm">
              {/* Countdown */}
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {getCountdownLabel()}
              </div>

              {/* Toggle Button */}
              {autoPayoutEnabled === null ? (
                <button
                  disabled
                  className="px-3 py-1 rounded text-sm font-semibold bg-gray-400 text-white opacity-70 cursor-not-allowed"
                >
                  LOADING…
                </button>
              ) : (
                <button
                  onClick={toggleAutoPayout}
                  className={`px-3 py-1 rounded text-sm font-semibold transition ${
                    autoPayoutEnabled
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {autoPayoutEnabled ? "AUTO PAYOUT ENABLED" : "AUTO PAYOUT DISABLED"}
                </button>
              )}
            </div>
          )}
        </div>
  

        
        <div className="flex items-center justify-between mb-6">

          {/* View Buttons */}
          <div className="hidden md:inline-flex join">
            {views.map((v) => (
              <button
                key={v.key}
                className={`btn btn-sm join-item ${
                  activeView === v.key ? "btn-accent" : "btn-ghost"
                }`}
                onClick={() => setActiveView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Month/Year Filters on the Right */}
          <div className="flex gap-2 items-center">

            {/* Month */}
            <select
              className="select select-bordered select-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              <option value="0">Jan</option>
              <option value="1">Feb</option>
              <option value="2">Mar</option>
              <option value="3">Apr</option>
              <option value="4">May</option>
              <option value="5">Jun</option>
              <option value="6">Jul</option>
              <option value="7">Aug</option>
              <option value="8">Sep</option>
              <option value="9">Oct</option>
              <option value="10">Nov</option>
              <option value="11">Dec</option>
            </select>

            {/* Year */}
            <select
              className="select select-bordered select-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {Array.from({ length: 5 }).map((_, i) => {
                const year = currentYear - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>

            {/* Salesperson Filter - only visible when role is 'admin' or 'finance' */}
            {canFilterBySalesPerson && (
              <select
                className="select select-bordered select-sm"
                value={selectedSalesPerson}
                onChange={(e) => setSelectedSalesPerson(e.target.value)}
              >
                <option value="">All Salespeople</option>

                {salespersonOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}


            {/* Reset Button */}
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setSelectedMonth("");
                setSelectedYear("");
                setSelectedSalesPerson("");
              }}
            >
              Reset
            </button>


            {(selectedMonth || selectedYear || selectedSalesPerson) && (
              <span className="px-3 py-1 rounded-full bg-warning text-black text-sm">
                Filter Active
              </span>
            )}

          </div>
        </div>


        {/* ===========VIEWS========================================================================================================================= */}
        {activeView === "Agreements" && (
          <>
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
                    {filteredCommissions.map((c) => {
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
          </>
        )}


        {activeView === "Earned" && (
          <>
            <div className="text-center text-base-content">
              {earnings.length === 0 ? (
                <p className="text-center text-gray-500">No earnings summary found.</p>
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
                        {canFilterBySalesPerson && <th>Action</th>}
                        {/* <th>Actions</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEarnings.map((e) => {
                        return (
                          <tr key={e.id}>
                            <td>{e.id}</td>
                            <td>{e.user_name + " " + e.user_surname || "-"}</td>
                            <td className="text-right whitespace-nowrap">{e.circuit_number || "-" }</td>
                            <td className="text-right whitespace-nowrap">{e.client_name || "-" }</td>
                            <td className="text-right whitespace-nowrap">{e.active_days || "-" }</td>
                            <td className="text-right whitespace-nowrap">{e.period_end || "-"}</td>
                            <td className="text-right whitespace-nowrap">{e.entry_type || "-"}</td>
                            <td className="text-right whitespace-nowrap">
                              {e.commission_value ? `R${Number(e.commission_value).toFixed(2)}` : "-"}
                            </td>
                            <td>
                              <span className={`badge ${statusColors[e.effective_status]}`}>
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
                                  <li>
                                    <button
                                      disabled={e.entry_type !== "earned" || e.raw_status !== "pending"}
                                      onClick={() => payCommission(e.id, e.user_id)}
                                    >
                                      Pay
                                    </button>
                                  </li>
                                  <li>
                                    <button onClick={() => pauseCommission(commissionId)}>Pause</button>
                                  </li>
                                  <li>
                                    <button onClick={() => reverseCommission(commissionId)}>Reverse</button>
                                  </li>
                                  <li>
                                    <button onClick={() => cancelCommission(commissionId)}>Cancel</button>
                                  </li>
                                  {/* Add more options as needed */}
                                </ul>
                              </div>
                            </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

              
        {activeView === "Payouts" && (
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
                        {/* <th>Actions</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayouts.map((p) => {
                        // Safe helpers
                        const fullName =
                          [p.user_name, p.user_surname].filter(Boolean).join(" ").trim() || "-";

                        const commissionStr =
                          p?.commission_value !== null &&
                          p?.commission_value !== undefined &&
                          !Number.isNaN(Number(p.commission_value))
                            ? `R${Number(p.commission_value).toFixed(2)}`
                            : "-";

                        const statusClass =
                          statusColors?.[p.status] ?? "bg-gray-100 text-gray-800";

                        return (
                          <tr key={p.id}>
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
                            <td className="text-right whitespace-nowrap">{commissionStr}</td>

                            {/* ✅ The status badge MUST be inside a <td>, not directly under <tr> */}
                            <td className="text-right whitespace-nowrap">
                              <span className={`badge ${statusClass}`}>
                                {p.status ?? "-"}
                              </span>
                            </td>

                            {/* If you want the Actions column later, add another <td> here */}
                            {/* <td>...actions...</td> */}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeView === "Projections" && (
          <div className="text-center text-gray-500">
            {/* Replace with your Projections UI */}
            Projections view coming soon…
          </div>
        )}




      </div>  
    </div>
  );

};

export default Commissions;
