import {io} from "socket.io-client"
const socket = io("https://ws.gsin.online", {
  transports: ["websocket"],
  autoConnect: true
});
export default socket;
