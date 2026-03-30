import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from './AxiosInstance.js';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const Navbar = ({ token, setToken, message, setMessage }) => {

  const navigate = useNavigate();
  const [role, setRole] = useState(null);

    useEffect(() => {
      const storedToken = localStorage.getItem('token');
      // console.log('Navbar useEffect — token:', storedToken);

      if (!storedToken) {
        setMessage("No token found");
        setRole(null);
        return;
      }

      // ✅ Decode the token to get role
      try {
        const decoded = jwtDecode(storedToken);
        // console.log('Decoded JWT:', decoded);
        setRole(decoded.role);
        setMessage(decoded.email);
      } catch (err) {
        console.error('Invalid token format:', err);
        setRole(null);
        localStorage.removeItem('token');
        setToken(null);
        navigate('/login');
        return;
      }

      axios.get('/api/navbar', {
        headers: {
          Authorization: `Bearer ${storedToken}`
        }
      }).then(res => {
        // console.log('Navbar response:', res.data);
        // setMessage(res.data.email);
      }).catch(err => {
        console.error('Navbar error:', err.response?.data || err.message);
        // Optional: auto-logout if token is invalid
        if (err.response?.data?.msg === 'Signature verification failed') {
          localStorage.removeItem('token');
          setToken(null);
          setRole(null);
          navigate('/login');
        }
        setMessage("Access denied");
      });
    }, [token, setMessage, navigate, setToken]);

    const getLinksByRole = (role) => {
      switch (role) {
        case "technician":
          return ["Circuits", "Sites", "Commission"];
        case "finance":
          return ["Dashboard", "Commission"];
        case "sales":
          return ["Dashboard", "Circuits", "Sites", "Commission"];
        case "admin":
          return ["Dashboard", "Circuits", "Sites", "Register New User", "Logs", "Commission"];
        default:
          return [];
      }
    };

    const handleLogout = async () => {
        try {
          // Optionally notify the backend
          await axios.post('/api/logout', {}, { withCredentials: true });
    
          // Clear local token
          localStorage.removeItem('token');
          setToken(null);
          setRole(null);
    
          // Redirect to login
          navigate('/login');
        } catch (err) {
          console.error('Logout failed:', err);
          toast.error('Logout failed.');
        }
      };

    return (
        <div className="navbar shadow-2xl bg-base-200 roundedborders">
        <div className="flex-1">

            <img src="/aesirblue.png" className="App-logo" alt="logo" />

        </div>

        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
             {token ? (
            <>
               {getLinksByRole(role).includes("Dashboard") && (
                <li className="mx-2"><Link to="/dashboard">Dashboard</Link></li>
              )}
              {getLinksByRole(role).includes("Circuits") && (
                <li className="mx-2"><Link to="/circuits">Circuits</Link></li>
              )}
              {getLinksByRole(role).includes("Sites") && (
                <li className="mx-2"><Link to="/sites">Sites</Link></li>
              )}
              {getLinksByRole(role).includes("Register New User") && (
                <li className="mx-2"><Link to="/register">Register New User</Link></li>
              )}
              {getLinksByRole(role).includes("Logs") && (
                <li className="mx-2"><Link to="/logs">Logs</Link></li>
              )}
              {getLinksByRole(role).includes("Commission") && (
                <li className="mx-2"><Link to="/commission">Commission</Link></li>
              )}
              <li className="mx-2">
                <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
                {message}
              </li>
            </>
            ) : (
            <li className="mx-2"><Link to="/login">Login</Link></li>
            )}
          </ul>
        </div>
      </div>
        );
      }
 
export default Navbar;
