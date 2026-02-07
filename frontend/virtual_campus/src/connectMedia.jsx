import React, { useEffect, useRef ,useState} from 'react'
import * as mediasoup from "mediasoup-client"
import socket from './socket'
import { connect } from 'socket.io-client'
import { Producer } from 'mediasoup-client/types'


const Media_soup = (roomId) => {
   const deviceRef=useRef(null)
   const producerRef = useRef(null);
const sessionRef = useRef(0);
const videoRef=useRef(null)
   const sendTransportRef = useRef(null);
const streamRef = useRef(null);
const recvTransportRef = useRef(null);
const [remoteStreams,setRemoteStreams]=useState([]);


console.log("came room id=",roomId.roomId)
   
   useEffect(()=>{
    if(!roomId) return
    sessionRef.current++;


 socket.emit("joinRoom",{roomid:roomId.roomId},async data=>{
if (data.error) {
        console.log(data.error);
        return;
      }
       console.log(`Joined meeting room= ${roomId.roomId} with ${data.rtpCapabilities}`);
   
 deviceRef.current=new mediasoup.Device()
 await deviceRef.current.load({
     routerRtpCapabilities: data.rtpCapabilities
 })
  console.log("device loaded");
   await createRecvTransport();
    if (data.producers) {
  data.producers.forEach(pid => consume(pid));
}
   socket.emit("createTransport",async params=>{
    sendTransportRef.current=deviceRef.current.createSendTransport(params)
    console.log("Transport direction:", sendTransportRef.current.direction);

    connectSendTransport()
   })

    })
    socket.on("newProducer", ({ producerId }) => {
      if (!recvTransportRef.current) return;
  console.log("New producer:", producerId);
  consume(producerId);
});
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
 const connectSendTransport=()=>{
  const transport=sendTransportRef.current
  transport.on("connect",({dtlsParameters},cb)=>{
    socket.emit("connectTransport",{dtlsParameters})
    cb()
  })
  transport.on("produce",async (params,cb)=>{
    socket.emit("produce",params,({id})=>cb({id}))
  })
  startWebcam()
 }

const startWebcam = async () => {
console.log("startWebcam called");
  const session = ++sessionRef.current;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
console.log("got media stream", stream);
  // User already left
  if (session !== sessionRef.current) {
    stream.getTracks().forEach(t => t.stop());
    return;
  }

  streamRef.current = stream;

  // Attach preview AFTER React paint
  requestAnimationFrame(() => {
     console.log("videoRef:", videoRef.current);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(()=>{});
       console.log("preview attached");
    }
  });

  if (!sendTransportRef.current) return;

 await sendTransportRef.current.produce({
  track: stream.getVideoTracks()[0]
});

await sendTransportRef.current.produce({
  track: stream.getAudioTracks()[0]
});


  console.log("webcam streaming");
};

 const createRecvTransport=async ()=>{
  socket.emit("createRecvTransport",params=>{
    recvTransportRef.current=deviceRef.current.createRecvTransport(params)
    recvTransportRef.current.on("connect",({dtlsParameters},cb)=>{
      socket.emit("connectRecvTransport",{dtlsParameters})
      cb()
    })
  })
 }
const consume=async (producerId)=>{
  
  socket.emit("consume",{
    producerId,
    rtpCapabilities:deviceRef.current.rtpCapabilities
  },async data=>{
    if(data?.error) return console.log(data.error)
    const consumer=await recvTransportRef.current.consume({
      id:data.id,
      producerId:data.producerId,
      kind:data.kind,
      rtpParameters:data.rtpParameters
    })
    const stream=new MediaStream()
    stream.addTrack(consumer.track)
    socket.emit("resumeConsumer");
    addRemoteVideo(stream)
  }
)
}
function addRemoteVideo(stream){
setRemoteStreams(s=>[...s,stream])
}
  return (
   <div>
  <video
    ref={videoRef}
    autoPlay
    muted={false}
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

  />

  <div style={{display:"flex",flexWrap:"wrap"}}>
    {remoteStreams.map((s,i)=>(
      <video
        key={i}
        
        playsInline
       ref={el => {
   if (el) {
     el.srcObject = s;
     el.onloadedmetadata = () => el.play();
   }
 }}
        width="200"
      />
    ))}
  </div>
</div>
  )
}

export default Media_soup;
