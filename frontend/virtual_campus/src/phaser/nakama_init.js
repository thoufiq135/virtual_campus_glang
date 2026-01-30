import { Client } from "@heroiclabs/nakama-js";

export async function connect_nakama() {

  const client = new Client(
    "defaultkey",
    "3.106.204.203",
    "7350",
    false
  );

  // Get stored Nakama user
  const raw = JSON.parse(localStorage.getItem("stackenzo_gsin_user_data"));
const user=raw.user
  if(!user){
    console.error("No nakama user data");
    return;
  }

  // Authenticate custom with Nakama
  console.log("user id=",user)
  const session = await client.authenticateCustom(user.id, true);

  console.log("NAKAMA SESSION:", session.token);

  // Save session
  localStorage.setItem("nakama_session", session.token);

  // Create socket
  const socket = client.createSocket(false,false);

  socket.onerror = e => console.error("Socket error", e);

  // Connect socket
  await socket.connect(session);

  console.log("✅ Socket connected");

  // Call RPC
const rpc = await client.rpc(session, "create_join_match", {});


  const result = rpc.payload;

  console.log("Match id:", result.match_id);

  // Join match
  const match = await socket.joinMatch(result.match_id);

  console.log("Joined match:", match.match_id);
// socket.onmatchdata=msg=>{
//   const json=new TextDecoder().decode(msg.data)
//   const data=JSON.parse(json)
//   console.log(data)
// }
// console.log("session id test=",session.user_id)
  return {
    socket,
    matchId: match.match_id,
    userId:session.user_id
  };
}
