import "./style.css";
import { ImageCapture } from "image-capture";
import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCC_LWEcwaw0HV8nvRR4z1FrW6zLY98Uwg",
  authDomain: "video-call-e56c8.firebaseapp.com",
  projectId: "video-call-e56c8",
  storageBucket: "video-call-e56c8.appspot.com",
  messagingSenderId: "890444332859",
  appId: "1:890444332859:web:bdc7d7fd98779b2c47811e",
  measurementId: "G-GMP7F6YQDV",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById("webcamButton");
const webcamVideo = document.getElementById("webcamVideo");
const callButton = document.getElementById("callButton");
const callInput = document.getElementById("callInput");
const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");

// Button
const button_receiver=document.getElementById("Receiver");
const output_window=document.getElementById("output");


//default Sender
let user_mod=true;

button_receiver.onclick= ()=>{user_mod=false;}

// 1. Setup media sources
webcamButton.onclick = async () => {

  const socket = new WebSocket("ws://localhost:8000");
  remoteStream = new MediaStream();
  console.log('startwebcam-clicked');
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });


  const vd = localStream.getVideoTracks()[0];

  const imageCapture = new ImageCapture(vd);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let cnt = 0;
  setInterval(async () => {
   
    if (user_mod==true){
    const bitmap = await imageCapture.grabFrame();
    canvas.width = bitmap.width - (bitmap.width % 16);
    canvas.height = bitmap.height - (bitmap.height % 16);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const urlll = canvas.toDataURL();
    socket.send(urlll);
    }
    
    socket.onmessage=function(event){
    
      const dd=JSON.parse(event.data)
      let temp=dd.join(' ')
      console.log(temp);
      output_window.value=temp;
    }
    
    if (cnt == 0) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
      // Pull tracks from remote stream, add to video stream
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };
      webcamVideo.srcObject = localStream;
      remoteVideo.srcObject = remoteStream;

      callButton.disabled = false;
      answerButton.disabled = false;
      webcamButton.disabled = true;
    }
    cnt = cnt + 1;

  },1000/30);
console.log(user_mod);
  // Push tracks from local stream to peer connection
};

// 2. Create an offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection("calls").doc();
  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};


// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection("calls").doc(callId);
  const answerCandidates = callDoc.collection("answerCandidates");
  const offerCandidates = callDoc.collection("offerCandidates");

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === "added") {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }

    });
  });
 
  
};


// urlll=null
    // bitmap=null

    // if (buffer.length==6){
    //   // let batch = buffer;
    //   let batch=JSON.stringify(buffer)
    //   socket.send(batch)
    //   console.log(batch.length,typeof batch)
    //   buffer.length=0;
    // }
    // socket.send(urlll);
    // checking image type from webrtc
    // const mimeType = urlll.match(/^data:(.*);base64,/)[1];
    // console.log(mimeType);

    // fetch('http://127.0.0.1:5000/receive', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body:JSON.stringify(urlll)}).then(res=>{
    //     console.log(res);
    //     if(res.ok){
    //     return res.json()
    //     }else{
    //     alert("something is wrong")
    //     }
    //     }).then(jsonResponse=>{
    //     console.log(jsonResponse)
    //     }).catch((err) => console.error(err));