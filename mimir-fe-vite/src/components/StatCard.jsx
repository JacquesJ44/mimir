import React from "react";

export default function StatCard({ title, amount }) {
  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px",
      width: "250px",
      textAlign: "center",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
    }}>
      <h4>{title}</h4>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>R {amount.toLocaleString()}</p>
    </div>
  );
}