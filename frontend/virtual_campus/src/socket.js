import {io} from "socket.io-client"
//https://ws.gsin.online"
//http://localhost:3030
const socket = io("https://ws.gsin.online", {
  transports: ["websocket"],
  autoConnect: true
});
export default socket;
