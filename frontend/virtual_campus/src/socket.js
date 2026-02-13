import {io} from "socket.io-client"
//https://ws.gsin.online"
const socket = io("https://ws.gsin.online", {
  transports: ["websocket"],
  autoConnect: true
});
export default socket;
