import {io} from "socket.io-client"
const socket = io("http://localhost:3030", {
  transports: ["websocket"],
  autoConnect: true
});
export default socket;