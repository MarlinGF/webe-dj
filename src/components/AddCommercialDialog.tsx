
'use client';

import { useState, useRef, type FC } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileAudio } from 'lucide-react';
import type { User } from 'firebase/auth';

const formSchema = z.object({
  client: z.string().min(1, { message: 'Client name is required.' }),
  file: z.instanceof(File).refine(file => file.size > 0, 'An audio file is required.'),
});

interface AddCommercialDialogProps {
  user: User | null;
}

export const AddCommercialDialog: FC<AddCommercialDialogProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client: '',
      file: undefined,
    },
  });
  
  const handleDialogClose = () => {
    reset();
    setIsOpen(false);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    
    setIsUploading(true);
    const { file, client } = data;

    try {
      const storagePath = `users/${user.uid}/commercials/${Date.now()}-${file.name}`;
      const commercialStorageRef = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(commercialStorageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {}, 
        (error) => {
          console.error('Upload failed:', error);
          toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const duration = await new Promise<number>((resolve, reject) => {
            const audio = document.createElement('audio');
            audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
            audio.addEventListener('error', (e) => reject('Could not determine audio duration.'));
            audio.src = downloadURL;
          });

          const commercialsCollection = collection(db, 'users', user.uid, 'commercials');
          await addDoc(commercialsCollection, {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Commercial',
            duration,
            url: downloadURL,
            storagePath,
            client,
            createdAt: serverTimestamp(),
          });

          toast({ title: 'Commercial Uploaded', description: `"${file.name}" for ${client} has been added.` });
          setIsUploading(false);
          handleDialogClose();
        }
      );
    } catch (error) {
      console.error('Error during upload process:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileAudio className="h-4 w-4" />
          <span className="ml-2">Add Commercial</span>
        </Button>
      </DialogTrigger>
      <DialogContent onInteractOutside={(e) => { if (isUploading) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Add New Commercial</DialogTitle>
          <DialogDescription>Upload an audio file and assign it to a client.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="client">Client Name</Label>
            <Input id="client" {...register('client')} disabled={isUploading} />
            {errors.client && <p className="text-sm text-destructive mt-1">{errors.client.message}</p>}
          </div>
          <div>
            <Label htmlFor="file">Audio File</Label>
            <Input id="file" type="file" accept="audio/*" {...register('file')} disabled={isUploading} />
            {errors.file && <p className="text-sm text-destructive mt-1">{errors.file.message as string}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleDialogClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
