import axios from "./AxiosInstance.js"; 
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, subDays, parseISO, format, isValid, set } from 'date-fns';
import SiteSelector from "./SiteSelector.jsx";

const AddCircuit = () => {

    // The below is read from circuit-options.json file and loaded on the page with useEffect
    const [vendors, setVendors] = useState([]);
    const [speeds, setSpeeds] = useState([]);
    const [contractTerms, setContractTerms] = useState([]);
    const [ennis, setEnnis] = useState([]);
    const [circuitTypes, setCircuitTypes] = useState([]);
    const [salesPersons, setSalesPersons] = useState([]);

    useEffect(() => {
        fetch("/mimir/circuit-options.json")
            .then((res) => res.json())
            .then((data) => {
            setVendors(data.vendors);
            setSpeeds(data.speeds);
            setContractTerms(data.contractTerms);
            setEnnis(data.ennis);
            })
            .catch((err) => console.error("Failed to load options:", err));

        axios.get("/api/circuits/addcircuit")
                .then((res) => {
                setSalesPersons(res.data)
                // console.log("Sales People:", res.data);
            })
            .catch((err) => console.error(err));
    }, []);

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
    
    // Main form data variables
    const [vendor, setVendor] = useState('');
    const [circuitType, setCircuitType] = useState('');
    const [speed, setSpeed] = useState('');
    const [circuitNumber, setCircuitNumber] = useState('');
    const [circuitOwner, setCircuitOwner] = useState('Aesir');
    const [usageFlag, setUsageFlag] = useState('Client')   
    const [enni, setEnni] = useState('');
    const [vlan, setVlan] = useState('');
    const [startDate, setStartDate] = useState('');
    const [contractTerm, setContractTerm] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mrc, setMrc] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [siteA, setSiteA] = useState('');
    const [siteB, setSiteB] = useState('');
    const [comments, setComments] = useState('');
    const [doc, setDoc] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    // const [commission, setCommission] = useState('');

    const [siteAId, setSiteAId] = useState(null);
    const [siteBId, setSiteBId] = useState(null);
    
    let navigate = useNavigate()

    const [showSuccess, setShowSuccess] = useState(false);

    // Calculator
    const [valueA, setValueA] = useState('');
    const [valueB, setValueB] = useState('');
    const [operation, setOperation] = useState('+');

    const calculate = (a, b, op) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);

    if (isNaN(numA) || isNaN(numB)) return '—';

    switch (op) {
        case '+':
        return (numA + numB).toFixed(2);
        case '-':
        return (numA - numB).toFixed(2);
        case '*':
        return (numA * numB).toFixed(2);
        case '/':
        return numB !== 0 ? (numA / numB).toFixed(2) : '∞';
        default:
        return '—';
    }
    };

    // Form submission handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!siteAId || !siteBId) {
            alert("Please select valid Site A and Site B options.");
            return;
        }
        
        const fileInput = document.getElementById('formFile');
        const selectedFile = fileInput?.files?.[0];

        // 1. Prepare circuit data
        const circuitData = {
            vendor,
            circuitType: circuitType,
            speed,
            circuitNumber,
            circuitOwner,
            usageFlag,
            enni: vendor === 'DFA' || vendor === 'Ikeja' ? enni : null,
            vlan: vendor === 'DFA' || vendor === 'Ikeja' ? vlan : null,
            startDate,
            contractTerm,
            endDate: ['Wondernet', 'Faircom', 'Evolve Internet'].includes(vendor) ? null : endDate,
            mrc,
            sellingPrice: usageFlag === 'Client' ? sellingPrice : null,
            siteA_id: siteAId,
            siteB_id: siteBId,
            comments,
            doc: selectedFile?.name || null,
            salesPerson: usageFlag === 'Client' && salesPerson ? salesPerson : null,
            // commission: usageFlag === 'Client' ? commission : null,
        };

        try {
            // 2. Submit form data first
            const saveRes = await axios.post('/api/circuits/addcircuit', circuitData, {
            // 2. Submit form data first
            const saveRes = await axios.post('/mimir/api/circuits/addcircuit', circuitData, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });

            // 3. If save was successful and a file was selected, upload the file
            if (selectedFile) {
                const formData = new FormData();
                formData.append('vendor', vendor);
                formData.append('circuitType', circuitType);
                formData.append('speed', speed);
                formData.append('circuitNumber', circuitNumber);
                formData.append('circuitOwner', circuitOwner);
                if (vendor === 'DFA' || vendor === 'Ikeja') {
                    formData.append('enni', enni);
                    formData.append('vlan', vlan);
                }
                formData.append('usageFlag', usageFlag);
                formData.append('startDate', startDate);
                formData.append('contractTerm', contractTerm);
                formData.append('endDate', endDate);
                formData.append('mrc', mrc);
                if (usageFlag === 'Client') {
                    formData.append('sellingPrice', sellingPrice);
                }
                // formData.append('sellingPrice', sellingPrice);
                formData.append('siteA_id', siteAId);
                formData.append('siteB_id', siteBId);
                formData.append('comments', comments);
                formData.append('doc', selectedFile);
                if (usageFlag === 'Client') {
                    formData.append('salesPerson', salesPerson);
                    // formData.append('commission', commission);
                }

                try {
                    await axios.post('/mimir/api/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                            withCredentials: true
                    });
                } catch (uploadErr) {
                    console.error('Upload failed:', uploadErr);
                    alert('File upload failed (circuit was created).');
                }
            }

            // 4. Redirect after success
            setShowSuccess(true);
            setTimeout(() => {
                navigate('/circuits');
            }, 1500);
        } catch (error) {
            if (error.response?.data?.error) {
                alert(`Error: ${error.response.data.error}`);
            } else {
                console.error('Form submission failed:', error);
                alert('An unexpected error occurred.');
            }
        }
    };
    
    // Working with dates to set the last day of the contract equal to first day plus the contract term
    const lastDay = (termValue, startDateValue) => {
        if (!startDateValue || !termValue) {
            setEndDate("");
            setContractTerm(termValue);
            return;
        }

        try {
            const start = new Date(startDateValue);
            if (isNaN(start)) return;

            const months = parseInt(termValue, 10);
            if (isNaN(months)) return;

            const end = new Date(start);
            end.setMonth(end.getMonth() + months);
            setEndDate(end.toISOString().split("T")[0]);
            setContractTerm(termValue);

        } catch (err) {
            console.error("Invalid date logic:", err);
            setEndDate("");
        }
        };


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
                                    <select value={vendor} onChange={changeVendor} id="vendor" className="input input-bordered w-full" required>
                                        <option value=''>Choose an option...</option>
                                            {vendors.map((v, index) => {
                                                return (
                                                    <option key={index} value={v.vendor}>{v.vendor}</option>
                                                )
                                            })}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label htmlFor="circuitType" className="label">
                                        <span className="label-text">Circuit Type</span>
                                    </label>
                                    <select value={circuitType} onChange={changeCircuitType} id="circuitType" className="input input-bordered w-full" required>
                                    <option value=''>Choose an option...</option>
                                            {circuitTypes.map((c, index) => {
                                                return (
                                                    <option key={index} value={c}>{c}</option>
                                                )
                                            })}
                                    </select>
                                </div>
                                

                                {/*  Display only if Vendor is set to 'Wondernet */}
                                { !( ['Wondernet', 'Faircom', 'Evolve Internet'].includes(vendor) ) && (
                                // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <>
                                        <div className="form-control">
                                            <label htmlFor="speed" className="label">
                                                <span className="label-text">Speed</span>
                                            </label>
                                            <select value = { speed } onChange={(e) => setSpeed(e.target.value)} id="speed" className="input input-bordered w-full">
                                            <option value=''>Choose an option...</option>
                                                    {speeds.map((e, index) => {
                                                        return (
                                                            <option key={index} value={e.value}>{e.label}</option>
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
                            </>
                                )}
                            </div>

                            {/* Row 2 - Circuit Owner */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="form-control mb-4">
                                    <label className="label">
                                        <span className="label-text">Circuit Owner</span>
                                    </label>
                                    <div
                                        className="relative w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer select-none"
                                        onClick={() => setCircuitOwner(circuitOwner === 'Aesir' ? 'Ikeja' : 'Aesir')}
                                    >
                                        <div
                                        className={`absolute top-0 left-0 w-10 h-8 bg-white dark:bg-gray-600 rounded-full shadow-md transform transition-transform duration-300 ${
                                            circuitOwner === 'Ikeja' ? 'translate-x-full' : 'translate-x-0'
                                        }`}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold pointer-events-none">
                                        <span className={circuitOwner === 'Aesir' ? 'text-blue-600' : 'text-gray-400'}>
                                            <img src="/mimir/aesirblue.png" alt="Aesir Logo" className="h-8 object-contain" />
                                        </span>
                                        <span className={circuitOwner === 'Ikeja' ? 'text-green-600' : 'text-gray-400'}>
                                            <img src="/mimir/ikejalogo1.png" alt="Ikeja Logo" className="h-5 object-contain" />
                                        </span>
                                        <div
                                        className={`absolute top-0 left-0 w-10 h-8 bg-white dark:bg-gray-600 rounded-full shadow-md transform transition-transform duration-300 ${
                                            circuitOwner === 'Ikeja' ? 'translate-x-full' : 'translate-x-0'
                                        }`}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold pointer-events-none">
                                        <span className={circuitOwner === 'Aesir' ? 'text-blue-600' : 'text-gray-400'}>
                                            <img src="/aesirblue.png" alt="Aesir Logo" className="h-8 object-contain" />
                                        </span>
                                        <span className={circuitOwner === 'Ikeja' ? 'text-green-600' : 'text-gray-400'}>
                                            <img src="/ikejalogo1.png" alt="Ikeja Logo" className="h-5 object-contain" />
                                        </span>
                                        </div>
                                    </div>
                                </div>
                                    
                                {/* UsageFlag */}
                                <div className="form-control mb-4">
                                    <label className="label">
                                        <span className="label-text">
                                        <span className={usageFlag === 'Client' ? 'text-blue-600 font-bold' : 'text-gray-400'}>
                                            Client
                                        </span>
                                        {' / '}
                                        <span className={usageFlag === 'Internal' ? 'text-red-600 font-bold' : 'text-gray-400'}>
                                            Internal
                                        </span>
                                        </span>
                                    </label>
                                    <div
                                        className="relative w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer select-none"
                                        onClick={() => {
                                            const newUsageFlag = usageFlag === 'Client' ? 'Internal' : 'Client';
                                            // console.log('Toggled usageFlag to:', newUsageFlag);
                                            setUsageFlag(newUsageFlag);
                                            }}>
                                        <div
                                        className={`absolute top-0 left-0 w-10 h-8 bg-white dark:bg-gray-600 rounded-full shadow-md transform transition-transform duration-300 ${
                                            usageFlag === 'Internal' ? 'translate-x-full' : 'translate-x-0'
                                        }`}
                                        />
                                    </div>
                                </div>

                                {/*  Display only if Vendor is set to 'DFA' or 'Ikeja' */}
                                { (vendor === 'DFA' || vendor === 'Ikeja') &&
                                // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <>
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
                                </>
                                }
                            </div>

                            {/* Row 3 - Start Date, Contract Term, End Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Start Date (Row 3, Col 1) */}
                                <div className="form-control col-span-1">
                                <label className="label">
                                    <span className="label-text">Start Date</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full"
                                    required
                                    value={startDate}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setStartDate(value);

                                        if (contractTerm && value) {
                                            lastDay(contractTerm, value);
                                        } else {
                                            setEndDate("");
                                        }
                                    }}
                                />
                            </div>

                                {/* Contract Term (Row 3, Col 2) */}
                                <div className="form-control col-span-1">
                                <label className="label">
                                    <span className="label-text">Contract Term</span>
                                </label>
                                <select
                                    value={contractTerm}
                                    onChange={(e) => lastDay(e.target.value, startDate)}
                                    className="input input-bordered w-full"
                                    required
                                    >
                                    <option value="">Choose an option...</option>
                                    {contractTerms.map((term, index) => (
                                    <option key={index} value={term.value}>{term.label}</option>
                                    ))}
                                </select>
                                </div>

                                {/* End Date (Row 3, Col 3) */}
                                { contractTerm !== 0 && (

                                <div className="form-control col-span-1">
                                <label className="label">
                                    <span className="label-text">Last Day of Contract</span>
                                </label>
                                <input
                                    className="input input-bordered w-full"
                                    type="date"
                                    readOnly
                                    required
                                    value={endDate}
                                />
                                </div>

                                )}
                                {/* MRC (Row 4, Col 1) */}
                                <div className="form-control col-span-1">
                                <label className="label">
                                    <span className="label-text">Monthly Recurring Cost (ex VAT)</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="R"
                                    required
                                    value={mrc}
                                    onChange={(e) => setMrc(e.target.value)}
                                />
                                </div>
                                
                                {/* Profit Tool + Notes (Col 2, Row-span 4) */}
                                <div className="col-span-1 row-span-4 p-4 rounded-lg border border-yellow-500 bg-white dark:bg-gray-800 shadow-md shadow-yellow-400">
                                    <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-100">💰 Profit Tool</h3>
                                    <div className="text-sm text-gray-800 dark:text-gray-200">
                                        <p>Profit: <strong>R{(Number(sellingPrice || 0) - Number(mrc || 0)).toFixed(2)}</strong></p>
                                        <p>Margin: <strong>{(((Number(sellingPrice || 0) - Number(mrc || 0)) / Number(mrc || 1)) * 100).toFixed(2)}%</strong></p>

                                        <h3 className="text-md font-semibold mb-2 mt-5 text-gray-700 dark:text-gray-100">📝 Notes</h3>
                                        <textarea className="textarea textarea-bordered w-full min-h-52" placeholder="e.g., Make dat money yo" />
                                    </div>
                                </div>

                                {/* Calculator (Col 3, Row-span 4) */}
                                <div className="col-span-1 row-span-4 p-4 rounded-lg border border-yellow-500 bg-white dark:bg-gray-800 shadow-md shadow-yellow-500">
                                    <h3 className="text-md font-semibold mb-4 text-gray-700 dark:text-gray-100">🧮 Calculator</h3>

                                    <div className="space-y-4">
                                        {/* First Number */}
                                        <div>
                                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Value A</label>
                                            <input
                                                type="number"
                                                value={valueA}
                                                onChange={(e) => setValueA(e.target.value)}
                                                className="input input-bordered w-full"
                                                placeholder="Enter value"
                                            />
                                        </div>

                                        {/* Operation */}
                                        <div>
                                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Operation</label>
                                            <select
                                                value={operation}
                                                onChange={(e) => setOperation(e.target.value)}
                                                className="select select-bordered w-full"
                                            >
                                                <option value="+">➕ Add</option>
                                                <option value="-">➖ Subtract</option>
                                                <option value="*">✖ Multiply</option>
                                                <option value="/">➗ Divide</option>
                                            </select>
                                        </div>

                                        {/* Second Number */}
                                        <div>
                                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Value B</label>
                                            <input
                                                type="number"
                                                value={valueB}
                                                onChange={(e) => setValueB(e.target.value)}
                                                className="input input-bordered w-full"
                                                placeholder="Enter value"
                                            />
                                        </div>

                                        {/* Result */}
                                        <div className="mt-4 border-t pt-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-300">Result</p>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                                {calculate(valueA, valueB, operation)}
                                            </p>
                                        </div>

                                        {/* Clear Button */}
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                setValueA('');
                                                setValueB('');
                                                setOperation('+');
                                                }}
                                                className="btn btn-sm btn-warning w-full"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Selling Price, Sales Person, Commission (Row 5,6,7 Col 1) - Display only for usageFlag === 'Client' */}
                                {usageFlag === 'Client' && (
                                <>
                                    <div className="form-control col-span-1">
                                        <label className="label">
                                            <span className="label-text">Selling Price (ex VAT)</span>
                                        </label>
                                        <input
                                            className="input input-bordered w-full"
                                            type="text"
                                            placeholder="R"
                                            required
                                            value={sellingPrice}
                                            onChange={(e) => setSellingPrice(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label htmlFor="salesPerson" className="label">
                                            <span className="label-text">Sales Person</span>
                                        </label>
                                        <select value = { salesPerson } onChange={(e) => setSalesPerson(e.target.value)} id="salesPerson" className="input input-bordered w-full">
                                        <option value=''>Choose an option...</option>
                                                {salesPersons.map((s) => {
                                                    return (
                                                        <option key={s.id} value={s.id}>{s.name} {s.surname}</option>
                                                    )
                                                })}
                                        </select>
                                    </div>

                                    {/* <div className="form-control col-span-1">
                                        <label className="label">
                                            <span className="label-text">Commission (%)</span>
                                        </label>
                                        <input
                                            className="input input-bordered w-full"
                                            type="text"
                                            placeholder="3.00"
                                            // required
                                            value={commission}
                                            onChange={(e) => setCommission(e.target.value)}
                                        />
                                    </div> */}
                                </>
                                )}

                                <div className="form-control col-span-1">
                                    <SiteSelector
                                        label="Site A"
                                        value={siteA}
                                        setValue={setSiteA}
                                        setId={setSiteAId}
                                    />
                                </div>

                                    <div className="form-control col-span-1">
                                    <SiteSelector
                                        label="Site B"
                                        value={siteB}
                                        setValue={setSiteB}
                                        setId={setSiteBId}
                                    />
                                </div>
                            </div>

                            {/* Row 8 - Additional Comments, Handover Doc */}
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
                </div>
            </div>
        // </div>
     );
}
 
export default AddCircuit;