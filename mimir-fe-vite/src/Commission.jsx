
// ============================================================================
// 1. IMPORTS & CONSTANTS
// ============================================================================

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "./AxiosInstance";
import { Loader2 } from "lucide-react";

// Sub-components
import AgreementsTable from "./components/AgreementsTable";
import EarningsTable from "./components/EarningsTable";
import PayoutsTable from "./components/PayoutsTable";
import CommissionTimelineChart from "./components/CommissionTimeLineChart";
import StatCard from "./components/StatCard";

/** Available views in the commission dashboard */
const VIEWS = [
  { key: "Agreements", label: "Agreements" },
  { key: "Earned", label: "Earned" },
  { key: "Payouts", label: "Payouts" },
  { key: "Projections", label: "Projections" },
];

/** Status to Tailwind color mapping */
const STATUS_COLORS = {
  new: "bg-purple-100 text-purple-800",
  active: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  paused: "bg-blue-100 text-blue-800",
  cancelled: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-300 text-gray-600",
  pending: "bg-orange-100 text-orange-800",
  reversed: "bg-red-100 text-red-800",
};

/** Commission status → allowed actions mapping */
const COMMISSION_ACTIONS = {
  new: ["apply", "cancel"],
  pending: ["cancel"],
  active: ["pause", "cancel"],
  paused: ["resume", "cancel"],
  expired: [],
  completed: [],
};

// ============================================================================
// 2. COMPONENT & STATE DECLARATIONS
// ============================================================================

const Commissions = () => {
    // ...existing code...
  const currentYear = new Date().getFullYear();

  // ========================================================================
  // STATE: User & Auth
  // ========================================================================
  const [userRole, setUserRole] = useState(null);
  const [userIdentifier, setUserIdentifier] = useState({
    id: null,
    email: null,
    name: null,
  });

  // ========================================================================
  // STATE: Core Data (one per view)
  // ========================================================================
  const [commissions, setCommissions] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [projectionData, setProjectionData] = useState([]);

  // ========================================================================
  // STATE: UI & View Management
  // ========================================================================
  const [activeView, setActiveView] = useState("Agreements");
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================================
  // STATE: Form & Editing
  // ========================================================================
  const [editedCommissions, setEditedCommissions] = useState({});

  // ========================================================================
  // STATE: Filters (Month, Year, Salesperson)
  // ========================================================================
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("");
  const canFilterBySalesPerson =
    userRole === "admin" || userRole === "finance";

  // Projection view selection
  // Always store as string to keep <select> value consistent
  const [selectedProjectionCommissionId, setSelectedProjectionCommissionId] = useState("");

  // ========================================================================
  // STATE: Button Loading States (Commission Actions)
  // ========================================================================
  const [applyButtonLoading, setApplyButtonLoading] = useState(false);
  const [pauseButtonLoading, setPauseButtonLoading] = useState(false);
  const [resumeButtonLoading, setResumeButtonLoading] = useState(false);

  // ========================================================================
  // STATE: Kill Switch & Auto-Payout Countdown
  // ========================================================================
  const [cycle, setCycle] = useState(null);
  const [phase, setPhase] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(null);
  const intervalRef = useRef(null);

  // ============================================================================
  // 3. EFFECTS
  // ============================================================================

  // Effect: Initialize user role from JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserRole(decodedToken.role);

        setUserIdentifier({
          id:
            decodedToken.user_id ||
            decodedToken.id ||
            decodedToken.sub ||
            null,
          email: decodedToken.email || decodedToken.username || null,
          name: decodedToken.name || decodedToken.username || null,
        });
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);

  // Effect: Fetch kill switch state from backend
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/api/commissions/kill-switch", {
          withCredentials: true,
        });

        const raw =
          res?.data?.enabled ??
          res?.data?.autoPayoutEnabled ??
          res?.data?.commission_auto_pay;

        const enabled =
          typeof raw === "boolean"
            ? raw
            : String(raw).toLowerCase() === "true" || raw === "on";

        if (!cancelled) setAutoPayoutEnabled(enabled);
      } catch (err) {
        console.error("[KILL-GET][ERROR]", err);
        if (!cancelled) setAutoPayoutEnabled((prev) => prev ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Effect: Fetch cycle status (payout timing)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/api/commissions/cycle-status", {
          withCredentials: true,
        });
        if (!cancelled) {
          setCycle(res.data ?? null);
        }
      } catch (err) {
        console.error("[cycle-status] fetch failed:", err);
        if (!cancelled) setCycle((prev) => prev ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Effect: Update countdown timer and phase based on cycle
  useEffect(() => {
    if (!cycle) return;

    setPhase(cycle.phase);

    // Always clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start timer during COUNTDOWN phase
    if (cycle.phase !== "COUNTDOWN") {
      setCountdown("");
      return;
    }

    intervalRef.current = setInterval(() => {
      const payoutTs = Date.parse(cycle.current_payout);
      const now = Date.now();
      const diff = payoutTs - now;

      if (diff <= 0) {
        setCountdown("Processing payout...");
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cycle]);

  // Effect: Load data based on active view
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
          case "Projections":
            // Projections relies on both agreements + payout records
            await Promise.all([fetchCommissions(), fetchPayoutSummary()]);
            break;
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

  useEffect(() => {
    if (activeView !== "Projections") return;
    if (!selectedProjectionCommissionId) return;

    const fetchProjection = async () => {
      try {
        const res = await axios.get(
          `/api/commissions/projections/${selectedProjectionCommissionId}`
        );

        console.log("Projection API:", res.data);

        setProjectionData(res.data || []);
      } catch (err) {
        console.error("Projection fetch error:", err);
        setProjectionData([]);
      }
    };

    fetchProjection();
  }, [activeView, selectedProjectionCommissionId]);

  // ============================================================================
  // 4. HELPER UTILITIES & VALIDATORS
  // ============================================================================

   /**
   * Check if an action is allowed for a given commission status.
   */
  const canPerformAction = (status, action) =>
    COMMISSION_ACTIONS[status]?.includes(action);

  /**
   * Determine if a ledger entry can be paid
   */
  const canPay = (ledger) =>
    ["pending", "approved", "reversed"].includes(ledger.effective_status);

  /**
   * Determine if a ledger entry can be reversed
   */
  const canReverse = (ledger) => ledger.effective_status === "paid";

  /**
   * Get available actions for a ledger entry
   */
  const getLedgerActions = (ledger) => {
    const actions = [];
    if (canPay(ledger)) {
      actions.push({ label: "Pay", type: "pay", disabled: false });
    }
    if (canReverse(ledger)) {
      actions.push({ label: "Reverse", type: "reverse", disabled: false });
    }
    return actions;
  };

  /**
   * Convert various value types to boolean
   */
  const toBool = (v) =>
    typeof v === "boolean"
      ? v
      : String(v).trim().toLowerCase() === "true";

  /**
   * Filter records by month, year, and salesperson
   */
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
        `${r.user_name ?? ""} ${r.user_surname ?? ""}`.trim() ===
          selectedSalesPerson;

      return matchesMonth && matchesYear && matchesSalesperson;
    });
  };

  /**
   * Generate countdown label for the kill switch panel
   */
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

    return "";
  };

  // ============================================================================
  // 5. API DATA FETCHING
  // ============================================================================

  /**
   * Fetch all commission agreements
   */
  const fetchCommissions = async () => {
    try {
      const res = await axios.get("/api/commissions");
      setCommissions(res.data);
    } catch (err) {
      console.error("Error fetching commissions:", err);
      setError("Failed to load commissions.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch earnings summary for the current month
   */
  const fetchEarningsSummary = async () => {
    try {
      const res = await axios.get("/api/commissions/earnings_summary");
      setEarnings(res.data);
    } catch (err) {
      console.error("Error fetching earnings summary", err);
    }
  };

  /**
   * Fetch payout summary (paid and reversed commissions)
   */
  const fetchPayoutSummary = async () => {
    try {
      const res = await axios.get("/api/commissions/payout_summary");
      setPayouts(res.data);
    } catch (err) {
      console.error("Error fetching payout summary", err);
    }
  };

  // ============================================================================
  // 6. COMMISSION AGREEMENT ACTIONS
  // ============================================================================

  /**
   * Submit a commission agreement for approval
   */
  const handleApplyCommission = async (commissionId) => {
    const commission_percentage =
      editedCommissions[commissionId]?.commission_percentage ??
      commissions.find((c) => c.id === commissionId)?.commission_percentage ??
      10;

    try {
      setApplyButtonLoading(true);
      await axios.post(
        "/api/commissions/apply",
        {
          commission_id: commissionId,
          commission_percentage,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      alert("Commission submitted for approval");
      await fetchCommissions();
    } catch (err) {
      console.error("Error submitting commission:", err.response?.data || err);
      alert("Failed to submit commission");
    } finally {
      setApplyButtonLoading(false);
    }
  };

  /**
   * Pause a commission agreement
   */
  const handlePauseCommission = async (commissionId) => {
    try {
      setPauseButtonLoading(true);

      await axios.post(
        "/api/commissions/pause",
        { commission_id: commissionId },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      alert("Commission agreement has been paused.");
      await fetchCommissions();
    } catch (err) {
      console.error(
        "Error pausing commission agreement:",
        err.response?.data || err
      );
      alert("Failed to pause the commission agreement.");
    } finally {
      setPauseButtonLoading(false);
    }
  };

  /**
   * Resume a paused commission agreement
   */
  const handleResumeCommission = async (commissionId) => {
    try {
      setResumeButtonLoading(true);

      await axios.post(
        "/api/commissions/resume",
        { commission_id: commissionId },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      alert("Commission agreement has been resumed.");
      await fetchCommissions();
    } catch (err) {
      console.error(
        "Error resuming commission agreement:",
        err.response?.data || err
      );
      alert("Failed to resume the commission agreement.");
    } finally {
      setResumeButtonLoading(false);
    }
  };

  /**
   * Cancel a commission agreement
   */
  const handleCancelCommission = async (commissionId) => {
    if (
      !window.confirm(
        "Cancelling a commission agreement will exclude it from all future accruals/payments. Are you sure?"
      )
    ) {
      return;
    }

    try {
      await axios.post(
        "/api/commissions/cancel",
        { commission_id: commissionId },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      alert("Commission agreement has been canceled.");
      await fetchCommissions();
    } catch (err) {
      console.error(
        "Error canceling commission agreement:",
        err.response?.data || err
      );
      alert("Failed to cancel the commission agreement.");
    }
  };

  // ============================================================================
  // 7. LEDGER ENTRY ACTIONS
  // ============================================================================

  /**
   * Handle pay or reverse actions on ledger entries
   */
  const handleLedgerAction = async ({ ledgerId, userId, action }) => {
    try {
      if (!["pay", "reverse"].includes(action)) {
        throw new Error("Invalid action: " + action);
      }

      if (
        action === "reverse" &&
        !window.confirm(
          "Are you sure you want to reverse this ledger entry?"
        )
      ) {
        return;
      }

      const endpoint =
        action === "pay"
          ? "/api/commissions/earnings_summary/pay"
          : "/api/commissions/earnings_summary/reverse";

      const payload =
        action === "pay"
          ? {
              user_id: userId,
              earned_ledger_ids: [ledgerId],
              payment_date: new Date().toISOString().slice(0, 10),
              notes: "Manual payout",
            }
          : {
              user_id: userId,
              ledger_ids: [ledgerId],
              reversal_date: new Date().toISOString().slice(0, 10),
              notes: "Manual reversal",
            };

      const res = await axios.post(endpoint, payload);

      // Success
      if (res.status === 200 && res.data.status === "success") {
        alert(
          `${
            action === "pay" ? "Commission paid" : "Ledger entry reversed"
          } successfully`
        );
      }
      // Partial success
      else if (res.status === 207 || res.data.status === "partial") {
        alert(
          `Partial ${action === "pay" ? "payout" : "reversal"}: ${
            action === "pay" ? "Paid" : "Reversed"
          } ${res.data.paid_entries || res.data.reversed_entries}. Failed: ${
            res.data.failed_entries.join(", ")
          }`
        );
      }
      // Failure
      else {
        alert(
          `Failed to ${action} ledger entry: ` +
            (res.data.message || "Unknown error")
        );
      }

      await fetchEarningsSummary();
    } catch (err) {
      console.error(`${action} failed:`, err.response?.data || err);

      if (err.response?.data?.message) {
        alert(`Failed to ${action} ledger entry: ` + err.response.data.message);
      } else {
        alert(`Failed to ${action} ledger entry: Server error`);
      }
    }
  };

  // ============================================================================
  // 8. AUTO-PAYOUT TOGGLE ACTIONS
  // ============================================================================

  /**
   * Toggle the auto-payout kill switch
   */
  const handleToggleAutoPayout = async () => {
    if (typeof autoPayoutEnabled !== "boolean") return;

    const optimistic = !autoPayoutEnabled;
    setAutoPayoutEnabled(optimistic);

    try {
      const res = await axios.post(
        "/api/commissions/kill-switch",
        { autoPayoutEnabled: optimistic },
        { withCredentials: true }
      );
      const v = res?.data?.autoPayoutEnabled;
      const confirmed = typeof v === "boolean" ? v : String(v).toLowerCase() === "true";
      setAutoPayoutEnabled(confirmed);
    } catch (err) {
      console.error("Toggle failed; reverting:", err);
      setAutoPayoutEnabled((prev) => !prev);
    }
  };

  // ============================================================================
  // 9. COMPUTED / DERIVED VALUES
  // ============================================================================

  // Derived data for filtering
  const salespersonOptions = [
    ...new Set(commissions.map((c) => c.salesperson_name).filter(Boolean)),
  ];

  const filteredCommissions = filterByMonthYearAndSalesperson(
    commissions,
    "start_date"
  );
  const filteredEarnings = filterByMonthYearAndSalesperson(
    earnings,
    "period_end"
  );
  const filteredPayouts = filterByMonthYearAndSalesperson(
    payouts,
    "period_end"
  );

  // Calculate totals for Earned view
  const totalEarned = Object.values(
    filteredEarnings.reduce((acc, e) => {
      if (!acc[e.id]) acc[e.id] = e;
      return acc;
    }, {})
  ).reduce((sum, e) => sum + (Number(e.commission_value) || 0), 0);

  // Calculate totals for Payouts view
  const totalsByStatus = filteredPayouts.reduce(
    (acc, p) => {
      const value = Number(p.commission_value) || 0;

      if (p.effective_status === "paid") {
        acc.paid += value;
        acc.total += value;
      }

      if (p.effective_status === "reversed") {
        acc.reversed += value;
      }

      return acc;
    },
    { paid: 0, reversed: 0, total: 0 }
  );

  // Projection view: only show circuits the current user can SEE (for non-admin/finance users)
  const isAgreementVisible = useCallback((agreement) => {
    if (userRole === "admin" || userRole === "finance") return true;
    if (!agreement) return false;

    const salesName = agreement.salesperson_name?.toLowerCase?.() ?? "";
    const userName = (userIdentifier.name || "").toLowerCase();

    const isNameMatch = salesName && userName && salesName === userName;

    const isIdMatch =
      userIdentifier.id &&
      (String(agreement.salesperson_id) === String(userIdentifier.id) ||
        String(agreement.user_id) === String(userIdentifier.id));

    const salesEmail = (agreement.salesperson_email || "").toLowerCase();
    const userEmail = (userIdentifier.email || "").toLowerCase();

    return (
      isNameMatch ||
      isIdMatch ||
      (salesEmail && userEmail && salesEmail === userEmail)
    );
  }, [userRole, userIdentifier]);

  const projectionAgreements = useMemo(() => {
    return commissions.filter(isAgreementVisible);
  }, [commissions, isAgreementVisible]);

  const selectedProjectionAgreement = useMemo(() => {
    return projectionAgreements.find(
      (c) => String(c.id) === String(selectedProjectionCommissionId)
    );
  }, [projectionAgreements, selectedProjectionCommissionId]);

  // Ensure the selected projection agreement is always valid for the current user and view
  useEffect(() => {
    if (activeView !== "Projections") return;

    if (!projectionAgreements.length) return;

    if (!selectedProjectionCommissionId) {
      setSelectedProjectionCommissionId(
        String(projectionAgreements[0].id)
      );
      return;
    }

    const exists = projectionAgreements.some(
      (c) => String(c.id) === String(selectedProjectionCommissionId)
    );

    if (!exists) {
      setSelectedProjectionCommissionId(
        String(projectionAgreements[0].id)
      );
    }
  }, [
    activeView,
    projectionAgreements.length, // ✅ stable
    selectedProjectionCommissionId,
  ]);

  // ============================================================================
  // PROJECTIONS: COMPUTED / DERIVED DATA
  // ============================================================================
  
  // Debug logging for troubleshooting projection dropdown issues
    useEffect(() => {
      console.log("[DEBUG] commissions:", commissions);
      console.log("[DEBUG] userIdentifier:", userIdentifier);
      console.log("[DEBUG] projectionAgreements:", projectionAgreements);
    }, [commissions, userIdentifier, projectionAgreements]);

  // const projectionContractTerm = Number(selectedProjectionAgreement?.contractTerm) || 0;
  // const projectionSellingPrice = Number(selectedProjectionAgreement?.sellingPrice) || 0;
  // const projectionMrc = Number(selectedProjectionAgreement?.mrc) || 0;
  // const projectionCommissionPct = Number(selectedProjectionAgreement?.commission_percentage) || 0;
  // const projectionTotalContractValue = projectionSellingPrice * projectionContractTerm;

  // const projectionGp = projectionSellingPrice - projectionMrc;
  // const projectionMonthlyCommission = projectionGp * (projectionCommissionPct / 100);

  const projectionChartData = useMemo(() => {
    return projectionData.map((item) => ({
      month: new Date(item.period_end).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      paid: Number(item.paid || 0),
      remaining: Number(item.remaining || 0),
      type: item.type || "actual", // ✅ preserved
    }));
  }, [projectionData]);

  // Projection totals for stat cards
  const projectionStats = useMemo(() => {
    if (!selectedProjectionAgreement) {
      return {
        totalContractValue: 0,
        totalCommission: 0,
        paid: 0,
        remaining: 0,
      };
    }

    const contractTerm =
      Number(selectedProjectionAgreement.contractTerm) || 0;

    const sellingPrice =
      Number(selectedProjectionAgreement.sellingPrice) || 0;

    const mrc = Number(selectedProjectionAgreement.mrc) || 0;

    const commissionPct =
      Number(selectedProjectionAgreement.commission_percentage) || 0;

    const totalContractValue = sellingPrice * contractTerm;

    const totalCommission = projectionChartData.reduce(
      (sum, m) => sum + m.paid + m.remaining,
      0
    );

    const paid = projectionChartData.reduce(
      (sum, m) => sum + m.paid,
      0
    );

    const remaining = projectionChartData.reduce(
      (sum, m) => sum + m.remaining,
      0
    );

    return {
      totalContractValue,
      totalCommission,
      paid,
      remaining,
    };
  }, [selectedProjectionAgreement, projectionChartData]);

  // ============================================================================
  // 10. RENDER
  // ============================================================================

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-accent"></span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  // Main render
  return (
    <div className="p-6 bg-base-200 min-h-screen">
      <div className="max-w-7xl mx-auto card bg-white dark:bg-gray-800 shadow-xl p-8">
        {/* Header: View Title + Kill Switch Panel */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold capitalize">{activeView}</h2>

          {canFilterBySalesPerson && (
            <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-lg shadow-sm">
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {getCountdownLabel()}
              </div>

              {autoPayoutEnabled === null ? (
                <button
                  disabled
                  className="px-3 py-1 rounded text-sm font-semibold bg-gray-400 text-white opacity-70 cursor-not-allowed"
                >
                  LOADING…
                </button>
              ) : (
                <button
                  onClick={handleToggleAutoPayout}
                  className={`px-3 py-1 rounded text-sm font-semibold transition ${
                    autoPayoutEnabled
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {autoPayoutEnabled
                    ? "AUTO PAYOUT ENABLED"
                    : "AUTO PAYOUT DISABLED"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* View Selector + Filters */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="hidden md:inline-flex join">
            {VIEWS.map((v) => (
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

          <div className="flex gap-2 items-center">
            {/* Month Filter */}
            <select
              className="select select-bordered select-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>

            {/* Year Filter */}
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

            {/* Salesperson Filter */}
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

            {/* Filter Active Indicator */}
            {(selectedMonth || selectedYear || selectedSalesPerson) && (
              <span className="px-3 py-1 rounded-full bg-warning text-black text-sm">
                Filter Active
              </span>
            )}
          </div>
        </div>

        {/* Views */}
        {activeView === "Agreements" && (
          <AgreementsTable
            filteredCommissions={filteredCommissions}
            commissions={commissions}
            editedCommissions={editedCommissions}
            setEditedCommissions={setEditedCommissions}
            expandedRow={expandedRow}
            toggleRow={(id) =>
              setExpandedRow((prev) => (prev === id ? null : id))
            }
            statusColors={STATUS_COLORS}
            userRole={userRole}
            applyButtonLoading={applyButtonLoading}
            pauseButtonLoading={pauseButtonLoading}
            resumeButtonLoading={resumeButtonLoading}
            can={canPerformAction}
            onApply={handleApplyCommission}
            onPause={handlePauseCommission}
            onResume={handleResumeCommission}
            onCancel={handleCancelCommission}
          />
        )}

        {activeView === "Earned" && (
          <EarningsTable
            filteredEarnings={filteredEarnings}
            statusColors={STATUS_COLORS}
            canFilterBySalesPerson={canFilterBySalesPerson}
            totalEarned={totalEarned}
            getLedgerActions={getLedgerActions}
            onLedgerAction={handleLedgerAction}
          />
        )}

        {activeView === "Payouts" && (
          <PayoutsTable
            filteredPayouts={filteredPayouts}
            statusColors={STATUS_COLORS}
            totalsByStatus={totalsByStatus}
          />
        )}

        {activeView === "Projections" && (
          <div className="space-y-6">
            {projectionAgreements.length === 0 ? (
              <p className="text-center text-gray-500">
                No agreements available for projections.
              </p>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Circuit:</span>
                    <select
                      value={selectedProjectionCommissionId ?? ""}
                      onChange={(e) =>
                        setSelectedProjectionCommissionId(String(e.target.value))
                      }
                      className="select select-bordered select-sm"
                    >
                      {projectionAgreements.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.circuitNumber ? `${c.circuitNumber}` : `ID ${c.id}`} - {c.salesperson_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-sm text-gray-600">
                    Showing projections for the selected circuit agreement.
                  </div>
                </div>

                {selectedProjectionAgreement && (
                  <>
                    <div className="flex flex-wrap gap-4 mb-6">
                      <StatCard
                        title="Total Contract Value"
                        amount={projectionStats.totalContractValue}
                      />
                      <StatCard
                        title="Total Commission"
                        amount={projectionStats.totalCommission}
                      />
                      <StatCard
                        title="Commission Paid"
                        amount={projectionStats.paid}
                      />
                      <StatCard
                        title="Commission Remaining"
                        amount={projectionStats.remaining}
                      />
                    </div>

                    <CommissionTimelineChart data={projectionChartData} />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Commissions;
