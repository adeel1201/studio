"use client";

import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Send, 
  Plus, 
  Phone, 
  Video, 
  Loader2
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { 
  useFirestore, 
  useStorage,
  useDoc, 
  useCollection,
  useMemoFirebase
} from '@/hooks/use-firebase';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ChatDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize refs and queries to prevent infinite loops
  const chatRef = useMemoFirebase(() => (id && user && db) ? doc(db, 'chats', id) : null, [db, id, user?.uid]);
  const { data: chat, loading: chatLoading } = useDoc(chatRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !id || !user) return null;
    return query(
      collection(db, 'chats', id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, id, user?.uid]);

  const { data: rawMessages = [], loading: messagesLoading } = useCollection(messagesQuery);
  const messages = useMemo(() => [...rawMessages].reverse(), [rawMessages]);

  const partnerId = useMemo(() => chat?.participantIds?.find((uid: string) => uid !== user?.uid), [chat, user?.uid]);
  const partnerRef = useMemoFirebase(() => (partnerId && user && db) ? doc(db, 'users', partnerId) : null, [db, partnerId, user?.uid]);
  const { data: partnerProfile } = useDoc(partnerRef);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const handleSend = async (mediaData?: { url: string; type: string; name?: string }) => {
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
    }

    const messagesRef = collection(db, 'chats', id, 'messages');
    
    addDoc(messagesRef, messageData)
      .then(() => {
        updateDoc(doc(db, 'chats', id), {
          lastMessage: {
            text: mediaData ? `Shared a ${mediaData.type}` : textToSend,
            senderId: user.uid,
            timestamp: serverTimestamp(),
            status: 'sent'
          },
          updatedAt: serverTimestamp()
        });
        setInputText('');
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: messagesRef.path,
          operation: 'create',
          requestResourceData: messageData
        }));
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id || !storage) return;

    setIsUploading(true);
    const storageRef = ref(storage, `chats/${id}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', null, 
      () => { setIsUploading(false); toast({ title: "Upload failed" }); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        await handleSend({ url, type, name: file.name });
        setIsUploading(false);
      }
    );
  };

  if (chatLoading || messagesLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-4">Syncing...</p>
    </div>
  );

  const partnerName = partnerProfile?.displayName || chat?.participantNames?.find((n: string) => n !== user?.displayName) || 'Partner';

  return (
    <div className="flex flex-col h-screen bg-background animate-fade-in relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground">
            <ChevronLeft size={24} />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarImage src={partnerProfile?.profilePhoto} />
              <AvatarFallback>{partnerName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-sm text-foreground">{partnerName}</h3>
              <span className={cn("text-[9px] uppercase font-bold tracking-widest mt-1 block", partnerProfile?.onlineStatus === 'online' ? "text-green-500" : "text-muted-foreground")}>
                {partnerProfile?.onlineStatus === 'online' ? 'Active Now' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 pr-2">
          <Button variant="ghost" size="icon" className="text-primary h-10 w-10"><Phone size={20} /></Button>
          <Button variant="ghost" size="icon" className="text-primary h-10 w-10"><Video size={20} /></Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {messages.map((msg: any) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
              <div className={cn(
                "max-w-[80%] px-4 py-2.5 rounded-[1.5rem] shadow-sm",
                isMe ? "bg-primary text-white rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
              )}>
                {msg.text && <p className="text-sm">{msg.text}</p>}
                {msg.mediaUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden">
                    {msg.mediaType === 'image' ? (
                      <Image src={msg.mediaUrl} alt="Shared" width={200} height={200} className="w-full h-auto" unoptimized />
                    ) : (
                      <video src={msg.mediaUrl} controls className="w-full" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 safe-bottom bg-gradient-to-t from-white via-white/95 to-transparent">
        <div className="flex items-center gap-2 bg-white rounded-[2.5rem] p-2 border border-border shadow-2xl">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <Button variant="ghost" size="icon" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="text-muted-foreground rounded-full">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} />}
          </Button>
          <input 
            type="text" placeholder="Type a message..." value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-foreground"
          />
          <Button onClick={() => handleSend()} disabled={!inputText.trim() || isUploading} size="icon" className="rounded-full bg-primary h-10 w-10 text-white">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
