import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function MonthlyChart({ data }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <h3>Monthly Earned vs Paid</h3>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => `R ${value.toLocaleString()}`} />
          <Tooltip formatter={(value) => `R ${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="earned" name="Earned" fill="#82ca9d" />
          <Bar dataKey="paid" name="Paid" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
