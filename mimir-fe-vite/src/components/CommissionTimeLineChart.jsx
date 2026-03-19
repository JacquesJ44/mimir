import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

function CommissionTimelineChart({ data }) {

  const formatCurrency = (v) => `R ${Number(v).toLocaleString()}`;

  return (
    <div style={{ width: "100%", height: 350 }}>
      <h3 className="font-semibold mb-2">Commission Timeline</h3>

      <ResponsiveContainer>
        <BarChart
          layout="horizontal"
          data={data}
          margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
        >

          <XAxis
            type="category"
            dataKey="month"
            width={80}
          />

          <YAxis
            type="number"
            tickFormatter={(v) => `R${v}`}
          />

          <Tooltip formatter={(v) => formatCurrency(v)} />

          <Legend />

          <Bar
            dataKey="paid"
            name="Paid"
            stackId="a"
            fill="#4ade80"
          />

          <Bar
            dataKey="remaining"
            name="Remaining"
            stackId="a"
            fill="#f87171"
          />

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CommissionTimelineChart;