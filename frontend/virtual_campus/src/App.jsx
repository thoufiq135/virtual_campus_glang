import { Routes, Route } from "react-router-dom";
import Login from "./login";
import Campus from "./Campus";
import Media_soup from "./connectMedia";
import { useEffect,useState } from "react";
import socket from "./socket";
function App() {
  const [roomId, setRoomId] = useState(null);
useEffect(()=>{
socket.on("connect",()=>{
  console.log("socket connected id= ",socket.id)
})
 const handler = () => setRoomId(window.currentRoomId);

  window.addEventListener("roomChanged", handler);
return () => window.removeEventListener("roomChanged", handler);
},[])
  return (
<>
 {roomId && <Media_soup roomId={roomId}/>}
 <Routes>
  <Route path="/Login" element={<Login/>}/>
  <Route path="/campus" element={<Campus/>}/>
 </Routes>

</>
  );
}

export default App;
