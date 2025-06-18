import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css';
import PrivateRoute from './PrivateRoute';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Navbar from './Navbar';
import Sites from './Sites';
import Circuits from './Circuits';
import AddCircuit from './AddCircuit';
import AddSite from './AddSite';
import ViewSite from './ViewSite';
import ViewCircuit from './ViewCircuit';
import UpdateCircuit from './UpdateCircuit';
import Register from './Register';

function App() {

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [message, setMessage] = useState('');

  return (
    <BrowserRouter basename='/mimir'>
      <div className="min-h-screen flex flex-col bg-base-200">
        <Navbar token={token} setToken={setToken} message={message} setMessage={setMessage}/>
        
        <div className='flex-grow flex items-center justify-center'>
          <Routes>
            <Route path='/' element={ token ? <Navigate to="/circuits" /> : <Navigate to="/login" />} />
            <Route path="/login" element={<Login setToken={setToken} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
              
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
          </Routes>
        </div> 
      </div>
    </BrowserRouter>
  );
}

export default App;
