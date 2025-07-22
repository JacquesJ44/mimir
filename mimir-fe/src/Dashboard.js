
import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import axios from "./AxiosInstance"; // adjust path if needed

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


const Dashboard = () => {
  const [data, setData] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorCircuits, setVendorCircuits] = useState([]);
  const [loadingCircuits, setLoadingCircuits] = useState(false);

  // Export table
  const exportToCSV = () => {
  const rows = vendorCircuits.map((c) => {
    const gp = c.sellingPrice - c.mrc;
    const margin = c.sellingPrice ? ((gp / c.sellingPrice) * 100).toFixed(1) : "0";
    const formatDate = (dateStr) =>
      dateStr
        ? new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'N/A';

    return {
      "Circuit Number": c.circuitNumber,
      "Type": c.circuitType,
      "Client": c.siteB_name,
      "Status": c.status,
      "End Date": formatDate(c.endDate),
      "MRC": `R${c.mrc}`,
      "Selling Price": `R${c.sellingPrice}`,
      "Gross Profit": `R${gp}`,
      "Margin %": `${margin}%`
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Circuits");
  const csvOutput = XLSX.write(workbook, { bookType: "csv", type: "array" });
  saveAs(new Blob([csvOutput], { type: "text/csv;charset=utf-8;" }), "circuits.csv");
};

const exportToExcel = () => {
  const rows = vendorCircuits.map((c) => {
    const gp = c.sellingPrice - c.mrc;
    const margin = c.sellingPrice ? ((gp / c.sellingPrice) * 100).toFixed(1) : "0";
    const formatDate = (dateStr) =>
      dateStr
        ? new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'N/A';

    return {
      "Circuit Number": c.circuitNumber,
      "Type": c.circuitType,
      "Client": c.siteB_name,
      "Status": c.status,
      "End Date": formatDate(c.endDate),
      "MRC": c.mrc,
      "Selling Price": c.sellingPrice,
      "Gross Profit": gp,
      "Margin %": parseFloat(margin),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Circuits");
  const excelOutput = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([excelOutput], { type: "application/octet-stream" }), "circuits.xlsx");
};

const exportToPDF = () => {
  const doc = new jsPDF();
  const tableColumn = [
    "Circuit Number", "Type", "Client", "Status", "End Date",
    "MRC", "Selling Price", "Gross Profit", "Margin %"
  ];

  const tableRows = [];

  let totalMRC = 0;
  let totalSelling = 0;
  let totalGP = 0;

  vendorCircuits.forEach((c) => {
    const mrc = Number(c.mrc) || 0;
    const sellingPrice = Number(c.sellingPrice) || 0;
    const gp = sellingPrice - mrc;
    const margin = sellingPrice ? ((gp / sellingPrice) * 100).toFixed(1) : "0";

    totalMRC += mrc;
    totalSelling += sellingPrice;
    totalGP += gp;

    const formatDate = (dateStr) =>
      dateStr
        ? new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'N/A';

      tableRows.push([
        c.circuitNumber || 'N/A',
        c.circuitType || 'N/A',
        c.siteB_name || 'N/A',
        c.status || 'N/A',
        formatDate(c.endDate),
        `R${mrc.toFixed(2)}`,
        `R${sellingPrice.toFixed(2)}`,
        `R${gp.toFixed(2)}`,
        `${margin}%`,
      ]);
    });

    const totalMargin = totalSelling
      ? ((totalGP / totalSelling) * 100).toFixed(1)
      : "0";

    tableRows.push([
      "Total", "", "", "", "",
      `R${totalMRC.toFixed(2)}`,
      `R${totalSelling.toFixed(2)}`,
      `R${totalGP.toFixed(2)}`,
      `${totalMargin}%`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
    });

    doc.save("vendor-circuits.pdf");
  };


  useEffect(() => {
    axios
      .get("/api/dashboard")
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
    const total = data.find(d => d.vendor === vendor)?.total ?? 0;
    
    const handleClick = () => {
      setSelectedVendor(vendor);
      setLoadingCircuits(true);
      
      axios.get(`/api/dashboard/vendor/${vendor}`)
      .then((res) => {
        setVendorCircuits(res.data);
      })
      .catch(console.error)
      .finally(() => setLoadingCircuits(false));
    };
    
    return (
      <g transform={`translate(${x},${y})`} onClick={handleClick} className="cursor-pointer">
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#007bff" fontSize={12}>
          {vendor}
        </text>
        <text x={0} y={20} dy={16} textAnchor="middle" fill="#666" fontSize={11}>
          {total}
        </text>
      </g>
    );
  };

  return (
    <div className="w-screen px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 w-full max-w-[1400px] mx-auto">
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

      {selectedVendor && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-2">Circuits for {selectedVendor} - {vendorCircuits.length} found</h3>
          <div className="flex gap-4 mb-4">
            <button onClick={exportToCSV} className="btn btn-sm btn-outline btn-accent">Export CSV</button>
            <button onClick={exportToExcel} className="btn btn-sm btn-outline btn-success">Export Excel</button>
            <button onClick={exportToPDF} className="btn btn-sm btn-outline btn-error">Export PDF</button>
          </div>
          {loadingCircuits ? (
            <p>Loading...</p>
          ) : (
            
            <table className="table w-full table-zebra border border-slate-300 rounded-lg">
              <thead className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800">
                <tr>
                  <th>Circuit Number</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>End Date </th>
                  <th>MRC</th>
                  <th>Selling Price</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {vendorCircuits.map((c, idx) => {
                  const gp = c.sellingPrice - c.mrc;
                  const margin = c.sellingPrice ? ((gp / c.sellingPrice) * 100).toFixed(1) : "0";

                  return (
                    <tr key={idx} className="hover">
                      <td>{c.circuitNumber}</td>
                      <td>{c.circuitType}</td>
                      <td>{c.siteB_name}</td>
                      <td>{c.status}</td>
                      <td>{c.endDate ?
                                new Date(c.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                                : 'N/A'}</td>
                      <td>R{c.mrc}</td>
                      <td>R{c.sellingPrice}</td>
                      <td>R{gp}</td>
                      <td>{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800 font-semibold">
                <tr>
                  <td colSpan={5}>Totals</td>
                  <td>
                    R{Number(
                      vendorCircuits.reduce((sum, c) => sum + (Number(c.mrc) || 0), 0)
                    ).toFixed(2)}
                  </td>
                  <td>
                    R{Number(
                      vendorCircuits.reduce((sum, c) => sum + (Number(c.sellingPrice) || 0), 0)
                    ).toFixed(2)}
                  </td>
                  <td>
                    R{Number(
                      vendorCircuits.reduce((sum, c) => sum + ((Number(c.sellingPrice) || 0) - (Number(c.mrc) || 0)), 0)
                    ).toFixed(2)}
                  </td>
                  <td>
                    {vendorCircuits.length > 0
                      ? Number(
                          vendorCircuits.reduce((sum, c) => {
                            const mrc = Number(c.mrc) || 0;
                            const sp = Number(c.sellingPrice) || 0;
                            const gp = sp - mrc;
                            const margin = sp ? (gp / sp) * 100 : 0;
                            return sum + margin;
                          }, 0) / vendorCircuits.length
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

