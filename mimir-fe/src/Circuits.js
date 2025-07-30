import axios from "./AxiosInstance.js";
import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import moments from "moment";
import { Building, Hash, User, CalendarDays, MapPin, ToggleRight, ListFilter, Plus, Cable, Microchip, BrushCleaning } from 'lucide-react';

const Circuits = () => {

    const [formData, setFormData] = useState({
        vendor: "",
        circuitType: "",
        circuitNumber: "",
        circuitOwner: "",
        endDate: "",
        site: "",
        enni: "",
        status: "",
    });

    // The below is read from circuit-options.json file and loaded on the page with useEffect
    const [vendorOptions, setVendorOptions] = useState([]);
    const [ennis, setEnnis] = useState([]);
    const [circuitTypes, setCircuitTypes] = useState([]);

    useEffect(() => {
        fetch("/circuit-options.json")
            .then((res) => res.json())
            .then((data) => {
            setVendorOptions(data.vendors);
            setEnnis(data.ennis);
            })
            .catch((err) => console.error("Failed to load options:", err));
    }, []);

    const circuitOwners = ['Aesir', 'Ikeja']

    const today = moments(new Date());
    
    const handleVendorChange = (e) => {
        const selected = e.target.value;
        setVendor(selected);
        setCircuitType(''); // Reset circuit type

        // Find the selected vendor in the loaded list
        const selectedVendorObj = vendorOptions.find(v => v.vendor === selected);
        if (selectedVendorObj && selectedVendorObj.type) {
            setCircuitTypes(selectedVendorObj.type);
        } else {
            setCircuitTypes([]); // Fallback
        }
    };
    
    const [vendor, setVendor] = useState('');
    const [circuitType, setCircuitType] = useState('');
    const [circuitOwner, setCircuitOwner] = useState('');
    const [circuitNumber, setCircuitNumber] = useState('');
    const [endDate, setEndDate] = useState('');
    const [site, setSite] = useState('');
    const [enni, setEnni] = useState('');
    const [status, setStatus] = useState('');
    
    const contract_status = ['Active', 'Cancelled', 'Cancelling']
    
    // const circuitTypeOptions = vendorCircuitTypeMap[vendor] || vendorCircuitTypeMap['default'];

    const [data, setData] = useState([])
    const handleSubmit = (e) => {
        e.preventDefault()
        const form = {
            vendor: vendor,
            circuitType: circuitType,
            circuitNumber: circuitNumber,
            circuitOwner: circuitOwner,
            endDate: endDate,
            site: site,
            enni: enni,
            status: status,
        };
       axios.post('/mimir/api/circuits', form, { withCredentials: true })
        .then(res => {
            setData(res.data);
            // console.log(res.data);
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

    const handleClear = () => {
        setVendor("");
        setCircuitType("");
        setCircuitNumber("");
        setCircuitOwner("");
        setEndDate("");
        setSite("");
        setEnni("");
        setStatus("");
        };


    return (         
        <div className="card-body bg-white dark:bg-gray-900 shadow-md rounded-md w-full max-w-8xl mx-auto p-6">

            {/* Add Circuit button */}
            <div className="flex justify-end mb-6">
                <Link to='/circuits/addcircuit' className="btn btn-accent w-full sm:w-auto px-6 flex items-center gap-2">
                <Plus size={18} /> Add Circuit
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4">Filter Circuits</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    
                    {/* Vendor Dropdown */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Vendor</span>
                        </label> */}
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            className="select select-bordered w-full rounded-md shadow-sm pl-10 appearance-none"
                            value={vendor}
                            onChange={handleVendorChange}
                            >
                            <option value="">Choose Vendor...</option>
                            {vendorOptions.map((v, idx) => (
                            <option key={idx} value={v.vendor}>{v.vendor}</option>
                            ))}
                            </select>
                        </div>
                    </div>

                    {/* Circuit Type Dropdown */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Circuit Type</span>
                        </label> */}
                        <div className="relative">
                            <Microchip className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            className="select select-bordered w-full rounded-md shadow-sm pl-10 appearance-none"
                            value={circuitType}
                            onChange={(e) => setCircuitType(e.target.value)}
                            >
                            <option value="">Choose Circuit Type...</option>
                            {circuitTypes.map((t, idx) => (
                                <option key={idx} value={t}>
                                {t}
                                </option>
                            ))}
                            </select>
                        </div>
                    </div>

                    {/* Circuit Number */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Circuit Number</span>
                        </label> */}
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Circuit Number"
                            value={circuitNumber}
                            onChange={(e) => setCircuitNumber(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Circuit Owner Dropdown */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Circuit Owner</span>
                        </label> */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            className="select select-bordered w-full rounded-md shadow-sm pl-10 appearance-none"
                            value={circuitOwner}
                            onChange={(e) => setCircuitOwner(e.target.value)}
                            >
                            <option value="">Choose Owner...</option>
                            {circuitOwners.map((o, idx) => (
                                <option key={idx} value={o}>
                                {o}
                                </option>
                            ))}
                            </select>
                        </div>
                    </div>

                    {/* End Date */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Start Date</span>
                        </label> */}
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Site A */}
                    <div className="form-control">
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Site"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Enni Dropdown */}
                    <div className="form-control">
                        <div className="relative">
                            <Cable className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            className="select select-bordered w-full rounded-md shadow-sm pl-10 appearance-none"
                            value={enni}
                            onChange={(e) => setEnni(e.target.value)}
                            >
                            <option value="">Choose ENNI...</option>
                            {ennis.map((e, idx) => (
                                <option key={idx} value={e.value}>
                                {e.label}
                                </option>
                            ))}
                            </select>
                        </div>
                    </div>
                
                    {/* Status */}
                    <div className="form-control">
                        {/* <label htmlFor="status" className="label">
                            <span className="label-text text-white">Status</span>
                        </label> */}
                        <div className="relative">
                            <ToggleRight className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            id="status"
                            className="select select-bordered w-full rounded-md shadow-sm pl-10"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            >
                            <option value="">Choose status...</option>
                            {contract_status.map((c, index) => (
                                <option key={index} value={c}>
                                {c}
                                </option>
                            ))}
                            </select>
                        </div>
                    </div>

                </div>

                {/* Clear & Submit button */}
                <div className="flex justify-end mt-6 gap-2">
                    <button type="button" className="btn btn-warning w-full sm:w-auto px-6 flex items-center gap-2"
                        onClick={handleClear}
                    >
                    <BrushCleaning size={18} /> Clear
                    </button>
                    <button type="submit" className="btn btn-accent w-full sm:w-auto px-6 flex items-center gap-2">
                        <ListFilter size={18} /> Search
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto my-10">
            Records found: { data.length }
            <table className="table w-full table-zebra border border-slate-300 rounded-lg">
                <thead className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800">
                    <tr>
                        <th></th>
                        <th>Vendor</th>
                        <th>Circuit Type</th>
                        <th>Speed</th>
                        <th>Circuit Number</th>
                        <th>ENNI</th>
                        <th>Circuit Owner</th>
                        <th>VLAN</th>
                        <th>End Date</th>
                        <th>Site B</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data && data.map((c) => (
                        <tr key={c.id} className="hover">
                            <td className="border border-slate-700"
                                style={{
                                    backgroundColor:
                                    c.status === 'Cancelled'
                                        ? 'purple'
                                        : c.status === 'Cancelling'
                                        ? 'yellow'
                                        : today.isBefore(c.endDate) || c.endDate === null
                                        ? 'green'
                                        : 'red',
                                }}
                                title={
                                    c.status === 'Cancelled'
                                        ? 'This item has been cancelled'
                                        : c.status === 'Cancelling'
                                        ? 'This item is in the process of being cancelled'
                                        : today.isBefore(c.endDate)
                                        ? 'This item is active and still in contract'
                                        : 'This item is active but out of contract'
                                    }
                                >
                            </td>
                            <td>{c.vendor}</td> 
                            <td>{c.circuitType}</td> 
                            <td>{c.speed}</td> 
                            <td>{c.circuitNumber}</td>
                            <td>{c.enni}</td>
                            <td>{c.circuitOwner}</td>
                            <td>{c.vlan}</td>
                            <td>{c.endDate ?
                                new Date(c.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                                : 'N/A'}
                            </td> 
                            <td>{c.siteB_name}</td>
                            <td>
                                <Link to={'/circuits/viewcircuit/' + c.id} className="btn btn-accent">View</Link>
                            </td>    
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
     );
}
 
export default Circuits;