import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from './AxiosInstance';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        const res = await axios.post('/api/forgot-password', { email });
        alert(res.data.message);
        navigate('/login');
  } catch (err) {
        console.error(err);
        alert('An error occurred.');
  }
  };

  return (
    <div className="h-screen flex items-center justify-center">
        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-200">
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="form-control mt-2">
                        <label className="label">
                            <span className="label-text">Email</span>    
                        </label>
                        <input className="input input-bordered w-full max-w-xs"
                            type="email" 
                            placeholder="Type your email here"  
                            required
                            value = { email }
                            onChange={(e) => setEmail(e.target.value)}
                            />
                    </div>

                    <div className="form-control mt-6">
                        <button className="btn btn-accent">Reset Password</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    );
}