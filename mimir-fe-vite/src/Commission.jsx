// src/pages/Commissions.js
import React, { useEffect, useState } from "react";
import axios from "./AxiosInstance"; 

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const res = await axios.get("/api/commissions");
        setCommissions(res.data);
        console.log("Fetched commissions:", res.data);
      } catch (err) {
        console.error("Error fetching commissions:", err);
        setError("Failed to load commissions.");
      } finally {
        setLoading(false);
      }
    };

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

  return (
    <div className="p-6 bg-base-200 min-h-screen">
  <div className="max-w-7xl mx-auto card bg-white dark:bg-gray-800 shadow-xl p-8">
    <h2 className="text-2xl font-semibold mb-6 text-center">
      Commission Overview
    </h2>

    {commissions.length === 0 ? (
      <p className="text-center text-gray-500">No commissions found.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Salesperson</th>
              <th>Circuit Number</th>
              {/* <th>Vendor</th> */}
              {/* <th>Site A</th> */}
              <th>Client</th>
              <th>GP (R)</th>
              {/* <th>MRC (R)</th> */}
              {/* <th>Selling Price (R)</th> */}
              <th>Commission (%)</th>
              <th>Commission (R)</th>
              <th>Contract (Months)</th>
              <th>Activation Date</th>
              <th>First Payment Date</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Created</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.salesperson_name}</td>
                <td>{c.circuitNumber || "-"}</td>
                {/* <td>{c.vendor || "-"}</td> */}
                {/* <td>{c.siteA || "-"}</td> */}
                <td>{c.siteB_name|| "-"}</td>
                <td>{c.gp ? `R${Number(c.gp).toFixed(2)}` : "-"}</td>
                {/* <td>{c.mrc ? `R${Number(c.mrc).toFixed(2)}` : "-"}</td> */}
                {/* <td>{c.selling_price ? `R${Number(c.selling_price).toFixed(2)}` : "-"}</td> */}
                <td>{c.commission_percentage ? `${c.commission_percentage}%` : "-"}</td>
                <td>{c.commission_value ? `R${Number(c.commission_value).toFixed(2)}` : "-"}</td>
                <td>{c.contract_months || "-"}</td>
                <td>{c.activation_date ? new Date(c.activation_date).toLocaleDateString() : "-"}</td>
                <td>{c.first_payment_date ? new Date(c.first_payment_date).toLocaleDateString() : "-"}</td>
                <td>{c.status || "-"}</td>
                <td>{c.notes || "-"}</td>
                <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}</td>
                <td>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>

  );
};

export default Commissions;
