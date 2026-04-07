import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";

export default function SalesLeaderboard({ data }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <h3>Top Salespeople</h3>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis type="number" tickFormatter={(value) => `R ${value.toLocaleString()}`} />
          <YAxis type="category" dataKey="name" />
          <Tooltip formatter={(value) => `R ${value.toLocaleString()}`} />
          <Bar dataKey="total_commission" fill="#82ca9d">
            <LabelList
              dataKey="total_commission"
              formatter={(value) => `R ${value.toLocaleString()}`}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}