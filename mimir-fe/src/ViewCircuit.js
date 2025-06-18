import axios from "./AxiosInstance.js";
import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import ViewHandover from "./ViewHandover.js";

const ViewCircuit = () => {

    const [data, setData] = useState([])
    const [file, setFile] = useState(false)
    const {id}  = useParams()

    useEffect(() => {
        window.scrollTo(0,0)
    
        axios.get(`/api/circuits/viewcircuit/${id}`)
        .then(response => {
          const data = response.data;
            setData(data);
            // console.log(data);
          })
        .catch(error => {
          console.error('Error fetching data:', error);
        })
      },[id])


    return ( 
        <>
        { file ? <ViewHandover element={data.doc}/>
      :
      <div className="mt-10 sm:mt-0">
        <div className="md:grid md:grid-cols-1 md:gap-6">
          <div className="mt-5 md:mt-0 md:col-span-1">
            <div className=" shadow px-4 py-5 sm:rounded-lg sm:p-6">

              <div className="md:grid md:grid-cols-3 md:gap-6 py-3">
                <div className="md:col-span-1 text-left">
                  <h3 className="text-lg font-medium leading-6 text-white-900">{data.id}</h3>
                </div>

                <div className="mt-5 md:mt-0 md:col-span-2 text-left">
                  <strong>{data.vendor} | {data.circuitType}</strong>
                  <div className="mt-5 md:mt-0 md:col-span-2 text-left"> 
                    <strong>Circuit Number:  </strong> { data.circuitNumber }<br/> 
                    <strong>Speed:  </strong>{ data.speed }<br/>
                    <strong>ENNI:  </strong>{ data.enni }<br/>
                    <strong>VLAN ID:  </strong>{ data.vlan }<br/>
                    <strong>Contract Start:  </strong>{data.startDate ?
                            new Date(data.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : 'N/A'}<br/>
                    <strong>Contract Term:  </strong>{ data.contractTerm } months<br/>
                    <strong>Contract End: </strong>{data.endDate ?
                            new Date(data.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : 'N/A'}<br/>
                    <strong>Site A:  </strong>{ data.siteA_name }<br/>
                    <strong>Site B:  </strong>{ data.siteB_name }<br/>
                    <strong>MRC:  </strong>R{ data.mrc }<br/>
                    <strong>Comments:  </strong>{ data.comments }<br/>
                    <strong>Status:  </strong>{ data.status }<br/>
                    <strong>Document:
                      <button onClick={(e) => {setFile(true)}}>{ data.doc }</button>   
                    {/* <a href={file} target="_blank" rel='noopener noreferrer' >{ data.doc }</a> */}
                    </strong>
                    <br/>
                  </div>
                </div>

              </div>
              <hr/>

              <div className="px-4 py-3 bg-black-50 text-right sm:px-6 flex justify-between">
                <Link to={"/circuits/updatecircuit/" + id}>
                  <button 
                    className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    Update
                  </button>
                </Link>

                <Link to="/circuits">
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
  }
    </>
     );
}
 
export default ViewCircuit;