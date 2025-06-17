import axios from "./AxiosInstance.js";
import { useState } from "react";
import { Link } from 'react-router-dom';
import moments from "moment";
import { Building, Type, Hash, User, CalendarDays, MapPin, ToggleRight, ListFilter, Plus } from 'lucide-react';

const Circuits = () => {
    
    const vendorOptions = ['DFA', 'Seacom', 'Comsol'];
    
    const vendorCircuitTypeMap = {
        DFA: ['Business Broadband', 'Calypte', 'Helios', 'Magellan', 'Peregrine', 'Tachyon', 'Titan'],
        Seacom: ['EIA', 'BIA'],
        Comsol: ['CX Broadband (PtMP)', 'CX Plus Broadband (PTP)', 'CX Broadband Lite'],
        default: ['']
    }

    const circuitOwners = ['Aesir', 'Ikeja']

    const today = moments(new Date());
    // const [services, setServices] = useState([]);
    
    const handleVendorChange = (e) => {
        const selected = e.target.value;
        setVendor(selected);
        setCircuitType(''); // Reset circuit type when vendor changes
    };
    
    const [vendor, setVendor] = useState('');
    const [circuitType, setCircuitType] = useState('');
    const [circuitOwner, setCircuitOwner] = useState('');
    const [circuitNumber, setCircuitNumber] = useState('');
    const [endDate, setEndDate] = useState('');
    const [site, setSite] = useState('');
    // const [siteB, setSiteB] = useState('');
    const [status, setStatus] = useState('');
    
    const contract_status = ['Active', 'Cancelled', 'Cancelling']
    
    const circuitTypeOptions = vendorCircuitTypeMap[vendor] || vendorCircuitTypeMap['default'];

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
            // siteB: siteB,
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
                                <option key={idx} value={v}>
                                {v}
                                </option>
                            ))}
                            </select>
                            {/* <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /> */}
                        </div>
                    </div>

                    {/* Circuit Type Dropdown */}
                    <div className="form-control">
                        {/* <label className="label">
                            <span className="label-text text-white">Circuit Type</span>
                        </label> */}
                        <div className="relative">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                            className="select select-bordered w-full rounded-md shadow-sm pl-10 appearance-none"
                            value={circuitType}
                            onChange={(e) => setCircuitType(e.target.value)}
                            >
                            <option value="">Choose Circuit Type...</option>
                            {circuitTypeOptions.map((t, idx) => (
                                <option key={idx} value={t}>
                                {t}
                                </option>
                            ))}
                            </select>
                            {/* <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /> */}
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
                            {/* <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /> */}
                        </div>
                    </div>

                    {/* Start Date */}
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
                        {/* <label className="label">
                            <span className="label-text text-white">Site A</span>
                        </label> */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            {/* <SiteSelector
                                        label="Site A"
                                        value={siteA}
                                        setValue={setSiteA}
                                        setId={setSiteAId}
                                    /> */}
                            <input
                            className="input input-bordered w-full rounded-md shadow-sm pl-10"
                            type="text"
                            placeholder="Site"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* <div className="form-control">
                        <label className="label">
                            <span className="label-text">Site B</span>    
                        </label>
                        <input className="input input-bordered w-full rounded-md shadow-sm"
                            type="text" 
                            placeholder="Site B"
                            // required
                            value = { siteB }
                            onChange={(e) => setSiteB(e.target.value)} 
                        />
                    </div> */}
                
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
                {/* Submit button */}
                <div className="flex justify-end mt-6">
                    <button type="submit" className="btn btn-accent w-full sm:w-auto px-6 flex items-center gap-2">
                        <ListFilter size={18} /> Search
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto my-10">
        <table className="table w-full table-zebra border border-slate-300 rounded-lg">
            <thead className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800">
                <tr>
                    <th></th>
                    <th>Vendor</th>
                    <th>Circuit Type</th>
                    <th>Speed</th>
                    <th>Circuit Number</th>
                    <th>Circuit Owner</th>
                    <th>Start Date</th>
                    {/* <th>Contract Term</th> */}
                    <th>End Date</th>
                    {/* <th>Monthly Recurring Cost (ex VAT)</th> */}
                    <th>Site A</th>
                    <th>Site B</th>
                    {/* <th>Comments</th> */}
                    {/* <th>Handover Doc</th> */}
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
                                    : today.isBefore(c.endDate)
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
                        <td>{c.circuitOwner}</td>
                        <td>{c.startDate ?
                            new Date(c.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : 'N/A'}
                        </td> 
                        {/* <td>{c.contractTerm}</td>  */}
                        <td>{c.endDate ?
                            new Date(c.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : 'N/A'}
                        </td> 
                        {/* <td>{c.mrc}</td> */}
                        <td>{c.siteA_name}</td> 
                        <td>{c.siteB_name}</td>
                        {/* <td>{c.comments}</td> */}
                        {/* <td>{c.doc}</td>  */}
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