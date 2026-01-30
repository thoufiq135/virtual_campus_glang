
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from "@react-oauth/google";
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
createRoot(document.getElementById('root')).render(
 <BrowserRouter>
 <GoogleOAuthProvider clientId='1042875979585-8hf4pc9mtd3h1kgqojfgfeknkopivuc1.apps.googleusercontent.com'>
      <App />
 </GoogleOAuthProvider>
 </BrowserRouter>


)
