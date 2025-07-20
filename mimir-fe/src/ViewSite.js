import axios from "./AxiosInstance.js";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from 'react-router-dom';

const ViewSite = () => {

    const [data, setData] = useState([])
    const {site}  = useParams()
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0,0)
    
        axios.get(`/mimir/api/sites/viewsite/${site}`)
        .then(response => {
          const data = response.data;
            setData(data);
            // console.log(data);
          })
        .catch(error => {
          console.error('Error fetching data:', error);
        })
      },[site])


      const handleDelete = async () => {
        const confirmed = window.confirm(`Are you sure you want to delete the site "${site}"?`);
        if (!confirmed) return;

        try {
          const response = await axios.delete(`/mimir/api/sites/viewsite/${site}`);
          if (response.data.msg === "Deleted!") {
            alert("Site deleted successfully.");
            navigate("/sites");
          } else {
            alert("Error: " + JSON.stringify(response.data));
          }
        } catch (error) {
          console.error("Delete failed:", error);
          alert("Failed to delete the site.");
        }
      };

      return ( 
        <>
      <div className="mt-10 sm:mt-0">
        <div className="md:grid md:grid-cols-1 md:gap-6">
          <div className="mt-5 md:mt-0 md:col-span-1">
            <div className="shadow px-4 py-5 sm:rounded-lg sm:p-6">
            {'msg' in data ? (
            <div className="md:grid md:grid-cols-3 md:gap-6 py-3">
                <div className="md:col-span-1 text-left"></div>
            <h3 className="text-lg font-medium leading-6 text-white-900">{data.msg}</h3>
            </div>
             ) : (
              <div className="md:grid md:grid-cols-3 md:gap-6 py-3">
                <div className="md:col-span-1 text-left">
                  <h3 className="text-lg font-medium leading-6 text-white-900">{data.site}</h3>
                </div>

                <div className="mt-5 md:mt-0 md:col-span-2 text-left">
                  {data.latitude} {data.longitude}
                  <div className="mt-5 md:mt-0 md:col-span-2 text-left">
                    { data.reference }<br/>
                    { data.building }<br/> 
                    { data.street } { data.number }<br/>
                    { data.suburb }<br/>
                    { data.city }<br/>
                    { data.postcode }<br/>
                    { data.province }<br/>
                  </div>
                </div>
              </div>
             )}
              <hr/>

              <div className="px-4 py-3 bg-black-50 text-right sm:px-6 flex justify-between">
                <button
                  onClick={handleDelete}
                  className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                  Delete
                </button>

                <Link to="/sites">
                  <button
                    className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back
                  </button>
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
     );
}
 
export default ViewSite;