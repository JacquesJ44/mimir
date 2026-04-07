import React from "react";
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell} from "recharts";

function CommissionTimelineChart({ data }) {
  const formatCurrency = (v) => `R ${Number(v).toLocaleString()}`;

  return (
    <div style={{ width: "100%", height: 350 }}>
      <h3 className="font-semibold mb-2">Commission Timeline</h3>

      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
        >
          <XAxis dataKey="month"/>

          <YAxis tickFormatter={(v) => `R${v}`} />

          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name]}
            labelFormatter={(label) => `Month: ${label}`}
          />

          <Legend />

          {/* Paid */}
          <Bar dataKey="paid" name="Paid" stackId="a" fill="#22c55e">
          {data.map((entry, index) => (
            <Cell
              key={`paid-${index}`}
              fill={entry.type === "projected" ? "#86efac" : "#22c55e"}
            />
          ))}
        </Bar>

          {/* Remaining */}
          <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#ef4444">
            {data.map((entry, index) => (
              <Cell
                key={`remaining-${index}`}
                fill={entry.type === "projected" ? "#fca5a5" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CommissionTimelineChart;