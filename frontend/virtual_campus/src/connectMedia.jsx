import React, { useEffect, useRef ,useState} from 'react'
import * as mediasoup from "mediasoup-client"
import socket from './socket'
import { connect } from 'socket.io-client'
import { Producer } from 'mediasoup-client/types'


const Media_soup = (roomId) => {
   const deviceRef=useRef(null)
const myProducerIdsRef = useRef([]);
const audioProducerRef = useRef(null);
const [isMuted, setIsMuted] = useState(false);

   const producerRef = useRef(null);
const sessionRef = useRef(0);
const videoRef=useRef(null)
   const sendTransportRef = useRef(null);
const streamRef = useRef(null);
const recvTransportRef = useRef(null);
const [remoteStreams,setRemoteStreams]=useState([]);
const hasJoinedRef = useRef(false);
const data=localStorage.getItem("stackenzo_gsin_user_data")
const parsed = JSON.parse(data);
const name=parsed.user
const TEST_SELF_CONSUME = false
console.log("name",name.display_name)
const avatar_url=name.avatar_url
console.log("avatar=",name.avatar_url)
console.log("came room id=",roomId.roomId)
   const consumedProducersRef = useRef(new Set())



   useEffect(()=>{
    if(!roomId) return
if(!name||!avatar_url){
console.log("did'nt get name or avatar url")
return
}


 socket.emit("joinRoom",{roomid:roomId.roomId,name,avatar_url},async data=>{
if (data.error) {
        console.log(data.error);
        return;
      }
      // const capabilites=JSON.stringify(data.rtpCapabilities,null,2)
       console.log(`Joined meeting room= ${roomId.roomId} `);
console.log("got producers",data.producer)
   
 deviceRef.current=new mediasoup.Device()
 await deviceRef.current.load({
     routerRtpCapabilities: data.rtpCapabilities
 })
  console.log("device loaded");

   if (data.producer) {
  data.producer.forEach(pid => {
    if (!myProducerIdsRef.current.includes(pid)) {
      consume(pid);
   }
 });
}
   socket.emit("createTransport",{},async params=>{
    sendTransportRef.current=deviceRef.current.createSendTransport(params)
    console.log("Transport direction:", sendTransportRef.current.direction);
sendTransportRef.current.on(
  "connect",
  ({dtlsParameters},callback)=>{
    socket.emit("connectTransport",{dtlsParameters},callback)
  }
)
sendTransportRef.current.on(
  "produce",
  ({kind,rtpParameters},callback)=>{
    socket.emit("produce",{kind,rtpParameters},({id})=>callback({id}))
  }
)
try {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
 
  })
     streamRef.current=stream
if (videoRef.current) {
  videoRef.current.srcObject = stream;
}
const videoTrack = stream.getVideoTracks()[0];
const audioTrack = stream.getAudioTracks()[0];
producerRef.current = await sendTransportRef.current.produce({
  track: videoTrack
});
audioProducerRef.current = await sendTransportRef.current.produce({
  track: audioTrack
});
console.log("completed produce")
  // produce logic
} catch (err) {
  console.log("Camera not available:", err.message)
}



    // connectSendTransport()
   })

    })
    socket.on("newProducer", ({ producerId }) => {
     if(!TEST_SELF_CONSUME &&
    myProducerIdsRef.current.includes(producerId))
      return
       console.log("new producer detected", producerId)
       consume(producerId)
});
socket.on("resumeProducer", async ({producerId})=>{
  console.log("consumer joined, producer should flow")
})
    return()=>{
       socket.off("newProducer");
      console.log("stopping meeting")
      socket.emit("leaveRoom")
        sessionRef.current++;
         if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
     if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
      if (producerRef.current) {
      producerRef.current.close();
      producerRef.current = null;
    }

    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
 if (recvTransportRef.current) {
    recvTransportRef.current.close();
    recvTransportRef.current = null;
  }
   

   
  setRemoteStreams([]);
    }
   },[roomId])

const createRecvTransport = () => {
  return new Promise(resolve => {

    socket.emit("createRecvTransport", {}, params => {

      const transport =
        deviceRef.current.createRecvTransport(params)

      transport.on(
        "connect",
        ({ dtlsParameters }, callback) => {
          socket.emit(
            "connectRecvTransport",
            { dtlsParameters },
            callback
          )
        }
      )
transport.on("dtlsstatechange", state=>{
  console.log("DTLS STATE:", state)
})
transport.on("icestatechange", state=>{
  console.log("ICE STATE:", state)
})
      resolve(transport)   // ✅ resolve immediately
    })

  })
}




const consume = async (producerId) => {

  if (consumedProducersRef.current.has(producerId)) {
    console.log("Already consuming", producerId)
    return
  }

  consumedProducersRef.current.add(producerId)

  // 🔥 REUSE TRANSPORT
  if (!recvTransportRef.current) {
    recvTransportRef.current = await createRecvTransport()
  }

  const recvTransport = recvTransportRef.current

  socket.emit(
    "consume",
    {
      producerId,
      rtpCapabilities: deviceRef.current.rtpCapabilities
    },
    async ({ id, kind, rtpParameters }) => {

      const consumer = await recvTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters
      })

      console.log("CONSUMER CREATED:", consumer.id)
      console.log("consumer paused?", consumer.paused)
console.log("TRACK SETTINGS:", consumer.track.getSettings())
console.log("TRACK ENABLED:", consumer.track.enabled)

      consumer.track.onunmute = () =>
        console.log("track UNMUTED 🎥")



      const stream = new MediaStream()
      stream.addTrack(consumer.track)

      setRemoteStreams(prev => [...prev, { stream }])
    }
  )
}

const toggleMic=async()=>{
  if(!audioProducerRef.current) return
  if(isMuted){
    await audioProducerRef.current.resume()
    console.log("mic unmuted")

  }else{
    await audioProducerRef.current.pause()
    console.log("mic muted")
  }
setIsMuted(prev => !prev);
}

const Video = ({ stream }) => {
  const ref = useRef(null)

 useEffect(() => {
  if (!ref.current || !stream) return

  ref.current.srcObject = stream

  const interval = setInterval(() => {
    if (ref.current) {
      console.log(
        "VIDEO STATS →",
        "readyState:", ref.current.readyState,
        "time:", ref.current.currentTime,
        "paused:", ref.current.paused
      )
    }
  }, 2000)

  ref.current.onloadedmetadata = () => {
    ref.current.play().catch(()=>{})
  }

  return () => clearInterval(interval)
}, [stream])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={false}
      style={{
        width: "320px",
  height: "240px",
  background: "red",
 
margin:"10px",
  zIndex: 9999999
      }}
    />
  )

}

return (
  <div>

    {/* Local Preview */}
    { <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "320px",
        height: "240px",
        background: "black",
        zIndex: 9999
      }}
    /> }
<button onClick={toggleMic}>
  {isMuted ? "Unmute" : "Mute"}
</button>

    {/* Remote Videos */}
    <div style={{ display: "flex", flexWrap: "wrap" }}>
     {remoteStreams.map((obj, i) => (
  <Video key={i} stream={obj.stream} />
))}

    </div>

  </div>
);
}
export default Media_soup;
