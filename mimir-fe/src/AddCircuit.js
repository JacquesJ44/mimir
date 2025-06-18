import axios from "./AxiosInstance.js"; 
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, subDays, parseISO, format } from 'date-fns';
import SiteSelector from "./SiteSelector.js";

const AddCircuit = () => {
    
    // Main form data variables
    const [vendor, setVendor] = useState('');
    const [circuitType, setCircuitType] = useState('');
    const [speed, setSpeed] = useState('');
    const [circuitNumber, setCircuitNumber] = useState('');
    const [circuitOwner, setCircuitOwner] = useState('Aesir');   
    const [enni, setEnni] = useState('');
    const [vlan, setVlan] = useState('');
    const [startDate, setStartDate] = useState('');
    const [contractTerm, setContractTerm] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mrc, setMrc] = useState('');
    const [siteA, setSiteA] = useState('');
    const [siteB, setSiteB] = useState('');
    const [comments, setComments] = useState('');
    const [doc, setDoc] = useState('');

    const [siteAId, setSiteAId] = useState(null);
    const [siteBId, setSiteBId] = useState(null);
    
    let navigate = useNavigate()

    const [showSuccess, setShowSuccess] = useState(false);
    

    // Form submission handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log("Site A ID:", siteAId, "Site B ID:", siteBId);

        if (!siteAId || !siteBId) {
            alert("Please select valid Site A and Site B options.");
            return;
        }
        
        const fileInput = document.getElementById('formFile');
        const formData = new FormData();
        formData.append('vendor', vendor);
        formData.append('circuittype', circuitType);
        formData.append('speed', speed);
        formData.append('circuitNumber', circuitNumber);
        formData.append('circuitOwner', circuitOwner);
        if (vendor === 'DFA') {
            formData.append('enni', enni);
            formData.append('vlan', vlan);
        }
        formData.append('startDate', startDate);
        formData.append('contractTerm', contractTerm);
        formData.append('endDate', endDate);
        formData.append('mrc', mrc);
        formData.append('siteA_id', siteAId);
        formData.append('siteB_id', siteBId);
        formData.append('comments', comments);
    
    
        if (fileInput.files[0]) {
            // console.log(fileInput.files[0]);
            formData.append('doc', fileInput.files[0]);
        }

        try {
            // Upload the file first
            await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            // console.log('Form submitted:', response.data);
            
            // Submit the rest of the form data
            await axios.post('/api/circuits/addcircuit', {
                vendor,
                circuittype: circuitType,
                speed,
                circuitNumber,
                circuitOwner,
                enni: vendor === 'DFA' ? enni : null,
                vlan: vendor === 'DFA' ? vlan : null,
                startDate,
                contractTerm,
                endDate,
                mrc,
                siteA_id: siteAId,
                siteB_id: siteBId,
                comments,
                doc: fileInput.files[0]?.name || null
            }, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });
            // console.log('Circuit saved:', saveResponse.data);
            
            setShowSuccess(true);
            // Wait 1.5 seconds before reloading
            setTimeout(() => {
                navigate('/circuits');
            }, 1500);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                alert(`Upload failed: ${error.response.data.error}`);
            } else {
                console.error('Form submission failed:', error);
                alert('An unexpected error occurred.');
            }
        }
    };
    
    // Setting Vendor and CircuitType variables for selection in cascading style, followed by fundtions to set in the form defined above 
    const vendors = [
        {
            vendor: 'DFA',
            type: ['Business Broadband', 'Calypte', 'Helios', 'Magellan', 'Peregrine', 'Tachyon', 'Titan']
               
        },
        {
            vendor: 'Seacom',
            type: ['EIA', 'BIA']
        },
        {
            vendor: 'Comsol',
            type: ['CX Broadband (PtMP)', 'CX Plus Broadband (PTP)', 'CX Broadband Lite']
            
        },
    ]

    const [circuitTypes, setCircuitTypes] = useState([])

    const changeVendor = (e) => {
        const selectedVendor = e.target.value;
        setVendor(selectedVendor);

        const vendorObj = vendors.find((v) => v.vendor === selectedVendor);
        if (vendorObj && vendorObj.type) {
            setCircuitTypes(vendorObj.type);
        } else {
            setCircuitTypes([]); // Clear if no types found
        }
    };

    const changeCircuitType = (e) => {
        setCircuitType(e.target.value);
    };

    // Working with dates to set the last day of the contract equal to first day plus the contract term
    const lastDay = (term) => {
        setContractTerm(term);

        if (!startDate || !term) {
            setEndDate("");
            return;
        }

        try {
            const parsedStart = parseISO(startDate); // assumes startDate is "YYYY-MM-DD"
            const monthsToAdd = parseInt(term, 10);

            // Add months to startDate, then subtract 1 day to get "last day of contract"
            const rawEnd = addMonths(parsedStart, monthsToAdd);
            const finalEnd = subDays(rawEnd, 1); // Optional: Subtract 1 to match business expectations

            // Format to "YYYY-MM-DD"
            const formatted = format(finalEnd, "yyyy-MM-dd");
            setEndDate(formatted);
        } catch (e) {
            console.error("Invalid date logic:", e);
            setEndDate("");
        }
    };
        
    // The below are predefined sets of dropdown menus for the rest of the input fields
    const speeds = [
        {label: "10Mbps", value: "10Mbps"},
        {label: "20Mbps", value: "20Mbps"},
        {label: "25Mbps", value: "25Mbps"},
        {label: "30Mbps", value: "30Mbps"},
        {label: "40Mbps", value: "40Mbps"},
        {label: "50Mbps", value: "50Mbps"},
        {label: "100Mbps", value: "100Mbps"},
        {label: "200Mbps", value: "200Mbps"},
        {label: "250Mbps", value: "250Mbps"},
        {label: "300Mbps", value: "300Mbps"},
        {label: "400Mbps", value: "400Mbps"},
        {label: "500Mbps", value: "500Mbps"},
        {label: "600Mbps", value: "600Mbps"},
        {label: "700Mbps", value: "700Mbps"},
        {label: "800Mbps", value: "800Mbps"},
        {label: "1Gbps", value: "1Gbps"},
        {label: "1.5Gbps", value: "1.5Gbps"},
        {label: "2Gbps", value: "2Gbps"},
        {label: "2.5Gbps", value: "2.5Gbps"},
        {label: "3Gbps", value: "3Gbps"},
        {label: "3.5Gbps", value: "3.5Gbps"},
        {label: "5Gbps", value: "5Gbps"},
        {label: "6Gbps", value: "6Gbps"},
        {label: "7Gbps", value: "7Gbps"},
        {label: "8Gbps", value: "8Gbps"},
        {label: "10Gbps", value: "10Gbps"},
    ]

    const contractTerms = [
        {label: "12 Months", value: 12},
        {label: "24 Months", value: 24},
        {label: "36 Months", value: 36},
        {label: "60 Months", value: 60},
    ]

    const ennis = [
        {label: "ENI21-0000123", value: "ENI21-0000123"},
        {label: "ENI11-0001059", value: "ENI11-0001059"},
        {label: "ENI11-0001107", value: "ENI11-0001107"},
        {label: "ENI11-0001122", value: "ENI11-0001122"},
        {label: "ENI21-0006085", value: "ENI21-0006085"},
        {label: "ENI11-0006137", value: "ENI11-0006137"},
        {label: "GNI21-0000071", value: "GNI21-0000071"},
    ]

    return ( 
        
        <div className="p-6 bg-base-200 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="card bg-white dark:bg-gray-800 shadow-xl p-8">
                    <h2 className="text-2xl font-semibold mb-6 text-center">Add New Circuit</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="form-control">
                                    <label htmlFor="vendor" className="label">
                                        <span className="label-text">Vendor</span>
                                    </label>
                                    <select value={vendor} onChange={changeVendor} id="vendor" className="input input-bordered w-full">
                                        <option value=''>Choose an option...</option>
                                            {vendors.map((v, index) => {
                                                return (
                                                    <option key={index} value={v.vendor}>{v.vendor}</option>
                                                )
                                            })}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label htmlFor="circuittype" className="label">
                                        <span className="label-text">Circuit Type</span>
                                    </label>
                                    <select value={circuitType} onChange={changeCircuitType} id="circuittype" className="input input-bordered w-full">
                                    <option value=''>Choose an option...</option>
                                            {circuitTypes.map((c, index) => {
                                                return (
                                                    <option key={index} value={c}>{c}</option>
                                                )
                                            })}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label htmlFor="speed" className="label">
                                        <span className="label-text">Speed</span>
                                    </label>
                                    <select value = { speed } onChange={(e) => setSpeed(e.target.value)} id="speed" className="input input-bordered w-full">
                                    <option value=''>Choose an option...</option>
                                            {speeds.map((s, index) => {
                                                return (
                                                    <option key={index} value={s.value}>{s.label}</option>
                                                )
                                            })}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Circuit Number</span>    
                                    </label>
                                    <input className="input input-bordered w-full"
                                        type="text" 
                                        placeholder="Circuit Number"
                                        required
                                        value = { circuitNumber }
                                        onChange={(e) => setCircuitNumber(e.target.value)} 
                                        />
                                </div>

                                <div className="form-control">
                                    <div className="form-control">
                                        <label className="label mb-1">
                                            <span className="label-text">Circuit Owner</span>
                                        </label>

                                        <div
                                            className="relative w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer select-none"
                                            onClick={() => setCircuitOwner(circuitOwner === 'Aesir' ? 'Ikeja' : 'Aesir')}>

                                            {/* Slider knob */}
                                            <div
                                            className={`absolute top-0 left-0 w-10 h-8 bg-white dark:bg-gray-600 rounded-full shadow-md transform transition-transform duration-300 ${
                                                circuitOwner === 'Ikeja' ? 'translate-x-full' : 'translate-x-0'
                                            }`}/>

                                            {/* Labels */}
                                            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold pointer-events-none">
                                                <span
                                                    className={`transition-colors duration-200 ${
                                                    circuitOwner === 'Aesir' ? 'text-blue-600' : 'text-gray-400'
                                                    }`}>
                                                    <img
                                                        src="/aesirblue.png"
                                                        alt="Aesir Logo"
                                                        className="h-8 object-contain" />
                                                </span>
                                                <span
                                                    className={`transition-colors duration-200 ${
                                                    circuitOwner === 'Ikeja' ? 'text-green-600' : 'text-gray-400'
                                                    }`}>
                                                    <img
                                                        src="/ikejalogo1.png"
                                                        alt="Ikeja Logo"
                                                        className="h-5 object-contain" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2 - Display only if Vendor is set to 'DFA' */}
                            { (vendor === 'DFA') &&
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="form-control">
                                    <label htmlFor="enni" className="label">
                                        <span className="label-text">ENNI</span>
                                    </label>
                                    <select value = { enni } onChange={(e) => setEnni(e.target.value)} id="enni" className="input input-bordered w-full">
                                    <option value=''>Choose an option...</option>
                                            {ennis.map((e, index) => {
                                                return (
                                                    <option key={index} value={e.value}>{e.label}</option>
                                                )
                                            })}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">VLAN ID</span>    
                                    </label>
                                    <input className="input input-bordered w-full"
                                        type="text"
                                        placeholder="VLAN ID"
                                        value = { vlan }
                                        onChange={(e) => setVlan(e.target.value)} 
                                    />
                                </div>
                            </div>
                            }

                            {/* Row 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            
                                {/* Start Date */}
                                <div className="form-control">
                                    <label className="label">
                                    <span className="label-text">Start Date</span>    
                                    </label>
                                    <input
                                    className="input input-bordered w-full"
                                    type="date"
                                    placeholder="Start Date"
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>

                                {/* Contract Term Dropdown */}
                                <div className="form-control">
                                    <label htmlFor="contractterm" className="label">
                                    <span className="label-text">Contract Term</span>
                                    </label>
                                    <select
                                    value={contractTerm}
                                    onChange={(e) => lastDay(e.target.value)}
                                    id="contractterm"
                                    className="input input-bordered w-full"
                                    required
                                    >
                                    <option value="">Choose an option...</option>
                                    {contractTerms.map((term, index) => (
                                        <option key={index} value={term.value}>{term.label}</option>
                                    ))}
                                    </select>
                                </div>

                                {/* Last Day of Contract (Calculated) */}
                                <div className="form-control">
                                    <label className="label">
                                    <span className="label-text">Last Day of Contract</span>    
                                    </label>
                                    <input
                                    className="input input-bordered w-full"
                                    type="date"
                                    placeholder="Last Day of Contract"
                                    required
                                    readOnly
                                    value={endDate}
                                    />
                                </div>
                                
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Monthly Recurring Cost (ex VAT)</span>    
                                    </label>
                                    <input className="input input-bordered w-full"
                                        type="text" 
                                        placeholder="R"
                                        required
                                        value = { mrc }
                                        onChange={(e) => setMrc(e.target.value)} 
                                    />
                                </div>
                            </div>

                            {/* Row 4 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="form-control">
                                    <SiteSelector
                                        label="Site A"
                                        value={siteA}
                                        setValue={setSiteA}
                                        setId={setSiteAId}
                                    />
                                </div>

                                <div className="form-control">
                                    <SiteSelector
                                        label="Site B"
                                        value={siteB}
                                        setValue={setSiteB}
                                        setId={setSiteBId}
                                    />
                                </div>
                            </div>
                            
                            {/* Row 5 */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Additional Comments</span>    
                                </label>
                                <textarea className="input input-bordered w-full"
                                    placeholder="Additional Comments..."
                                    value = {comments}
                                    onChange={(e) => setComments(e.target.value)} />
                                <label className="label mt-4">
                                    <span className="label-text">Upload Handover Doc</span>
                                </label>
                                    <input
                                        className="file-input file-input-bordered w-full"
                                        type="file"
                                        id="formFile"
                                        accept="application/pdf"
                                        onChange={(e) => setDoc(e.target.files[0])}/>
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
                {/* </div> */}
            </div>
        </div>
     );
}
 
export default AddCircuit;