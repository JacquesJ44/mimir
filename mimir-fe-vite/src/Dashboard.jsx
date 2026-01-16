
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
  const headers = [
    "Circuit #",
    "Type",
    "Client",
    "Usage",
    "Status",
    "End Date",
    "Cost Price",
    "Selling Price",
    "Gross Profit",
    "GP %",
  ];

  const rows = vendorCircuits.map((c) => {
    const isClient = c.usageFlag === "Client" && c.sellingPrice != null;
    const gp = isClient ? (c.sellingPrice - c.mrc).toFixed(2) : "N/A";
    const markup = isClient ? ((gp / c.mrc) * 100).toFixed(1) + "%" : "N/A";

    return [
      c.circuitNumber,
      c.circuitType,
      c.siteB_name,
      c.usageFlag,
      c.status,
      c.endDate
        ? new Date(c.endDate).toLocaleDateString("en-GB")
        : "N/A",
      `R${(Number(c.mrc) || 0).toFixed(2)}`,
      c.sellingPrice != null ? `R${Number(c.sellingPrice).toFixed(2)}` : "N/A",
      isClient ? `R${gp}` : "N/A",
      markup,
    ];
  });

  // Totals
  const clientCircuits = vendorCircuits.filter(
    (c) => c.usageFlag === "Client" && c.sellingPrice != null
  );
  const internalCircuits = vendorCircuits.filter(
    (c) => c.usageFlag === "Internal"
  );

  const totalMRCClient = clientCircuits.reduce(
    (sum, c) => sum + Number(c.mrc),
    0
  );
  const totalSPClient = clientCircuits.reduce(
    (sum, c) => sum + Number(c.sellingPrice),
    0
  );
  const totalGPClient = totalSPClient - totalMRCClient;
  const totalMarkupClient = totalMRCClient
    ? ((totalGPClient / totalMRCClient) * 100).toFixed(1) + "%"
    : "0%";

  const totalMRCInternal = internalCircuits.reduce(
    (sum, c) => sum + Number(c.mrc),
    0
  );

  rows.push([
    "Total (Client)",
    "",
    "",
    "",
    "",
    "",
    `R${totalMRCClient.toFixed(2)}`,
    `R${totalSPClient.toFixed(2)}`,
    `R${totalGPClient.toFixed(2)}`,
    totalMarkupClient,
  ]);

  rows.push([
    "Total (Internal)",
    "",
    "",
    "",
    "",
    "",
    `R${totalMRCInternal.toFixed(2)}`,
    "N/A",
    "N/A",
    "N/A",
  ]);

  const csvContent =
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "vendor_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


const exportToExcel = () => {
  const rows = vendorCircuits.map((c) => {
    const gp = c.usageFlag === "Client" && c.sellingPrice != null
      ? (c.sellingPrice - c.mrc).toFixed(2)
      : "N/A";
    const markup = c.usageFlag === "Client" && c.sellingPrice != null
      ? ((gp / c.mrc) * 100).toFixed(1) + "%"
      : "N/A";

    return {
      "Circuit #": c.circuitNumber,
      "Type": c.circuitType,
      "Client": c.siteB_name,
      "Usage": c.usageFlag,
      "Status": c.status,
      "End Date": c.endDate ? new Date(c.endDate).toLocaleDateString("en-GB") : "N/A",
      "Cost Price": `R${(Number(c.mrc) || 0).toFixed(2)}`,
      "Selling Price": c.sellingPrice != null ? `R${Number(c.sellingPrice).toFixed(2)}` : "N/A",
      "Gross Profit": gp !== "N/A" ? `R${gp}` : "N/A",
      "GP %": markup,
    };
  });

  const clientCircuits = vendorCircuits.filter(c => c.usageFlag === "Client" && c.sellingPrice != null);
  const internalCircuits = vendorCircuits.filter(c => c.usageFlag === "Internal");

  const totalMRCClient = clientCircuits.reduce((sum, c) => sum + Number(c.mrc), 0);
  const totalSPClient = clientCircuits.reduce((sum, c) => sum + Number(c.sellingPrice), 0);
  const totalGPClient = totalSPClient - totalMRCClient;
  const totalMarkupClient = totalMRCClient ? ((totalGPClient / totalMRCClient) * 100).toFixed(1) + "%" : "0%";

  const totalMRCInternal = internalCircuits.reduce((sum, c) => sum + Number(c.mrc), 0);

  rows.push({
    "Circuit #": "Total (Client)",
    "Cost Price": `R${totalMRCClient.toFixed(2)}`,
    "Selling Price": `R${totalSPClient.toFixed(2)}`,
    "Gross Profit": `R${totalGPClient.toFixed(2)}`,
    "GP %": totalMarkupClient,
  });
  rows.push({
    "Circuit #": "Total (Internal)",
    "Cost Price": `R${totalMRCInternal.toFixed(2)}`,
    "Selling Price": "N/A",
    "Gross Profit": "N/A",
    "GP %": "N/A",
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  
  // Set page setup for landscape orientation
  ws['!pageSetup'] = { orientation: "landscape" };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendor Report");
  XLSX.writeFile(wb, "vendor_report.xlsx");
};



const exportToPDF = () => {
  const doc = new jsPDF({ orientation: "landscape" });
  const currentDate = new Date().toLocaleDateString("en-GB");

  // Header
  doc.setFontSize(14);
  doc.setTextColor("#2563EB"); // Tailwind accent-blue
  doc.text("Vendor Circuit Report - " + selectedVendor, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor("#000000");
  doc.text(`Date: ${currentDate}`, 190, 15, { align: "right" });

  // Prepare rows
  const body = vendorCircuits.map((c) => {
    const mrc = Number(c.mrc) || 0;
    const sellingPrice = c.sellingPrice != null ? Number(c.sellingPrice) : null;

    const isClient = c.usageFlag === "Client";

    const gp = isClient && sellingPrice !== null
      ? (sellingPrice - mrc).toFixed(2)
      : "N/A";

    const markup = isClient && sellingPrice !== null
      ? (((sellingPrice - mrc) / mrc) * 100).toFixed(1) + "%"
      : "N/A";

    return [
      c.circuitNumber || "",
      c.circuitType || "",
      c.siteB_name || "",
      c.usageFlag || "",
      c.status || "",
      c.endDate
        ? new Date(c.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "N/A",
      `R${mrc.toFixed(2)}`,
      sellingPrice !== null ? `R${sellingPrice.toFixed(2)}` : "N/A",
      gp,
      markup,
    ];
  });

  // Calculate totals for Client and Internal
  const clientCircuits = vendorCircuits.filter(c => c.usageFlag === "Client" && c.sellingPrice != null);
  const internalCircuits = vendorCircuits.filter(c => c.usageFlag === "Internal");

  const totalMRCClient = clientCircuits.reduce((sum, c) => sum + (Number(c.mrc) || 0), 0);
  const totalSPClient = clientCircuits.reduce((sum, c) => sum + Number(c.sellingPrice), 0);
  const totalGPClient = totalSPClient - totalMRCClient;
  const totalMarkupClient = totalMRCClient ? ((totalGPClient / totalMRCClient) * 100).toFixed(1) + "%" : "0%";

  const totalMRCInternal = internalCircuits.reduce((sum, c) => sum + (Number(c.mrc) || 0), 0);

  // Add total rows
  body.push([
    "Total (Client)", "", "", "", "", "",
    `R${totalMRCClient.toFixed(2)}`,
    `R${totalSPClient.toFixed(2)}`,
    `R${totalGPClient.toFixed(2)}`,
    totalMarkupClient,
  ]);
  body.push([
    "Total (Internal)", "", "", "", "", "",
    `R${totalMRCInternal.toFixed(2)}`,
    "N/A",
    "N/A",
    "N/A",
  ]);

  autoTable(doc, {
    head: [["Circuit #", "Type", "Client", "Usage", "Status", "End Date", "Cost Price", "Selling Price", "Gross Profit", "Gross Profit %"]],
    body,
    startY: 25,
  });

  doc.save("vendor_report.pdf");
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

  const calculateTotalCommission = () => {
    return vendorCircuits
      .filter(c => c.usageFlag === "Client")
      .reduce((sum, c) => {
        const sellingPrice = Number(c.sellingPrice) || 0;
        const commissionRate =
          c.commission === "N/A" || c.commission == null
            ? 0
            : Number(c.commission);
        const commission = sellingPrice * (commissionRate / 100);
        return sum + commission;
      }, 0);
  };

  const calculateTotalGpAfterCommission = () => {
    return vendorCircuits
      .filter(c => c.usageFlag === "Client")
      .reduce((sum, c) => {
        const sellingPrice = Number(c.sellingPrice) || 0;
        const costPrice = Number(c.mrc) || 0;
        const commissionRate =
          c.commission === "N/A" || c.commission == null
            ? 0
            : Number(c.commission);
        const commission = sellingPrice * (commissionRate / 100);
        const gpAfterCommission = sellingPrice - costPrice - commission;
        return sum + gpAfterCommission;
      }, 0);
  };

  return (
    <div className="w-screen px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 w-full max-w-[1400px] mx-auto">
        <h2 className="text-2xl font-bold mb-6">Circuits per Vendor and Type</h2>

        <div className="w-full h-[400px]">
          {data.length > 0 && (
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
          )}
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
                  <th>Usage</th>
                  <th>Status</th>
                  <th>End Date </th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>GP</th>
                  <th>GP %</th>
                  <th>Sales Person</th>
                  <th>Commission %</th>
                  <th>Commission Value</th>
                  <th>GP After Commission</th>
                </tr>
              </thead>
              <tbody>
                {vendorCircuits.map((c, idx) => {
                  const isClient = c.usageFlag === 'Client';
                  const gp = isClient ? (c.sellingPrice - c.mrc).toFixed(2) : null;
                  const markup = isClient ? ((gp / c.mrc) * 100).toFixed(1) : null;
                  const commissionValue = isClient && c.commission != null ? ((c.sellingPrice * c.commission) / 100).toFixed(2) : null;
                  const gpAfterCommission = isClient && gp != null && commissionValue != null ? (gp - commissionValue).toFixed(2) : null;

                  return (
                    <tr key={idx} className="hover">
                      <td>{c.circuitNumber}</td>
                      <td>{c.circuitType}</td>
                      <td>{c.siteB_name}</td>
                      <td>{c.usageFlag}</td>
                      <td>{c.status}</td>
                      <td>
                        {c.endDate
                          ? new Date(c.endDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td>R{c.mrc}</td>
                      <td>{isClient && c.sellingPrice !== null ? `R${c.sellingPrice}` : 'N/A'}</td>
                      <td>{isClient && gp !== null ? `R${gp}` : 'N/A'}</td>
                      <td>{isClient && markup !== null ? `${markup}%` : 'N/A'}</td>
                      <td>{isClient ? c.salesPerson || 'N/A' : 'N/A'}</td>
                      <td>{isClient && c.commission !== null ? `${c.commission}%` : 'N/A'}</td>
                      <td>{isClient && commissionValue !== null ? `R${commissionValue}` : 'N/A'}</td>
                      <td>{isClient && gpAfterCommission !== null ? `R${gpAfterCommission}` : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800 font-semibold">
                {/* Total - Client */}
                <tr>
                  <td colSpan={6}>Total (Client)</td>
                  <td>
                    R{Number(
                      vendorCircuits
                        .filter((c) => c.usageFlag === "Client")
                        .reduce((sum, c) => sum + (Number(c.mrc) || 0), 0)
                    ).toFixed(2)}
                  </td>
                  <td>
                    R{Number(
                      vendorCircuits
                        .filter((c) => c.usageFlag === "Client")
                        .reduce((sum, c) => sum + (Number(c.sellingPrice) || 0), 0)
                    ).toFixed(2)}
                  </td>
                  <td>
                    R{Number(
                      vendorCircuits
                        .filter((c) => c.usageFlag === "Client")
                        .reduce(
                          (sum, c) =>
                            sum + ((Number(c.sellingPrice) || 0) - (Number(c.mrc) || 0)),
                          0
                        )
                    ).toFixed(2)}
                  </td>
                  <td colSpan={3}>
                    {(() => {
                      const clientCircuits = vendorCircuits.filter(
                        (c) => c.usageFlag === "Client"
                      );
                      const totalMRC = clientCircuits.reduce(
                        (sum, c) => sum + (Number(c.mrc) || 0),
                        0
                      );
                      const totalSP = clientCircuits.reduce(
                        (sum, c) => sum + (Number(c.sellingPrice) || 0),
                        0
                      );
                      const totalGP = totalSP - totalMRC;
                      const totalMarkup = totalMRC ? (totalGP / totalMRC) * 100 : 0;
                      return `${totalMarkup.toFixed(1)}%`;
                    })()}
                  </td>
                  <td>R{calculateTotalCommission().toFixed(2)}</td>
                  <td>R{calculateTotalGpAfterCommission().toFixed(2)}</td>
                </tr>

                {/* Total - Internal */}
                <tr>
                  <td colSpan={6}>Total (Internal)</td>
                  <td>
                    R{Number(
                      vendorCircuits
                        .filter((c) => c.usageFlag === "Internal")
                        .reduce((sum, c) => sum + (Number(c.mrc) || 0), 0)
                    ).toFixed(2)}
                  </td>
                  <td colSpan={3} className="text-center">
                    N/A
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

