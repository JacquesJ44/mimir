import axios from "./AxiosInstance.js";
import { useState } from "react";
import { Link } from 'react-router-dom';
import { ListFilter, Plus, MapPin, Landmark, Globe, StretchHorizontal, Fence, Building, Building2 } from "lucide-react";

const Sites = () => {

    const [site, setSite] = useState('');
    const [reference, setReference] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [street, setStreet] = useState('');
    const [suburb, setSuburb] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');

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

    const [data, setData] = useState([])
    const handleSubmit = (e) => {
        e.preventDefault()
        const form = {
            site: site,
            reference: reference,
            latitude: latitude,
            longitude: longitude,
            street: street,
            suburb: suburb,
            city: city,
            province: province,
        };
        axios.post('/mimir/api/sites', form, { withCredentials: true })
        .then(res => {
            setData(res.data);
        })
        .catch(err => {
            console.error('Error:', err.response ? err.response.data : err);
            alert(err.response?.data?.error || 'Something went wrong');
        })
        .catch((error) => {
            console.error("Search error:", error);
            alert("Something went wrong while searching.");
        });
    }

    return ( 

        <div className="card-body bg-white dark:bg-gray-900 shadow-md rounded-md w-full max-w-8xl mx-auto p-6">

            {/* Add Site button */}
            <div className="flex justify-end mb-6">
                <Link to='/sites/addsite' className="btn btn-accent w-full sm:w-auto px-6 flex items-center gap-2">
                <Plus size={18} /> Add Site
                </Link>
            </div>
        
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4">Filter Sites</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

                    {/* Site */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Site</span>
                        </label> */}
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            {/* <SiteSelector
                                        label="Site A"
                                        value={siteA}
                                        setValue={setSiteA}
                                        setId={setSiteAId}
                                    /> */}
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Site name"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Reference */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Reference</span>
                        </label> */}
                        <div className="relative">
                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Reference"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Longitude */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Latitude</span>
                        </label> */}
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Latitude"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Longitude */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Longitude</span>
                        </label> */}
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Longitude"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Street */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Street</span>
                        </label> */}
                        <div className="relative">
                            <StretchHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Street"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Suburb */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Suburb</span>
                        </label> */}
                        <div className="relative">
                            <Fence className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Suburb"
                            value={suburb}
                            onChange={(e) => setSuburb(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* City */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">City</span>
                        </label> */}
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Province */}
                    <div className="form-control">
                        {/* <label htmlFor="province" className="label">
                            <span className="label-text">Province</span>
                        </label> */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            className="select select-bordered w-full rounded-md shadow-sm pl-10 appearance-none"
                            value={province}
                            onChange={(e) => {setProvince(e.target.value)}} 
                            >
                            <option value="">Choose Province...</option>
                            {provinces.map((p, idx) => {
                                return (
                                <option key={idx} value={p.value}>
                                {p.label}
                                </option>
                                )
                            })}
                            </select>
                        </div>
                    </div>
                </div>
                    
                    {/* Submit button */}
                    <div className="flex justify-end mt-6">
                        <button type="submit" className="btn btn-accent w-full sm:w-auto px-6 flex items-center gap-2">
                            <ListFilter size={18} /> Search
                        </button>
                    </div>
            </form>
        

        <div className="overflow-x-auto my-10">
            <table className="table w-full table-zebra border border-slate-300 rounded-lg">
                <thead className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    <tr>
                        <th>Site</th>
                        <th>Reference</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Building</th>
                        <th>Street</th>
                        <th>Number</th>
                        <th>Suburb</th>
                        <th>City</th>
                        <th>Postcode</th>
                        <th>Province</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data && data.map((site) => (
                        <tr key={site.site} className="hover">
                            <td>{site.site}</td> 
                            <td>{site.reference}</td>
                            <td>{site.latitude}</td> 
                            <td>{site.longitude}</td> 
                            <td>{site.building}</td> 
                            <td>{site.street}</td> 
                            <td>{site.number}</td> 
                            <td>{site.suburb}</td> 
                            <td>{site.city}</td> 
                            <td>{site.postcode}</td> 
                            <td>{site.province}</td>
                            <td>
                                <Link to={'/sites/viewsite/' + site.site} className="btn btn-accent">View</Link>
                            </td>    
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
}
 
export default Sites;