// // src/main.tsx
// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import './index.css'

// import App from './App'
// import Login from './pages/Login'
// import Register from './pages/Register'
// import Dashboard from './pages/Dashboard'

// // Guards (already in src/routes/* per your tree)
// import StartRoute from './routes/StartRoute'
// import ProtectedRoute from './routes/ProtectedRoute'
// import PublicOnlyRoute from './routes/PublicOnlyRoute'

// // Initialize axios Authorization header from localStorage on first load
// import { initAuthFromStorage } from './lib/api'
// initAuthFromStorage()

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<App />}>
//           {/* "/" decides based on auth */}
//           <Route index element={<StartRoute />} />

//           {/* Public pages (hidden when logged in) */}
//           <Route path="login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
//           <Route path="register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

//           {/* Protected page */}
//           <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

//           {/* Fallback to StartRoute */}
//           <Route path="*" element={<StartRoute />} />
//         </Route>
//       </Routes>
//     </BrowserRouter>
//   </React.StrictMode>
// )


// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import App from './App'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Help from './pages/Help' // ⟵ NEW

// Guards
import StartRoute from './routes/StartRoute'
import ProtectedRoute from './routes/ProtectedRoute'
import PublicOnlyRoute from './routes/PublicOnlyRoute'

// Initialize axios Authorization header from localStorage on first load
import { initAuthFromStorage } from './lib/api'
initAuthFromStorage()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          {/* "/" decides based on auth */}
          <Route index element={<StartRoute />} />

          {/* Public pages */}
          <Route path="help" element={<Help />} /> {/* ⟵ NEW public route */}

          {/* Public-only auth pages */}
          <Route path="login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          {/* Protected page */}
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Fallback to StartRoute */}
          <Route path="*" element={<StartRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
