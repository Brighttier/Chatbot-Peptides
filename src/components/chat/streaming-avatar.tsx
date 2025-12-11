"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Send,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  AlertCircle,
  Captions,
  CaptionsOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication } from "livekit-client";

interface StreamingAvatarProps {
  onClose: () => void;
  welcomeMessage?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

type SessionState = "connecting" | "connected" | "error" | "ended";

export function StreamingAvatar({
  onClose,
  welcomeMessage = "Hello! I'm your AI assistant. How can I help you today with peptide information?",
}: StreamingAvatarProps) {
  const [sessionState, setSessionState] = useState<SessionState>("connecting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Transcript and chat history state
  const [transcript, setTranscript] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  // Scroll chat to bottom when new messages arrive
  const scrollChatToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Add message to chat history
  const addToChatHistory = useCallback((role: "user" | "ai", text: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      text,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, newMessage]);
  }, []);

  // Connect to LiveKit room for video streaming
  const connectToLiveKit = useCallback(async (url: string, token: string, retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 2;

    try {
      console.log(`Connecting to LiveKit (attempt ${retryCount + 1})...`, { url: url.substring(0, 30) + '...' });

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // Handle track subscription
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
        console.log("Track subscribed:", track.kind, publication.trackSid);

        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
          setIsStreamReady(true);
        } else if (track.kind === Track.Kind.Audio && audioRef.current) {
          track.attach(audioRef.current);
        }
      });

      // Handle track unsubscription
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log("Track unsubscribed:", track.kind);
        track.detach();
        if (track.kind === Track.Kind.Video) {
          setIsStreamReady(false);
        }
      });

      // Handle disconnection
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log("Disconnected from LiveKit room:", reason);
        setIsStreamReady(false);
      });

      // Handle connection errors
      room.on(RoomEvent.SignalConnected, () => {
        console.log("Signal connected to LiveKit");
      });

      // Handle participant connected (avatar joining)
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant connected:", participant.identity);
      });

      // Handle when remote tracks are published (but not yet subscribed)
      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("Track published:", publication.kind, "from", participant.identity);
      });

      // Connect to the room with a timeout
      await Promise.race([
        room.connect(url, token),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 15000)
        )
      ]);

      console.log("Connected to LiveKit room successfully");
      console.log("Room state:", room.state);
      console.log("Remote participants:", room.remoteParticipants.size);

      // List existing participants and their tracks
      room.remoteParticipants.forEach((participant) => {
        console.log("Existing participant:", participant.identity);
        participant.trackPublications.forEach((pub) => {
          console.log("  - Track:", pub.kind, pub.trackSid, "subscribed:", pub.isSubscribed);
          // If track exists but not subscribed, subscribe to it
          if (pub.track && !pub.isSubscribed) {
            if (pub.kind === Track.Kind.Video && videoRef.current) {
              pub.track.attach(videoRef.current);
              setIsStreamReady(true);
            } else if (pub.kind === Track.Kind.Audio && audioRef.current) {
              pub.track.attach(audioRef.current);
            }
          }
        });
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to connect to LiveKit (attempt ${retryCount + 1}):`, errorMessage);

      // Retry on connection failure (not on auth errors)
      if (retryCount < MAX_RETRIES && !errorMessage.includes('401') && !errorMessage.includes('unauthorized')) {
        console.log(`Retrying LiveKit connection in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return connectToLiveKit(url, token, retryCount + 1);
      }

      return false;
    }
  }, []);

  // Initialize streaming session
  const initSession = useCallback(async () => {
    try {
      setSessionState("connecting");
      setError(null);
      setIsStreamReady(false);

      const response = await fetch("/api/heygen/session", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create session");
      }

      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;

      // Check if we're in fallback mode (HeyGen not available)
      if (data.fallbackMode) {
        setIsFallbackMode(true);
        console.log("Using fallback text mode:", data.message);
        setSessionState("connected");
        setTranscript(welcomeMessage);
        addToChatHistory("ai", welcomeMessage);
        return;
      }

      // Connect to LiveKit for video streaming
      if (data.url && data.accessToken) {
        // Delay to ensure HeyGen session is fully initialized and avatar is joining
        // HeyGen needs time after streaming.start to have the avatar join the room
        await new Promise(resolve => setTimeout(resolve, 1500));

        const connected = await connectToLiveKit(data.url, data.accessToken);

        if (!connected) {
          // Fall back to text mode if LiveKit fails
          console.log("LiveKit connection failed - falling back to text mode");
          setIsFallbackMode(true);
          setSessionState("connected");
          setTranscript(welcomeMessage);
          addToChatHistory("ai", welcomeMessage);
          return;
        }
      }

      // In video mode, don't add a welcome message - HeyGen will greet from its knowledge base
      setSessionState("connected");
    } catch (err) {
      console.error("Failed to init session:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setSessionState("error");
    }
  }, [welcomeMessage, addToChatHistory, connectToLiveKit]);

  // Initialize session only once on mount
  useEffect(() => {
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Cleanup session on unmount
      if (sessionIdRef.current) {
        fetch("/api/heygen/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(console.error);
      }

      // Cleanup LiveKit room
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    scrollChatToBottom();
  }, [chatHistory, scrollChatToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !sessionId || isSending) return;

    const userMessage = message.trim();
    setMessage("");
    setIsSending(true);

    // Add user message to chat history immediately
    addToChatHistory("user", userMessage);

    try {
      const response = await fetch("/api/heygen/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          text: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // If we get an AI response (fallback mode), add it to history and update transcript
      if (data.aiResponse) {
        setTranscript(data.aiResponse);
        addToChatHistory("ai", data.aiResponse);

        // Update fallback mode state if needed
        if (data.fallbackMode && !isFallbackMode) {
          setIsFallbackMode(true);
        }
      }
      // In non-fallback mode, HeyGen streaming would update the transcript via WebRTC
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        await fetch("/api/heygen/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch (err) {
        console.error("Error ending session:", err);
      }
    }

    setSessionState("ended");
    onClose();
  };

  // Render connecting state
  if (sessionState === "connecting") {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <Video className="w-10 h-10 text-gray-400" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-white text-center">
            Connecting to AI Avatar...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (sessionState === "error") {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white text-center font-medium">
            Connection Failed
          </p>
          <p className="text-gray-400 text-sm mt-2 text-center max-w-xs">
            {error || "Unable to connect to AI Avatar. Please try again."}
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Go Back
            </Button>
            <Button onClick={initSession} className="bg-blue-600 hover:bg-blue-700">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render FALLBACK TEXT MODE - Clean chat interface
  if (isFallbackMode) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">AI</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Assistant</h2>
              <p className="text-xs text-blue-100">Online</p>
            </div>
          </div>
          <button
            onClick={handleEndSession}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages - Full height */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50"
        >
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-2 shrink-0">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white text-gray-800 shadow-sm border rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === "user" ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center ml-2 shrink-0">
                  <span className="text-xs font-bold text-gray-600">You</span>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-2 shrink-0">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-sm text-center border-t border-red-100">
            {error}
          </div>
        )}

        {/* Message Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t"
        >
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 h-11 rounded-full border-gray-200 px-4"
            />
            <Button
              type="submit"
              disabled={!message.trim() || isSending}
              className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Render VIDEO MODE - With avatar stream
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-sm font-medium">AI Avatar</span>
        </div>
        <button
          onClick={handleEndSession}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-black">
        {/* Hidden audio element for avatar audio */}
        <audio ref={audioRef} autoPlay muted={isMuted} />

        {isVideoOff ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-gray-400" />
            </div>
          </div>
        ) : (
          <>
            {/* Video element for avatar stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isStreamReady ? 'block' : 'hidden'}`}
            />

            {/* Placeholder when no stream yet */}
            {!isStreamReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-b from-blue-600 to-purple-600 flex items-center justify-center">
                      <span className="text-4xl text-white font-bold">AI</span>
                    </div>
                  </div>
                  <p className="text-white font-medium">AI Assistant</p>
                  <p className="text-gray-400 text-sm mt-1 max-w-xs px-4">
                    {welcomeMessage}
                  </p>
                  {sessionState === "connected" && !isStreamReady && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading video stream...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Live Captions Overlay */}
        {showCaptions && transcript && (
          <div className="absolute bottom-16 left-4 right-4 pointer-events-none">
            <div className="bg-black/75 backdrop-blur-sm rounded-lg px-4 py-2 max-h-24 overflow-hidden">
              <p className="text-white text-sm leading-relaxed line-clamp-3">
                {transcript}
              </p>
            </div>
          </div>
        )}

        {/* Video Controls Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full transition-colors ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full transition-colors ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isVideoOff ? "Turn video on" : "Turn video off"}
          >
            {isVideoOff ? (
              <VideoOff className="w-5 h-5 text-white" />
            ) : (
              <Video className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-3 rounded-full transition-colors ${
              showCaptions
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={showCaptions ? "Hide captions" : "Show captions"}
          >
            {showCaptions ? (
              <Captions className="w-5 h-5 text-white" />
            ) : (
              <CaptionsOff className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Chat History Panel */}
      <div className="border-t border-gray-700 bg-gray-850">
        <button
          onClick={() => setIsChatExpanded(!isChatExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
        >
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Conversation ({chatHistory.length} messages)
          </span>
          {isChatExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isChatExpanded && (
          <div
            ref={chatContainerRef}
            className="max-h-40 overflow-y-auto px-4 py-2 space-y-3 bg-gray-850"
          >
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-2">
                No messages yet. Start the conversation!
              </p>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}
                  >
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === "user" ? "text-blue-200" : "text-gray-400"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-gray-800 border-t border-gray-700"
      >
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
          />
          <Button
            type="submit"
            disabled={!message.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Speak naturally or type your questions
        </p>
      </form>
    </div>
  );
}
