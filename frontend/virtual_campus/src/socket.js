import {io} from "socket.io-client"
const socket = io("http://3.26.1.207:3030", {
  transports: ["websocket"],
  autoConnect: true
});
export default socket;