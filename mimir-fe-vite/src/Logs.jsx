import { useEffect, useState } from "react";
import axios from "./AxiosInstance";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get("/api/logs")
      .then((res) => {
        setLogs(res.data)
        // console.log("Fetched logs:", res.data);
  })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">System Logs</h2>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="p-2 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
            <strong>{log.details}</strong> — {log.action} by {log.user_id} on table {log.target_table} {log.target_id}<span className="text-gray-500">({log.timestamp})</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LogsPage;