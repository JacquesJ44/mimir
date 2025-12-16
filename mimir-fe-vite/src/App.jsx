import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css';
import PrivateRoute from './PrivateRoute.jsx';
import Login from './Login.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';
import Navbar from './Navbar.jsx';
import Sites from './Sites.jsx';
import Circuits from './Circuits.jsx';
import AddCircuit from './AddCircuit.jsx';
import AddSite from './AddSite.jsx';
import ViewSite from './ViewSite.jsx';
import ViewCircuit from './ViewCircuit.jsx';
import UpdateCircuit from './UpdateCircuit.jsx';
import Register from './Register.jsx';
import Dashboard from './Dashboard.jsx';
import LogsPage from './Logs.jsx';
import Commission from './Commission.jsx';

function App() {

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [message, setMessage] = useState('');

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-base-200">
        <Navbar token={token} setToken={setToken} message={message} setMessage={setMessage}/>
        
        <div className='grow flex items-center justify-center'>
          <Routes>
            <Route path='/' element={ token ? <Navigate to="/circuits" /> : <Navigate to="/login" />} />
            <Route path="/login" element={<Login setToken={setToken} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
              
            <Route path='/dashboard' element={<PrivateRoute>
                                      <Dashboard />
                                    </PrivateRoute>} />

            <Route path='/sites' element={<PrivateRoute>
                                      <Sites />
                                    </PrivateRoute>} />

            <Route path='/sites/addsite' element={<PrivateRoute>
                                      <AddSite />
                                    </PrivateRoute>} />

            <Route path='/sites/viewsite/:site' element={<PrivateRoute>
                                      <ViewSite />
                                    </PrivateRoute>} />

            <Route path='/circuits' element={<PrivateRoute>
                                      <Circuits />
                                    </PrivateRoute>} />

            <Route path='/circuits/viewcircuit/:id' element={<PrivateRoute>
                                      <ViewCircuit />
                                    </PrivateRoute>} />

            <Route path='/circuits/updatecircuit/:id' element={<PrivateRoute>
                                      <UpdateCircuit />
                                    </PrivateRoute>} />

            <Route path='/circuits/addcircuit' element={<PrivateRoute>
                                      <AddCircuit />
                                    </PrivateRoute>} />

            <Route path='/register' element={<PrivateRoute>
                                      <Register />
                                    </PrivateRoute>} />
            <Route path='/logs' element={<PrivateRoute>
                                      <LogsPage />
                                    </PrivateRoute>} />
            <Route path='/commission' element={<PrivateRoute>
                                      <Commission />
                                    </PrivateRoute>} />
          </Routes>
        </div> 
      </div>
    </BrowserRouter>
  );
}

export default App;
