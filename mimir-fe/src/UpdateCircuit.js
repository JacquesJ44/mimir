import axios from "./AxiosInstance.js";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addMonths, subDays, parseISO, format } from 'date-fns';

const UpdateCircuit = () => {
    
    const {id}  = useParams()
    let navigate = useNavigate();
    const [showSuccess, setShowSuccess] = useState(false);
    const [doc, setDoc] = useState('');
    const [data, setData] = useState([{}])
    
    // Main form data variables (controlled)
    const [speed, setSpeed] = useState('');
    const [enni, setEnni] = useState('');
    const [vlan, setVlan] = useState('');
    const [startDate, setStartDate] = useState('');
    const [contractTerm, setContractTerm] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mrc, setMrc] = useState('');
    const [comments, setComments] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        axios.get(`/api/circuits/updatecircuit/${id}`)
            .then(res => {
                const circuit = res.data;
                // console.log('Fetched circuit status:', circuit.status);
                // console.log(circuit);
                setData(circuit);
                setSpeed(circuit.speed || '');
                setEnni(circuit.enni || '');
                setVlan(circuit.vlan || '');
                setStartDate(circuit.startDate ? new Date(circuit.startDate).toISOString().split('T')[0] : '');
                setContractTerm(circuit.contractTerm || '');
                setEndDate(circuit.endDate ? new Date(circuit.endDate).toISOString().split('T')[0] : '');
                setMrc(circuit.mrc || '');
                setComments(circuit.comments || '');
                setStatus(circuit.status || '');
                setDoc(circuit.doc || '');
            })
            .catch(err => {
                console.error('Error fetching circuit data:', err);
            });
        }, [id]);
        
        const contract_status = ['Active', 'Cancelled', 'Cancelling'];
        
        // Form submission handler
        const handleSubmit = async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('formFile');
            const selectedFile = fileInput?.files?.[0];
            
            // If file is selected, upload it
            if (selectedFile) {
                const formData = new FormData();
                formData.append('doc', selectedFile);

                try {
                    await axios.post('/api/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        withCredentials: true
                    });
                    } catch (uploadErr) {
                        console.error('Upload failed:', uploadErr);
                        alert('File upload failed');
                        return;
                    }
                }
    
            // Submit the rest of the form data
            const circuitData = {
                speed,
                startDate,
                contractTerm,
                endDate,
                mrc,
                comments,
                status,
                doc: selectedFile?.name || doc || null, // optionally store filename
            };
            
            // 3. Save circuit data
            try {
            const res = await axios.put(`/api/circuits/updatecircuit/${id}`, circuitData, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });

            if (res.status === 200) {
                setShowSuccess(true);
                setTimeout(() => navigate('/circuits'), 1500);
            }
        } catch (err) {
            console.error('Failed to update circuit:', err);
            alert('Failed to update circuit.');
        }
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

                    <form onSubmit={(e) => {handleSubmit(e)}}>
                        <h1><strong>{data.vendor} | {data.circuitType} | {data.circuitNumber}</strong></h1>

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

                        {/* Display only if Vendor is set to 'DFA' */}
                        { (data.vendor === 'DFA') &&
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Start Date */}
                                <div className="form-control">
                                    <label className="label">
                                    <span className="label-text">Start Date</span>    
                                    </label>
                                    <input
                                    className="input input-bordered w-full"
                                    type="date"
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
                                    <option value="" disabled>Choose an option...</option>
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
                                        required
                                        value = { mrc }
                                        onChange={(e) => setMrc(e.target.value)} 
                                    />
                                </div>
                        </div>

                        {/* Row 3 */}
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