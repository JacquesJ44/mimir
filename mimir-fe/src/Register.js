import axios from "./AxiosInstance.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/register', { name, surname,email, password, confirmPassword });
    
      // Show success message
      setShowSuccess(true);

      // Wait 1.5 seconds before reloading
      setTimeout(() => {
        // window.location.reload();   
        navigate('/circuits');
      }, 1500);
    } catch (error) {
      alert(error.response.data.msg);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-200">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-4">Register</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name</span>    
              </label>
              <input className="input input-bordered w-full max-w-xs"
                type="text" 
                placeholder="Name"  
                required
                value = { name }
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Surname</span>    
              </label>
              <input className="input input-bordered w-full max-w-xs"
                type="text" 
                placeholder="Surname"  
                required
                value = { surname }
                onChange={(e) => setSurname(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>    
              </label>
              <input className="input input-bordered w-full max-w-xs"
                type="email" 
                placeholder="Email"  
                required
                value = { email }
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>    
              </label>
              <input className="input input-bordered w-full max-w-xs"
                type="password" 
                placeholder="Password"
                required
                value = { password }
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password</span>    
              </label>
              <input className="input input-bordered w-full max-w-xs"
                type="password" 
                placeholder="Password"
                required
                value = { confirmPassword }
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>

            <div className="form-control mt-6">
              <button className="btn btn-accent">Create User</button>
            </div>

            {/* {error && <p className="text-red-500 mt-2">{error}</p>} */}
            {/* {success && <p className="text-green-600 mt-2">{success}</p>} */}

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;