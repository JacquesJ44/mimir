
import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import axios from "./AxiosInstance"; // adjust path if needed

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    axios
      .get("/mimir/api/dashboard")
      .then((res) => {
        const transformed = {};
        const typeSet = new Set();

        res.data.forEach(({ vendor, circuitType, count }) => {
          if (!transformed[vendor]) {
            transformed[vendor] = { vendor, total: 0 };
          }
          transformed[vendor][circuitType] = count;
          transformed[vendor].total += count;
          typeSet.add(circuitType);
        });

        setData(Object.values(transformed)); // already grouped with totals
        setTypes([...typeSet]);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
      });
  }, []);

  const getColor = (type) => {
    const palette = [
      "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c",
      "#d0ed57", "#8dd1e1", "#83a6ed", "#ffbb28", "#d88884"
    ];
    const index = [...types].indexOf(type);
    return palette[index % palette.length];
  };

  // console.log("data: ", data)

  // Adding a custom tick component to display total circuits with each vendor
  const CustomTick = ({ x, y, payload }) => {
    const vendor = payload.value;
    const vendorData = data.find(d => d.vendor === vendor);
    const total = vendorData?.total ?? 0;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
          {vendor}
        </text>
        <text x={0} y={20} dy={16} textAnchor="middle" fill="#999" fontSize={11}>
          {total}
        </text>
      </g>
    );
  };

  return (
    <div className="w-screen px-4 py-6">
    <div className="bg-white rounded-2xl shadow p-6 w-full max-w-[1400px] mx-auto">
      <h2 className="text-2xl font-bold mb-6">Circuits per Vendor and Type</h2>

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}> 
            <XAxis dataKey="vendor" tick={<CustomTick />} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {/* <Legend /> */}
            {types.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="a"
                fill={getColor(type)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
  );
};

export default Dashboard;

