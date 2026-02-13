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
const [remoteStreams, setRemoteStreams] = useState({});
const recvTransportPromiseRef = useRef(null);

const data=localStorage.getItem("stackenzo_gsin_user_data")
const parsed = JSON.parse(data);
const name=parsed.user
const shouldPublish = true; // decide based on role

const TEST_SELF_CONSUME = true
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
 if(shouldPublish){
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
myProducerIdsRef.current.push(producerRef.current.id);
audioProducerRef.current = await sendTransportRef.current.produce({
  track: audioTrack
});
myProducerIdsRef.current.push(audioProducerRef.current.id);
console.log("completed produce")
 }
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
       audioProducerRef.current?.close();
    }

    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
 if (recvTransportRef.current) {
    recvTransportRef.current.close();
    recvTransportRef.current = null;
    recvTransportPromiseRef.current = null;

  }
     consumedProducersRef.current.clear();
  myProducerIdsRef.current = [];

   
  setRemoteStreams({});
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

  if (!recvTransportPromiseRef.current) {
    recvTransportPromiseRef.current = createRecvTransport();
  }

  recvTransportRef.current = await recvTransportPromiseRef.current;
}


  const recvTransport = recvTransportRef.current

  socket.emit(
    "consume",
    {
      producerId,
      rtpCapabilities: deviceRef.current.rtpCapabilities
    },
    async ({ id, kind, rtpParameters,peerId }) => {
console.log("PEER ID RECEIVED:", peerId);
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



 setRemoteStreams(prev => {

  const updated = { ...prev };

  if (!updated[peerId]) {
    updated[peerId] = new MediaStream();
  }

  // add incoming track
  updated[peerId].addTrack(consumer.track);

  // ⭐ force browser refresh (IMPORTANT)
  updated[peerId] = new MediaStream(
    updated[peerId].getTracks()
  );

  return updated;
});


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
  const ref = useRef(null);
console.log("Tracks:", stream.getTracks())
  useEffect(() => {
    if (!ref.current || !stream) return;

    const video = ref.current;
      video.srcObject = null; 
    video.srcObject = stream;

    const handleLoaded = () => {
      video.play()
  .then(() => console.log("PLAY SUCCESS"))
  .catch(e => console.log("PLAY FAILED", e));
    };

    video.onloadedmetadata = handleLoaded;

    const interval = setInterval(() => {
      console.log(
        "VIDEO STATS →",
        "readyState:", video.readyState,
        "time:", video.currentTime,
        "paused:", video.paused
      );
      console.log(
  "VIDEO SIZE →",
  video.videoWidth,
  video.videoHeight
);

    }, 2000);

    return () => {
      clearInterval(interval);
      video.onloadedmetadata = null;
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={false}
      style={{
        marginLeft:"600px",
        width: "220px",
  height: "160px",
  background: "black",
  borderRadius: "12px",
  objectFit: "cover",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
      }}
    />
  );
};
console.log(
    "REMOTE STREAM COUNT:",
    Object.keys(remoteStreams).length
  );

return (
  <div>

    {/* Local Preview */}
    {/* { <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "320px",
        height: "240px",
        background: "black",
        zIndex: 9999
      }}
    /> } */}
<button onClick={toggleMic}>
  {isMuted ? "Unmute" : "Mute"}
</button>

    {/* Remote Videos */}
   {/* Remote Videos Layer */}
<div
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 999999999,
    pointerEvents: "none",   // allow clicks to pass to game
    display: "flex",
    flexWrap: "wrap"
  }}
>
  {Object.entries(remoteStreams).map(([id, stream]) => (
    <div key={id} style={{ pointerEvents: "auto" }}>
      <Video stream={stream} />
    </div>
  ))}
</div>


  </div>
);
}
export default Media_soup;
