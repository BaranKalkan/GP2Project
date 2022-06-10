const firebaseConfig = {
  apiKey: "AIzaSyCNEL309hE3p78WT7tsEeeceS9alLZVRpM",
  authDomain: "gp2-rtc.firebaseapp.com",
  databaseURL: "https://gp2-rtc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gp2-rtc",
  storageBucket: "gp2-rtc.appspot.com",
  messagingSenderId: "801126148259",
  appId: "1:801126148259:web:99ea778e757707f5243716",
  measurementId: "G-DWJPDVHE9C"
};

firebase.initializeApp(firebaseConfig);

mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'));

const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;

function init() {
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
  roomDialog = new mdc.dialog.MDCDialog(document.querySelector('#room-dialog'));

}

async function createRoom() {
  const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc();

  //console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

   // open message channel
   window.messageChannel = peerConnection.createDataChannel('test');  
   setChannelEvents(messageChannel, 'caller');
   // open message channel

  // Code for collecting ICE candidates below
  const callerCandidatesCollection = roomRef.collection('callerCandidates');

  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      //console.log('Got final candidate!');
      return;
    }
    //console.log('Got candidate: ', event.candidate);
    callerCandidatesCollection.add(event.candidate.toJSON());
  });
  // Code for collecting ICE candidates above

  // Code for creating a room below
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  //console.log('Created offer:', offer);

  const roomWithOffer = {
    'offer': {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  await roomRef.set(roomWithOffer);
  roomId = roomRef.id;
  //console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  document.querySelector(
      '#currentRoom').innerText = `Current room is ${roomRef.id} - You are the caller!`;

  // Code for creating a room above

  peerConnection.addEventListener('track', event => {
    //console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      //console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // Listening for remote session description below
  roomRef.onSnapshot(async snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data && data.answer) {
      //console.log('Got remote description: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
    }
  });
  // Listening for remote session description above

  // Listen for remote ICE candidates below
  roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        let data = change.doc.data();
        // console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  // Listen for remote ICE candidates above

 

  return roomId;
}

async function joinRoomById(roomId) {
  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  // console.log('Got room:', roomSnapshot.exists);

  if (roomSnapshot.exists) {
    // console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);

    registerPeerConnectionListeners();
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // open message channel
    peerConnection.ondatachannel = function(event) {
      window.messageChannel = event.channel;
      setChannelEvents(window.messageChannel, 'answerer');
    }
    // open message channel

    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        // console.log('Got final candidate!');
        return;
      }
      // console.log('Got candidate: ', event.candidate);
      calleeCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    peerConnection.addEventListener('track', event => {
       //console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
         //console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    //console.log('Got offer:', offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
   // console.log('Created answer:', answer);
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await roomRef.update(roomWithAnswer);
    // Code for creating SDP answer above

    // Listening for remote ICE candidates below
    roomRef.collection('callerCandidates').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          // console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
    // Listening for remote ICE candidates above


  }
}


function setChannelEvents(channel, channelNameForConsoleOutput) {
 
  channel.onmessage = function (event) {
      let message = event.data;
      console.log(channelNameForConsoleOutput, 'received a message:', message);
      const d = new Date();
      let time = d.toLocaleTimeString();
      $('#messages').append(`<p class="message sender">${message}<span class="message-date">${time}</span></p>`);
      
  };

  channel.onopen = function () {
    
    $("#messageInputBox").prop( "disabled", false);
      $('#messages').empty();
      console.log('it should be opened');
     
      $('#messageInputBox').keypress(function(event) {
        if (event.keyCode == 13) {
          let message = $("#messageInputBox").val();
          messageChannel.send(message);
          const d = new Date();
          let time = d.toLocaleTimeString();
          $('#messages').append(`<p class="message receiver">${message}<span class="message-date">${time}</span></p>`);
          $("#messageInputBox").val("");
        }
      });
      
  };

  channel.onclose = function (e) {
    $('#messages').empty();
    $('#messageInputBox').unbind("keypress");
    $("#messageInputBox").prop( "disabled", true);
  };

  channel.onerror = function (e) {
      console.error(e);
  };

  console.log("message channel events binded");
}

async function openUserMedia(e) {
  const stream = await navigator.mediaDevices.getUserMedia(
      {video: true, audio: true});
  document.querySelector('#localVideo').srcObject = stream;
  localStream = stream;
  remoteStream = new MediaStream();
  document.querySelector('#remoteVideo').srcObject = remoteStream;

  //console.log('Stream:', document.querySelector('#localVideo').srcObject);
  document.querySelector('#hangupBtn').disabled = false;
}

async function hangUp(e) {
  const tracks = document.querySelector('#localVideo').srcObject.getTracks();
  tracks.forEach(track => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  document.querySelector('#localVideo').srcObject = null;
  document.querySelector('#remoteVideo').srcObject = null;
  document.querySelector('#hangupBtn').disabled = true;
  document.querySelector('#currentRoom').innerText = '';

  // Delete room on hangup
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    await roomRef.delete();
  }

  document.location.reload(true);
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    //console.log(
    //    `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
    if(peerConnection.connectionState === "disconnected")
    {
      hangUp();
    }
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
    
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    //console.log(
     //   `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });
}

init();
