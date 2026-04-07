import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";

export default function PipelineChart({ data }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <h3>Commission Pipeline</h3>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <XAxis dataKey="status" />
          <YAxis tickFormatter={(value) => `R ${value.toLocaleString()}`} />
          <Tooltip formatter={(value) => `R ${value.toLocaleString()}`} />
          <Bar dataKey="total" fill="#ffc658">
            <LabelList
              dataKey="total"
              formatter={(value) => `R ${value.toLocaleString()}`}
              position="top"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}