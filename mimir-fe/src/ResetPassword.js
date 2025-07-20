import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from './AxiosInstance'

export default function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
    await axios.post(`/mimir/api/reset-password/${token}`, { new_password: newPassword });
    alert("Password reset successful.");
    navigate("/login");
  } catch (error) {
    alert("There was a problem resetting your password. The link may have expired.");
    console.error(error);
    navigate("/login");
  }
  };

  return (
    <div className="h-screen flex items-center justify-center">
        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-200">
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="form-control mt-2">
                        <label className="label">
                            <span className="label-text">New Password</span>    
                        </label>
                        <input className="input input-bordered w-full max-w-xs"
                            type="password" 
                            placeholder="New Password"  
                            required
                            value = { newPassword }
                            onChange={(e) => setNewPassword(e.target.value)}
                            />
                    </div>

                    <div className="form-control mt-6">
                        <button className="btn btn-accent">Change Password</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    );
}