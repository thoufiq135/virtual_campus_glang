import { useEffect, useRef ,useState} from 'react'
import * as mediasoup from "mediasoup-client"
import socket from './socket'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVideo,faVideoSlash,faMicrophoneLinesSlash,faMicrophone } from "@fortawesome/free-solid-svg-icons";


const Media_soup = (roomId) => {
   const deviceRef=useRef(null)
const myProducerIdsRef = useRef([]);
const audioProducerRef = useRef(null);
const [isMuted, setIsMuted] = useState(true);
const [isvideo, setvideo] = useState(false);
   const producerRef = useRef(null);
const sessionRef = useRef(0);
const videoRef=useRef(null)
   const sendTransportRef = useRef(null);
const streamRef = useRef(null);
const recvTransportRef = useRef(null);
const [remoteStreams, setRemoteStreams] = useState({});
const recvTransportPromiseRef = useRef(null);
const peerConsumersRef = useRef({});
const data=localStorage.getItem("stackenzo_gsin_user_data")
const parsed = JSON.parse(data);
const name=parsed.user


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

   })

    })
    socket.off("newProducer");
    socket.on("newProducer", ({ producerId }) => {
     if(!TEST_SELF_CONSUME &&
    myProducerIdsRef.current.includes(producerId))
      return
       console.log("new producer detected", producerId)
       consume(producerId)
});
socket.on("producerClosed", ({ producerId }) => {
  console.log("Producer closed from server:", producerId);

  const consumer = peerConsumersRef.current[producerId];

  if (!consumer) return;

  const { peerId } = consumer.appData;

  consumer.close();
  delete peerConsumersRef.current[producerId];
  consumedProducersRef.current.delete(producerId);

  setRemoteStreams(prev => {
    const updated = { ...prev };
    const stream = updated[peerId];

    if (!stream) return prev;

    // remove ONLY this specific track
    stream.getTracks().forEach(track => {
      if (track.id === consumer.track.id) {
        stream.removeTrack(track);
      }
    });

    // if no tracks left → remove peer entry
    if (stream.getTracks().length === 0) {
      delete updated[peerId];
    } else {
      updated[peerId] = new MediaStream(stream.getTracks());
    }

    return updated;
  });
});
socket.on("resumeProducer", async ({producerId})=>{
  console.log("consumer joined, producer should flow")
})
    return()=>{
        setRemoteStreams({});
          consumedProducersRef.current.clear();
          socket.off("producerClosed");
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
   
  myProducerIdsRef.current = [];

   

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
      consumer.appData = { producerId, peerId };
      peerConsumersRef.current = peerConsumersRef.current || {};
peerConsumersRef.current[producerId] = consumer;
consumer.on("producerclose", () => {
  console.log("Producer closed (consumer event) for:", peerId);

  setRemoteStreams(prev => {
    const updated = { ...prev };
    const stream = updated[peerId];

    if (!stream) return prev;

    stream.getTracks().forEach(track => {
      if (track.id === consumer.track.id) {
        stream.removeTrack(track);
      }
    });

    if (stream.getTracks().length === 0) {
      delete updated[peerId];
    } else {
      updated[peerId] = new MediaStream(stream.getTracks());
    }

    return updated;
  });

  consumedProducersRef.current.delete(producerId);
  delete peerConsumersRef.current[producerId];
});
consumer.on("transportclose", () => {
  console.log("🔥 transport closed for peer:", peerId);

  setRemoteStreams(prev => {
    const updated = { ...prev };
    delete updated[peerId];
    return updated;
  });
});
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

const toggleMic = async () => {
  try {

    // 🎤 first time → create mic
    if (!audioProducerRef.current) {

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const audioTrack = stream.getAudioTracks()[0];

      audioProducerRef.current =
        await sendTransportRef.current.produce({
          track: audioTrack
        });

      setIsMuted(false);
      console.log("🎤 Mic started");
      return;
    }

    // pause / resume
    if (audioProducerRef.current.paused) {
      await audioProducerRef.current.resume();
      setIsMuted(false);
    } else {
      await audioProducerRef.current.pause();
      setIsMuted(true);
    }

  } catch (err) {
    console.log(err);
  }
};
const togglevideo = async () => {
  try {

    // 📷 first time → create camera
    if (!producerRef.current) {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      const videoTrack = stream.getVideoTracks()[0];

      producerRef.current =
        await sendTransportRef.current.produce({
          track: videoTrack
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setvideo(true);
      console.log("📷 Camera started");
      return;
    }

    // toggle on/off
    if (isvideo) {

      const track = streamRef.current?.getVideoTracks()[0];
      if (track) track.stop();

      await producerRef.current.replaceTrack({ track: null });

      setvideo(false);
      console.log("📷 Camera OFF");

    } else {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      const track = stream.getVideoTracks()[0];

      await producerRef.current.replaceTrack({ track });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      streamRef.current = stream;

      setvideo(true);
      console.log("📷 Camera ON");
    }

  } catch (err) {
    console.log(err);
  }
};
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
 <>
 <div className='h-fit w-fit bg-amber-600 '>
   <div className="fixed inset-0 z-50 pointer-events-none bg-amber-50 w-60">

    {/* Left Video Sidebar */}
    <div className="absolute top-4 left-4 flex flex-col gap-4 pointer-events-auto">

      {/* Local Preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-[220px] h-[180px] bg-black rounded-2xl shadow-2xl object-cover border border-gray-700"
      />

      {/* Remote Videos */}
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <Video key={id} stream={stream} />
      ))}

    </div>
  </div>
  
 </div>
    <div className=' bg-amber-700 h-fit w-full  flex justify-center '>
     <div className="absolute bottom-3  pointer-events-auto bg-amber-100 h-15 w-fit pl-4 pr-4 rounded-2xl flex  justify-center items-center">
      <button
        onClick={toggleMic}
        className="px-4 py-2 bg-blue-600 shadow-black hover:bg-blue-700 text-white rounded-lg shadow-lg transition h-10"
      >
        {isMuted ?  <FontAwesomeIcon icon={faMicrophoneLinesSlash} /> :<FontAwesomeIcon icon={faMicrophone} />}
      </button>
       <button
             onClick={togglevideo}
        className="px-4 py-2 ml-3 shadow-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition h-10"
      >
        {isvideo ?  <FontAwesomeIcon icon={faVideo} />: <FontAwesomeIcon icon={faVideoSlash} />}
      </button>
    </div>
   </div>
 </>
 
);
}
export default Media_soup;
