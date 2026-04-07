import axios from "./AxiosInstance.js";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { addMonths, subDays, parseISO, format, isValid,set } from 'date-fns';

const UpdateCircuit = () => {

    // The below is read from circuit-options.json file and loaded on the page with useEffect 
    const [speeds, setSpeeds] = useState([]);
    const [circuitTypes, setCircuitTypes] = useState([]);
    const [contractTerms, setContractTerms] = useState([]);
    const [ennis, setEnnis] = useState([]);
    const [salesPersons, setSalesPersons] = useState([]);

    useEffect(() => {
        fetch("/circuit-options.json")
            .then((res) => res.json())
            .then((data) => {
            // Vendors you want to support
            const specialVendors = ["Wondernet", "Faircom", "Evolve Internet"];

            // Find the first matching vendor in the list
            const vendorMatch = data.vendors.find(v => specialVendors.includes(v.vendor));

            if (vendorMatch) {
                setCircuitTypes(
                    vendorMatch.type.map(t => ({ value: t, label: t }))
                );

                }
            setSpeeds(data.speeds);
            setContractTerms(data.contractTerms);
            setEnnis(data.ennis);
            })
            .catch((err) => console.error("Failed to load options:", err));
    }, []);
    
    const {id}  = useParams()
    let navigate = useNavigate();
    const [showSuccess, setShowSuccess] = useState(false);
    const [doc, setDoc] = useState('');
    const [data, setData] = useState([{}])
    
    // Main form data variables (controlled)
    const [circuitType, setCircuitType] = useState('');
    const [speed, setSpeed] = useState('');
    const [enni, setEnni] = useState('');
    const [vlan, setVlan] = useState('');
    const [startDate, setStartDate] = useState('');
    const [contractTerm, setContractTerm] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mrc, setMrc] = useState('');
    const [usageFlag, setUsageFlag] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [comments, setComments] = useState('');
    const [status, setStatus] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    // const [commission, setCommission] = useState('');

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

    useEffect(() => {
        window.scrollTo(0, 0);

        axios.get(`/api/circuits/updatecircuit/${id}`)
            .then(res => {
            const { circuit, salespersons } = res.data;

            if (!circuit) return;

            // Set circuit data
            setData(circuit);
            setSpeed(circuit.speed || '');
            setCircuitType(circuit.circuitType || '');
            setEnni(circuit.enni || '');
            setVlan(circuit.vlan || '');
            setStartDate(circuit.startDate ? new Date(circuit.startDate).toISOString().split('T')[0] : '');
            setContractTerm(circuit.contractTerm || '');
            setMrc(circuit.mrc || '');
            setUsageFlag(circuit.usageFlag || '');
            setSellingPrice(circuit.sellingPrice || '');
            setComments(circuit.comments || '');
            setStatus(circuit.status || '');
            setDoc(circuit.doc || '');
            setSalesPerson(circuit.salesPerson || '');

            // Calculate endDate if needed
            if (
                circuit.startDate &&
                circuit.contractTerm &&
                circuit.contractTerm !== 0
            ) {
                lastDay(circuit.contractTerm, circuit.startDate);
            } else {
                setEndDate(circuit.endDate || '');
            }

            // Set salespersons list for dropdown
            setSalesPersons(salespersons || []);
            })
            .catch(err => {
            if (err.response?.status === 404) {
                console.warn("Circuit not found:", err.response.data?.error);
            } else {
                console.error("Error fetching circuit data:", err);
            }
            });
        }, [id]);
        
        const contract_status = ['Active', 'Cancelled', 'Cancelling'];
        
        // Form submission handler
        const handleSubmit = async (e) => {
            e.preventDefault();

            const fileInput = document.getElementById("formFile");
            const selectedFile = fileInput?.files?.[0];

            // Build circuit payload
            const circuitData = {
                speed,
                circuitType,
                startDate,
                contractTerm,
                endDate: ['Wondernet', 'Faircom', 'Evolve Internet'].includes(data.vendor) ? null : endDate,
                enni,
                vlan,
                mrc,
                sellingPrice: usageFlag === "Client" ? sellingPrice : null,
                comments,
                status,
                doc: selectedFile?.name || doc || null,
                salesPerson: usageFlag === 'Client' && salesPerson ? salesPerson : null,

            };

            try {
                // 1️⃣ Update circuit FIRST
                const res = await axios.put(
                `/api/circuits/updatecircuit/${id}`,
                circuitData,
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true,
                }
                );

                if (res.status === 204) {
                toast("No changes made to the circuit.");
                navigate("/circuits");
                return;
                }

                if (res.status !== 200) {
                throw new Error("Unexpected response from server");
                }

                // 2️⃣ Upload file ONLY if update succeeded and file exists
                if (selectedFile) {
                const formData = new FormData();
                formData.append("doc", selectedFile);

                try {
                    await axios.post("/api/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                    withCredentials: true,
                    });
                } catch (uploadErr) {
                    console.error("Upload failed:", uploadErr);
                    toast.error("Circuit updated, but file upload failed.");
                }
                }

                // 3️⃣ Success feedback + redirect
                setShowSuccess(true);
                setTimeout(() => navigate("/circuits"), 1500);

            } catch (err) {
                console.error("Failed to update circuit:", err);

                const errorMsg =
                err.response?.data?.error || "Failed to update circuit.";
                toast.error(errorMsg);
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
                    <h2 className="text-2xl font-semibold mb-6 text-center">Update Circuit</h2>

                    <form onSubmit={(e) => {handleSubmit(e)}}>
                        
                        <h1><strong>Client: {data.siteB_name}</strong></h1>
                        <h6><strong>{data.vendor} | {data.circuitType} | {data.circuitNumber}</strong></h6>

                        {/* Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="form-control">
                                <label htmlFor="status" className="label">
                                    <span className="label-text">Status</span>
                                </label>
                                <select value={status} onChange={(e) => {setStatus(e.target.value)}} id="status" className="input input-bordered w-full" >
                                    <option value="" disabled>Select Status</option>
                                        {contract_status.map((c, index) => {
                                            return (
                                                <option key={index} value={c}>{c}</option>
                                            )
                                        })}
                                </select>
                            </div>

                            { ['Wondernet', 'Faircom', 'Evolve Internet'].includes(data.vendor) ? (
                                <div className="form-control">
                                    <label htmlFor="circuitType" className="label">
                                        <span className="label-text">Circuit Type</span>
                                    </label>
                                    <select value={circuitType} onChange={(e) => setCircuitType(e.target.value)} id="circuitType" className="input input-bordered w-full">
                                    <option value="" disabled>Choose an option...</option>
                                            {circuitTypes?.map((c, index) => {
                                                return (
                                                    <option key={index} value={c.value}>{c.label}</option>
                                                )
                                            })}
                                    </select>
                                </div>
                                ):(
                                <div className="form-control">
                                    <label htmlFor="speed" className="label">
                                        <span className="label-text">Speed</span>
                                    </label>
                                    <select value={speed} onChange={(e) => setSpeed(e.target.value)} id="speed" className="input input-bordered w-full">
                                    <option value="" disabled>Select Speed</option>
                                            {speeds.map((s, index) => {
                                                return (
                                                    <option key={index} value={s.value}>{s.label}</option>
                                                )
                                            })}
                                    </select>
                                </div>
                            )}

                        {/* Display only if Vendor is set to 'DFA' or 'Ikeja' */}
                        { (data.vendor === 'DFA' || data.vendor === 'Ikeja') &&
                        <>
                            <div className="form-control">
                                <label htmlFor="enni" className="label">
                                    <span className="label-text">ENNI</span>
                                </label>
                                <select value={enni} onChange={(e) => setEnni(e.target.value)} id="enni" className="input input-bordered w-full">
                                <option value="" disabled>ENNI</option>
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
                                    value={vlan}
                                    onChange={(e) => setVlan(e.target.value)} 
                                />
                            </div>
                        </>
                        }
                        </div>

                        {/* Row 2 */}
                        { !['Wondernet', 'Faircom', 'Evolve Internet'].includes(data.vendor) && (                            
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
                                <>
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
                                </>
                            )}
                        </div>
                        )}

                        {/* Row 3-5 Layout with Profit Tool, Notes, and Calculator */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">

                            {/* Row 3 Col 1 - MRC */}
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

                            {/* Row 4 Col 1 - Selling Price, Display only if usageFlag is 'Client' */}
                            {usageFlag === 'Client' && (
                            <>
                                <div className="form-control col-span-1">
                                    <label className="label">
                                        <span className="label-text">Selling Price (ex VAT)</span>    
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
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

                            {/* Row 3-5 Col 3 - Profit Tool and Notes */}
                            <div className="col-span-1 row-span-3 p-4 rounded-lg border border-yellow-500 bg-white dark:bg-gray-800 shadow-md shadow-yellow-500">
                                <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-100">💰 Profit Tool</h3>
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                    Profit: <strong>R{(Number(sellingPrice || 0) - Number(mrc || 0)).toFixed(2)}</strong>
                                </p>
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                    Margin: <strong>{(((Number(sellingPrice || 0) - Number(mrc || 0)) / Number(mrc || 1)) * 100).toFixed(2)}%</strong>
                                </p>

                                <h3 className="text-md font-semibold mb-2 mt-5 text-gray-700 dark:text-gray-100">📝 Notes</h3>
                                        <textarea className="textarea textarea-bordered w-full min-h-52" placeholder="e.g., Make dat money yo" />
                            </div>
                            
                            {/* Calculator (Col 4, Row-span 3) */}
                            <div className="col-span-1 row-span-3 p-4 rounded-lg border border-yellow-500 bg-white dark:bg-gray-800 shadow-md shadow-yellow-500">
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
                        </div>
                        

                        {/* Row 5 */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Additional Comments</span>    
                            </label>
                            <textarea className="input input-bordered w-full"
                                type="text" 
                                value= { comments } 
                                onChange={(e) => setComments(e.target.value)} 
                            />
                            <label className="label">
                                <span className="label-text">Upload Handover Doc</span>    
                            </label>
                            <input
                                className="file-input file-input-bordered w-full"
                                type="file"
                                id="formFile"
                                onChange={(e) => setDoc(e.target.files[0]?.name || '')}/>
                                <p> 
                                    <span className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">Current doc: { data.doc }</span>
                                </p>
                        </div>
                        
                        {/* Save Button */}
                        <div className="flex justify-center">
                            <button className="btn btn-accent w-full md:w-1/2 lg:w-1/3 m-5">Update</button>
                        </div>

                        {/* Toast Notification */}
                        {showSuccess && (
                        <div className="toast toast-center toast-top">
                            <div className="alert alert-success shadow-lg">
                                <span>Site updated successfully!</span>
                            </div>
                        </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
     );
}
 
export default UpdateCircuit;