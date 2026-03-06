import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import HomePage from './pages/HomePage.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/mpk-mini3-configurator">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/customize" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
