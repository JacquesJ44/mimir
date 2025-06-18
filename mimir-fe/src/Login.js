import axios from "./AxiosInstance.js";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Login = ({ setToken }) => {

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

const navigate = useNavigate();

const handleSubmit = async e => {
  e.preventDefault();
  try {
    const response = await axios.post('/api/login', { email, password });
    const token = response.data.access_token;
    // console.log(response);
    // console.log(token)
    localStorage.setItem('token', token);
    setToken(token);
    navigate('/circuits');
  } catch (error) {
      // console.log(error);
      alert(error.response.data.msg);
  }
};

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-200">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-4">Login</h2>

          <form onSubmit={handleSubmit}>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>    
              </label>
              <input className="input input-bordered w-full max-w-xs"
                name="email"
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
                name="password"
                type="password" 
                placeholder="Password"  
                required
                value = { password }
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-control mt-2 text-right">
              <Link 
                to="/forgot-password" 
                className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="form-control mt-6">
              <button className="btn btn-accent">Login</button>
            </div>
            {/* {error && <p style={{ color: 'red' }}>{error}</p>} */}
          </form>
        </div>
      </div>
    </div>
  );
}
 
export default Login;