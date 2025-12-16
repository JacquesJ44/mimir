import axios from "./AxiosInstance.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddSite = () => {

    let navigate = useNavigate()

    const [site, setSite] = useState('');
    const [reference, setReference] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [building, setBuilding] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [suburb, setSuburb] = useState('');
    const [city, setCity] = useState('');
    const [post, setPost] = useState('');
    const [province, setProvince] = useState('');

    const [showSuccess, setShowSuccess] = useState(false)

    const handleSubmit = async e => {
        e.preventDefault();
        try {
          const response = await axios.post('/api/sites/addsite', { site, reference, latitude, longitude, building, street, number, suburb, city, post, province });
        //   console.log(response);
          setShowSuccess(true);
          // Wait 1.5 seconds before reloading
          setTimeout(() => {
          navigate('/sites');
            }, 1500);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.msg) {
                alert(error.response.data.msg);  // "Site already exists"
            } else {
                alert("An unexpected error occurred.");
            }
        }
      };

    // The below are predefined sets of dropdown menus for province
    const provinces = [
        {label: "Eastern Cape", value: "Eastern Cape"},
        {label: "Free State", value: "Free State"},
        {label: "Gauteng", value: "Gauteng"},
        {label: "KwaZulu-Natal", value: "KwaZulu-Natal"},
        {label: "Limpopo", value: "Limpopo"},
        {label: "Mpumalanga", value: "Mpumalanga"},
        {label: "Northern Cape", value: "Northern Cape"},
        {label: "North West", value: "North West"},
        {label: "Western Cape", value: "Western Cape"},
    ]

    return (    
        
        <div className="p-6 bg-base-200 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="card bg-white dark:bg-gray-800 shadow-xl p-8">
                    <h2 className="text-2xl font-semibold mb-6 text-center">Add New Site</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Group 1: Site Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="form-control">
                                <label className="label">
                                <span className="label-text">Site Name</span>
                                </label>
                                <input
                                type="text"
                                placeholder="e.g. AlphaSite001"
                                className="input input-bordered w-full"
                                required
                                value={site}
                                onChange={(e) => setSite(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                <span className="label-text">Internal Reference</span>
                                </label>
                                <input
                                type="text"
                                placeholder="e.g. INT-REF-2025"
                                className="input input-bordered w-full"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                <span className="label-text">Latitude</span>
                                </label>
                                <input
                                type="text"
                                placeholder="-33.9249"
                                className="input input-bordered w-full"
                                required
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                <span className="label-text">Longitude</span>
                                </label>
                                <input
                                type="text"
                                placeholder="18.4241"
                                className="input input-bordered w-full"
                                required
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Group 2: Address Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="form-control">
                            <label className="label">
                            <span className="label-text">Building</span>
                            </label>
                            <input
                            type="text"
                            placeholder="Building A"
                            className="input input-bordered w-full"
                            value={building}
                            onChange={(e) => setBuilding(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                            <span className="label-text">Street</span>
                            </label>
                            <input
                            type="text"
                            placeholder="Main Street"
                            className="input input-bordered w-full"
                            required
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                            <span className="label-text">Street Number</span>
                            </label>
                            <input
                            type="text"
                            placeholder="123"
                            className="input input-bordered w-full"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                            <span className="label-text">Suburb</span>
                            </label>
                            <input
                            type="text"
                            placeholder="Suburbia"
                            className="input input-bordered w-full"
                            value={suburb}
                            onChange={(e) => setSuburb(e.target.value)}
                            />
                        </div>
                        </div>

                        {/* Group 3: City & Province */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="form-control">
                            <label className="label">
                            <span className="label-text">City</span>
                            </label>
                            <input
                            type="text"
                            placeholder="Cape Town"
                            className="input input-bordered w-full"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                            <span className="label-text">Post Code</span>
                            </label>
                            <input
                            type="text"
                            placeholder="8000"
                            className="input input-bordered w-full"
                            required
                            value={post}
                            onChange={(e) => setPost(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label" htmlFor="province">
                            <span className="label-text">Province</span>
                            </label>
                            <select
                            id="province"
                            className="select select-bordered w-full"
                            required
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            >
                            <option disabled value="">Choose an option...</option>
                            {provinces.map((p, i) => (
                                <option key={i} value={p.value}>{p.label}</option>
                            ))}
                            </select>
                        </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-center">
                        <button className="btn btn-accent w-full md:w-1/2 lg:w-1/3">Save</button>
                        </div>

                        {/* Toast Notification */}
                        {showSuccess && (
                        <div className="toast toast-center toast-top">
                            <div className="alert alert-success shadow-lg">
                            <span>Site added successfully!</span>
                            </div>
                        </div>
                        )}
                    </form>
                </div>
            </div>
        </div>

        // <div className="card-body">
        //     <form onSubmit={handleSubmit} className="space-y-8">

        //         {/* Row 1 */}
        //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Site</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Site Name"  
        //                     required
        //                     value = { site }
        //                     onChange={(e) => setSite(e.target.value)}
        //                     />
        //             </div>
                
        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Internal Reference</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Reference"
        //                     value = { reference }
        //                     onChange={(e) => setReference(e.target.value)} 
        //                     />
        //             </div>

        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Latitude</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Latitude"
        //                     required
        //                     value = { latitude }
        //                     onChange={(e) => setLatitude(e.target.value)} 
        //                     />
        //             </div>

        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Longitude</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Longitude"
        //                     required
        //                     value = { longitude }
        //                     onChange={(e) => setLongitude(e.target.value)} 
        //                     />
        //             </div>
        //         </div>

        //         {/* Row 2 */}
        //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Building Name</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Building Name"
        //                     // required
        //                     value = { building }
        //                     onChange={(e) => setBuilding(e.target.value)} 
        //                 />
        //             </div> 
        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Street</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Street"
        //                     required
        //                     value = { street }
        //                     onChange={(e) => setStreet(e.target.value)} 
        //                 />
        //             </div>

        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Number</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Number"
        //                     // required
        //                     value = { number }
        //                     onChange={(e) => setNumber(e.target.value)} 
        //                 />
        //             </div>

        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Suburb</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Suburb"
        //                     // required
        //                     value = { suburb }
        //                     onChange={(e) => setSuburb(e.target.value)} 
        //                 />
        //             </div>
        //         </div>

        //         {/* Row 3 */}
        //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">City</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="City"
        //                     required
        //                     value = { city }
        //                     onChange={(e) => setCity(e.target.value)} 
        //                 />
        //             </div>

        //             <div className="form-control">
        //                 <label className="label">
        //                     <span className="label-text">Post Code</span>    
        //                 </label>
        //                 <input className="input input-bordered"
        //                     type="text" 
        //                     placeholder="Post Code"
        //                     required
        //                     value = { post }
        //                     onChange={(e) => setPost(e.target.value)} 
        //                 />
        //             </div>
                    
        //             <div className="form-control">
        //                 <label htmlFor="province" className="label">
        //                     <span className="label-text">Province</span>
        //                 </label>
        //                 <select onChange={(e) => {setProvince(e.target.value)}} id="province" className="input input-bordered" defaultValue='null'>
        //                 <option value="null">Choose an option...</option>
        //                         {provinces.map((p, index) => {
        //                             return (
        //                                 <option key={index} value={p.value}>{p.label}</option>
        //                             )
        //                         })}
        //                 </select>
        //             </div>
        //         </div>
                
        //         <div className="form-control">
        //             <button className="btn btn-accent w-full lg:w-1/3 mx-auto">Save</button>
        //         </div>

        //         {showSuccess && (
        //             <div className="toast">
        //                 <div className="alert alert-success">
        //                     <span>Site added successfully!</span>
        //                 </div>
        //             </div>
        //         )}

        //     </form>
        // </div>
    );
}
 
export default AddSite;
