import React, { useEffect, useState } from "react";
import axios from "./AxiosInstance";
import MonthlyChart from "./components/MonthlyChart";
import PipelineChart from "./components/PipelineChart";
import SalesLeaderboard from "./components/SalesLeaderboard";
import StatCard from "./components/StatCard";

function CommissionDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("/api/commissions/analytics/dashboard")
      .then(res => setData(res.data))
      .catch(err => console.error("Dashboard API error:", err));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      
      {/* === Stat Cards Row === */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        <StatCard title="Outstanding Commission" amount={data.outstanding.outstanding} />
      </div>

      {/* === Charts Row === */}
      {/* <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "30px"
      }}>
        <MonthlyChart data={data.monthly_summary} />
        <PipelineChart data={data.pipeline} />
        <SalesLeaderboard data={data.salespeople} />
      </div> */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        gap: "30px",
        overflowX: "auto",
        paddingBottom: "10px"
      }}>

        <div style={{ width: 400, height: 500 }}>
          <MonthlyChart data={data.monthly_summary} />
        </div>
        <div style={{ width: 400, height: 500 }}>
          <PipelineChart data={data.pipeline} />
        </div>
        <div style={{ width: 400, height: 500 }}>
          <SalesLeaderboard data={data.salespeople} />
        </div>
      </div>
    </div>
  );
}

export default CommissionDashboard;