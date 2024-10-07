import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io.connect('/api/socketio');

function App() {
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const targetUserId = useRef(null);  // To keep track of the second user's ID

  useEffect(() => {
    // Create a new RTCPeerConnection for WebRTC
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Handle ICE candidates from the peer connection
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          target: targetUserId.current,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming remote stream and display it
    peerConnection.current.ontrack = (event) => {
      videoRef.current.srcObject = event.streams[0];
    };

    // Socket event listeners for signaling
    socket.on('offer', async (data) => {
      targetUserId.current = data.sender;
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('answer', {
        target: data.sender,
        answer: answer,
      });
    });

    socket.on('answer', async (data) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    });

    socket.on('ice-candidate', async (data) => {
      if (data.candidate) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,  // Share audio along with screen
      });

      // Add screen and audio tracks to the peer connection
      screenStream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, screenStream);
      });

      setIsSharing(true);

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      // Broadcast the offer
      socket.emit('offer', {
        sender: socket.id,
        offer: offer,
      });
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  return (
    <div>
      <h1>Screen Sharing with Audio</h1>

      {/* Video element for remote screen view */}
      <video
        ref={videoRef}
        autoPlay
        controls
        style={{ width: '80%', border: '1px solid black', marginBottom: '20px' }}
      />

      {/* Button to start sharing screen */}
      {!isSharing && (
        <button onClick={startScreenShare}>
          Start Sharing Screen with Audio
        </button>
      )}

      {isSharing && <p>You are sharing your screen with audio.</p>}
    </div>
  );
}

export default App;
