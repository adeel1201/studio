"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Camera, Upload, Loader2, X, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';

export default function CreateStatusPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !selectedFile || !storage) {
      if (!storage) console.error("Storage not available during status upload.");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    const fileName = `${Date.now()}_${selectedFile.name}`;
    const storageRef = ref(storage, `statuses/${user.uid}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Status upload progress: ${progress.toFixed(2)}%`);
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Status storage upload task error:", error);
        setIsLoading(false);
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      },
      async () => {
        console.log("Status upload completed.");
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';

        try {
          await addDoc(collection(db, 'statuses'), {
            userId: user.uid,
            userName: profile?.displayName || user.displayName || 'Unknown',
            userPhoto: profile?.profilePhoto || '',
            mediaUrl: downloadUrl,
            mediaType,
            caption: caption.trim(),
            viewers: [],
            createdAt: serverTimestamp()
          });

          toast({ title: "Status shared!", description: "Your update has been posted successfully." });
          router.push('/status');
        } catch (err: any) {
          console.error("Error creating status document:", err);
          toast({ title: "Failed to post status", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background animate-fade-in relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="font-bold text-lg text-foreground">Add to Status</h2>
      </header>

      <div className="flex-1 flex flex-col p-6 gap-8">
        {!previewUrl ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[3rem] bg-muted/30 cursor-pointer hover:bg-muted transition-colors gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-foreground">Select Image or Video</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Maximum 10MB</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 animate-scale-in">
            <div className="relative flex-1 rounded-[3rem] overflow-hidden bg-black/5 border border-border shadow-lg">
              {selectedFile?.type.startsWith('video/') ? (
                <video src={previewUrl} className="w-full h-full object-contain" controls />
              ) : (
                <Image src={previewUrl} alt="Preview" fill className="object-contain" />
              )}
              <Button 
                variant="ghost" size="icon" 
                onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}
                className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full text-white"
              >
                <X size={20} />
              </Button>
            </div>

            <form onSubmit={handleUploadStatus} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Add a caption</Label>
                <Input 
                  placeholder="What's on your mind?" 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="h-14 bg-muted border-border rounded-2xl focus-visible:ring-primary text-sm text-foreground"
                />
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Posting Update... {Math.round(uploadProgress)}%</p>
                </div>
              ) : (
                <Button 
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20 text-white"
                >
                  <Send size={20} className="mr-2" />
                  Share Status
                </Button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
