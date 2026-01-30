import { Routes, Route } from "react-router-dom";
import Login from "./login";
import Campus from "./Campus";
function App() {
  
  return (
 <Routes>
  <Route path="/Login" element={<Login/>}/>
  <Route path="/campus" element={<Campus/>}/>
 </Routes>
  );
}

export default App;
