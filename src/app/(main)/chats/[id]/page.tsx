"use client";

import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Send, 
  Plus, 
  Mic, 
  Sparkles, 
  MoreVertical, 
  Phone, 
  Video, 
  Loader2, 
  FileIcon, 
  Download,
  PlayCircle,
  Trash2
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { aiConversationAssistant } from '@/ai/flows/ai-conversation-assistant-flow';
import { useAuth } from '@/context/AuthContext';
import { 
  useFirestore, 
  useStorage,
  useDoc, 
  useCollection,
  useMemoFirebase
} from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ChatDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chatRef = useMemoFirebase(() => (id && user) ? doc(db, 'chats', id as string) : null, [db, id, user?.uid]);
  const { data: chat, loading: chatLoading } = useDoc(chatRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !id || !user) return null;
    return query(
      collection(db, 'chats', id as string, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, id, user?.uid]);

  const { data: rawMessages = [], loading: messagesLoading } = useCollection(messagesQuery);
  const messages = useMemo(() => [...rawMessages].reverse(), [rawMessages]);

  const partnerId = useMemo(() => chat?.participantIds?.find((uid: string) => uid !== user?.uid), [chat, user?.uid]);
  const partnerRef = useMemoFirebase(() => (partnerId && user) ? doc(db, 'users', partnerId) : null, [db, partnerId, user?.uid]);
  const { data: partnerProfile } = useDoc(partnerRef);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Read receipts & Unread counter reset
  useEffect(() => {
    if (messages.length > 0 && user && id && db) {
      const unreadIncoming = messages.filter(
        (m) => m.senderId !== user.uid && m.status !== 'read'
      );

      unreadIncoming.forEach((msg) => {
        const msgRef = doc(db, 'chats', id as string, 'messages', msg.id);
        updateDoc(msgRef, { status: 'read' }).catch(() => {});
      });

      // Update last message status if needed
      if (chat?.lastMessage?.senderId !== user.uid && chat?.lastMessage?.status !== 'read') {
        updateDoc(doc(db, 'chats', id as string), {
          'lastMessage.status': 'read'
        }).catch(() => {});
      }
    }
  }, [messages, user, id, db, chat]);

  // Typing indicator logic
  const handleTyping = (text: string) => {
    setInputText(text);
    if (!user || !id || !db) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const chatDocRef = doc(db, 'chats', id as string);
    
    // Set typing to true
    if (text.trim().length > 0) {
      updateDoc(chatDocRef, {
        [`typing.${user.uid}`]: true
      }).catch(() => {});

      typingTimeoutRef.current = setTimeout(() => {
        updateDoc(chatDocRef, {
          [`typing.${user.uid}`]: false
        }).catch(() => {});
      }, 3000);
    } else {
      updateDoc(chatDocRef, {
        [`typing.${user.uid}`]: false
      }).catch(() => {});
    }
  };

  const handleSend = (mediaData?: { url: string; type: string; name?: string; duration?: number }) => {
    if ((!inputText.trim() && !mediaData) || !user || !id || !db) return;
    
    const textToSend = inputText.trim();
    const messageData: any = {
      senderId: user.uid,
      timestamp: serverTimestamp(),
      status: 'sent'
    };

    if (textToSend) messageData.text = textToSend;
    if (mediaData) {
      messageData.mediaUrl = mediaData.url;
      messageData.mediaType = mediaData.type;
      if (mediaData.name) messageData.fileName = mediaData.name;
      if (mediaData.duration) messageData.duration = mediaData.duration;
    }

    const messagesRef = collection(db, 'chats', id as string, 'messages');
    const currentChatRef = doc(db, 'chats', id as string);
    
    addDoc(messagesRef, messageData).catch((error) => {
      console.error("Error sending message", error);
    });

    updateDoc(currentChatRef, {
      lastMessage: {
        text: mediaData ? `Shared a ${mediaData.type}` : textToSend,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        status: 'sent'
      },
      updatedAt: serverTimestamp(),
      [`typing.${user.uid}`]: false
    }).catch(() => {});
    
    setInputText('');
    setAiSuggestions([]);
  };

  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!db || !user || !partnerId || !partnerProfile) return;

    try {
      const callsRef = collection(db, 'calls');
      await addDoc(callsRef, {
        callerId: user.uid,
        callerName: profile?.displayName || 'Unknown',
        callerPhoto: profile?.profilePhoto || '',
        receiverId: partnerId,
        receiverName: partnerProfile.displayName || 'Partner',
        receiverPhoto: partnerProfile.profilePhoto || '',
        participantIds: [user.uid, partnerId],
        type,
        status: 'ringing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({ title: `Initiating ${type} call...` });
    } catch (err) {
      toast({ title: "Failed to start call", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id || !storage) return;

    setIsUploading(true);
    const storageRef = ref(storage, `chats/${id}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      null,
      (error) => {
        setIsUploading(false);
        toast({ title: "Upload failed", variant: "destructive" });
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';

        handleSend({ url: downloadURL, type, name: file.name });
        setIsUploading(false);
      }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceMessage(audioBlob, recordingDuration);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) {
      toast({ title: "Microphone Access Denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
  };

  const uploadVoiceMessage = async (blob: Blob, duration: number) => {
    if (!user || !id || !storage) return;

    setIsUploading(true);
    const fileName = `voice_${Date.now()}.webm`;
    const storageRef = ref(storage, `chats/${id}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on(
      'state_changed',
      null,
      () => setIsUploading(false),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        handleSend({ url: downloadURL, type: 'voice', name: 'Voice Message', duration });
        setIsUploading(false);
        setRecordingDuration(0);
      }
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAiAssist = async () => {
    if (messages.length === 0 || !user) return;
    setIsAiLoading(true);
    try {
      const lastReceived = [...messages].reverse().find(m => m.senderId !== user.uid);
      const result = await aiConversationAssistant({
        messageHistory: messages.slice(-5).map(m => ({ 
          role: m.senderId === user.uid ? 'sender' as const : 'receiver' as const, 
          text: m.text || (m.mediaUrl ? `[Shared ${m.mediaType}]` : "")
        })),
        lastReceivedMessage: lastReceived?.text || "Hello",
        targetLanguage: "English"
      });
      setAiSuggestions(result.suggestedReplies);
    } catch (err) {
      console.error("AI Assistant Error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (chatLoading || messagesLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0E0C12] text-primary">
      <Loader2 className="animate-spin mb-4" size={32} />
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Syncing Messages...</p>
    </div>
  );

  if (!chat) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0E0C12] text-muted-foreground p-6 text-center">
      <p className="mb-4">Conversation not found.</p>
      <Button onClick={() => router.push('/chats')} variant="outline" className="rounded-2xl border-primary/20 text-primary">
        Back to Chats
      </Button>
    </div>
  );

  const partnerName = partnerProfile?.displayName || chat.participantNames?.find((n: string) => n !== user?.displayName) || 'Partner';
  const isOnline = partnerProfile?.onlineStatus === 'online';
  const isTyping = partnerId && chat.typing?.[partnerId];

  return (
    <div className="flex flex-col h-screen bg-[#0E0C12] animate-fade-in relative">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground hover:bg-white/5 rounded-full">
            <ChevronLeft size={24} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-primary/20 shadow-lg">
                <AvatarImage src={partnerProfile?.profilePhoto || `https://picsum.photos/seed/${id}/100/100`} />
                <AvatarFallback>{partnerName[0]}</AvatarFallback>
              </Avatar>
              {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none text-foreground">{partnerName}</h3>
              <span className={`text-[9px] uppercase font-bold tracking-widest mt-1 block ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
                {isTyping ? (
                  <span className="animate-pulse">Typing...</span>
                ) : (
                  isOnline ? 'Active Now' : 'Offline'
                )}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 pr-2">
          <Button variant="ghost" size="icon" onClick={() => handleStartCall('voice')} className="text-primary hover:bg-primary/10 rounded-full h-10 w-10">
            <Phone size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleStartCall('video')} className="text-primary hover:bg-primary/10 rounded-full h-10 w-10">
            <Video size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white/5 rounded-full h-10 w-10">
            <MoreVertical size={20} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-32">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          const date = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
          const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
              <div className={`
                max-w-[85%] rounded-[1.5rem] shadow-sm overflow-hidden
                ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card text-foreground rounded-tl-none border border-white/5'}
              `}>
                {msg.mediaUrl && (
                  <div className="relative">
                    {msg.mediaType === 'image' ? (
                      <div className="relative aspect-square w-full min-w-[200px] max-w-[300px]">
                        <Image src={msg.mediaUrl} alt="Shared Image" fill className="object-cover" />
                      </div>
                    ) : msg.mediaType === 'video' ? (
                      <video src={msg.mediaUrl} controls className="max-w-[300px] w-full" />
                    ) : msg.mediaType === 'voice' ? (
                      <div className="p-4 flex flex-col gap-2 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <PlayCircle size={24} className={isMe ? "text-white" : "text-primary"} />
                          <div className="flex-1 h-1 bg-current opacity-20 rounded-full" />
                          <span className="text-[10px] font-bold">{msg.duration ? formatDuration(msg.duration) : 'Voice'}</span>
                        </div>
                        <audio src={msg.mediaUrl} className="hidden" />
                      </div>
                    ) : (
                      <div className="p-4 flex items-center gap-3">
                        <FileIcon size={20} className="text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{msg.fileName || 'Shared Document'}</p>
                        </div>
                        <a href={msg.mediaUrl} download className="text-primary"><Download size={14} /></a>
                      </div>
                    )}
                  </div>
                )}
                {msg.text && <div className="px-4 py-3"><p className="text-sm">{msg.text}</p></div>}
              </div>
              <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{timeString}</span>
                {isMe && <span className={`text-[9px] font-bold ${msg.status === 'read' ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {msg.status === 'read' ? 'READ' : 'SENT'}
                </span>}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex flex-col items-start animate-fade-in">
             <div className="bg-card/40 rounded-[1.5rem] rounded-tl-none px-4 py-2 flex items-center gap-1 text-primary">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 safe-bottom bg-gradient-to-t from-[#0E0C12] via-[#0E0C12]/95 to-transparent pt-10">
        {(aiSuggestions.length > 0 || isAiLoading) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 px-2 text-primary">
              <Sparkles size={12} className={isAiLoading ? "animate-spin" : "animate-pulse"} />
              <span className="text-[9px] font-black uppercase tracking-widest">Zynqo AI Suggestions</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
              {isAiLoading ? (
                [1,2,3].map(i => <div key={i} className="h-9 w-28 rounded-2xl bg-white/5 animate-pulse" />)
              ) : (
                aiSuggestions.map((suggestion, i) => (
                  <Button 
                    key={i} variant="outline" size="sm" 
                    className="rounded-2xl bg-primary/5 border-primary/20 text-xs font-semibold whitespace-nowrap hover:bg-primary/10 text-primary"
                    onClick={() => {
                      setInputText(suggestion);
                      handleTyping(suggestion);
                    }}
                  >
                    {suggestion}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        <div className={cn("flex items-center gap-2 bg-card/60 backdrop-blur-2xl rounded-[2.5rem] p-2 border border-white/10 shadow-2xl transition-all duration-300", isRecording && "bg-primary/10 border-primary/30")}>
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-bold">{formatDuration(recordingDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={cancelRecording} className="text-muted-foreground hover:text-red-500 h-10 w-10"><Trash2 size={20} /></Button>
                <Button onClick={stopRecording} size="icon" className="rounded-full bg-primary h-10 w-10"><Send size={18} /></Button>
              </div>
            </div>
          ) : (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <Button variant="ghost" size="icon" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="text-muted-foreground rounded-full h-10 w-10">
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} />}
              </Button>
              <input 
                type="text" placeholder="Type a message..." value={inputText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 font-medium"
              />
              <div className="flex items-center gap-1">
                {!inputText.trim() && <Button variant="ghost" size="icon" onClick={handleAiAssist} className="text-primary rounded-full h-10 w-10"><Sparkles size={20} /></Button>}
                {inputText.trim() ? (
                  <Button onClick={() => handleSend()} size="icon" className="rounded-full bg-primary h-10 w-10"><Send size={18} /></Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={startRecording} className="text-muted-foreground rounded-full h-10 w-10"><Mic size={22} /></Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
