"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AppHeader } from '@/components/zynqo/AppHeader';
import { Camera, X, Send, Loader2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function CreateMomentPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 20MB", variant: "destructive" });
        return;
      }
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFileType(type);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || (!content.trim() && !selectedFile)) return;

    setIsSubmitting(true);
    let imageUrl = '';
    let videoUrl = '';

    try {
      if (selectedFile && storage) {
        const storageRef = ref(storage, `moments/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, selectedFile);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        
        if (fileType === 'video') {
          videoUrl = downloadUrl;
        } else {
          imageUrl = downloadUrl;
        }
      }

      await addDoc(collection(db, 'moments'), {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Anonymous',
        userPhoto: profile?.profilePhoto || '',
        content: content.trim(),
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        createdAt: serverTimestamp()
      });

      toast({ title: "Moment Shared!", description: "Your new post is live." });
      router.push('/moments');
    } catch (error) {
      toast({ title: "Error", description: "Failed to share moment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] animate-fade-in pb-10">
      <AppHeader title="New Moment" showSearch={false} showActions={false} />

      <form onSubmit={handleCreate} className="p-6 space-y-6">
        <div className="space-y-4">
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4 text-base resize-none"
            required={!selectedFile}
          />

          {previewUrl && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group bg-black/40">
              {fileType === 'video' ? (
                <video src={previewUrl} className="w-full h-full object-contain" controls />
              ) : (
                <Image src={previewUrl} alt="Preview" fill className="object-cover" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => { setPreviewUrl(null); setSelectedFile(null); setFileType(null); }}
                className="absolute top-2 right-2 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X size={16} />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-white/10 bg-white/5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
            >
              {selectedFile && fileType === 'video' ? <VideoIcon size={20} /> : <ImageIcon size={20} />}
              <span>{selectedFile ? 'Change Media' : 'Add Image/Video'}</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || (!content.trim() && !selectedFile)}
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Send size={20} />
              Share Moment
            </>
          )}
        </Button>
      </form>
    </div>
  );
}