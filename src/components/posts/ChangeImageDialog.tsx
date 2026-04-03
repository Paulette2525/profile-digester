import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload, Check } from "lucide-react";
import { toast } from "sonner";

interface ChangeImageDialogProps {
  postId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function ChangeImageDialog({ postId, onClose, onChanged }: ChangeImageDialogProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const { data: photos } = useQuery({
    queryKey: ["user-photos-gallery", user?.id],
    enabled: !!user && !!postId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_photos")
        .select("id, image_url, photo_category")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const updatePostImage = async (imageUrl: string) => {
    const { error } = await supabase
      .from("suggested_posts")
      .update({ image_url: imageUrl })
      .eq("id", postId!);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Image mise à jour !");
    onChanged();
    onClose();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `${user.id}/post-${postId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("user-photos").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(path);
      await updatePostImage(urlData.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={!!postId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Changer l'image</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1"><Upload className="h-3.5 w-3.5 mr-1" /> Uploader</TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1">Ma galerie</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="pt-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary transition-colors">
              {uploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Cliquez pour choisir une image</span>
                </>
              )}
              <Input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </TabsContent>
          <TabsContent value="gallery" className="pt-4">
            {photos && photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                {photos.map((p) => (
                  <button key={p.id} onClick={() => updatePostImage(p.image_url)} className="rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all">
                    <img src={p.image_url} alt="" className="w-full h-24 object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune photo dans votre galerie. Ajoutez-en depuis la page Mémoire.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
