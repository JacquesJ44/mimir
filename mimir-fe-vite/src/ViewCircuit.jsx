import axios from "./AxiosInstance.js";
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ViewHandover from "./ViewHandover.jsx";

const ViewCircuit = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [file, setFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        window.scrollTo(0, 0);
        const res = await axios.get(`/api/circuits/viewcircuit/${id}`);
        setData(res.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load circuit data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <p className="text-center mt-10">Loading circuit details...</p>;
  if (error) return <p className="text-center text-red-600 mt-10">{error}</p>;
  if (!data) return <p className="text-center mt-10">No circuit data found.</p>;

  return (
    <>
      {file ? (
        <ViewHandover element={data.doc} />
      ) : (
        <div className="mt-10 sm:mt-0">
          <div className="md:grid md:grid-cols-1 md:gap-6">
            <div className="mt-5 md:mt-0 md:col-span-1">
              <div className="shadow px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="md:grid md:grid-cols-3 md:gap-6 py-3">
                  <div className="md:col-span-1 text-left">
                    <h3 className="text-lg font-medium leading-6 text-white-900">{data.id}</h3>
                  </div>

                  <div className="mt-5 md:mt-0 md:col-span-2 text-left">
                    <strong>{data.vendor} | {data.circuitType}</strong>
                    <div className="mt-5 text-left space-y-2">
                      <p><strong>Circuit Number:</strong> {data.circuitNumber}</p>
                      <p><strong>Circuit Owner:</strong> {data.circuitOwner}</p>
                      <p><strong>Client/Internal:</strong> {data.usageFlag}</p>
                      <p><strong>Speed:</strong> {data.speed}</p>
                      <p><strong>ENNI:</strong> {data.enni}</p>
                      <p><strong>VLAN ID:</strong> {data.vlan}</p>
                      <p><strong>Contract Start:</strong> {data.startDate ? new Date(data.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                      <p><strong>Contract Term:</strong> {data.contractTerm === "Month-to-Month" ? 'Month-to-Month' : `${data.contractTerm} months`}</p>
                      <p><strong>Contract End:</strong> {data.endDate ? new Date(data.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                      <p><strong>Site A:</strong> {data.siteA_name}</p>
                      <p><strong>Site B:</strong> {data.siteB_name}</p>
                      <p><strong>MRC:</strong> R{data.mrc}</p>
                      <p><strong>Selling Price:</strong> R{data.sellingPrice}</p>
                      <p><strong>Comments:</strong> {data.comments}</p>
                      <p><strong>Status:</strong> {data.status}</p>
                      <p><strong>Sales Person:</strong> {data.salesPerson_name} {data.salesPerson_surname}</p>
                      {/* <p><strong>Commission:</strong> {data.commission}%</p> */}
                      <p>
                        <strong>Document:</strong>{" "}
                        <button onClick={() => setFile(true)} className="text-black-600 underline">
                          {data.doc}
                        </button>
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="px-4 py-3 bg-black-50 text-right sm:px-6 flex justify-between">
                  <Link to={`/circuits/updatecircuit/${id}`}>
                    <button className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 mr-1">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Update
                    </button>
                  </Link>

                  <Link to="/circuits">
                    <button className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
    )}
    </>
  );
};

export default ViewCircuit;