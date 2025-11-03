import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { compressImages } from "@/lib/image-compression";
import { toast } from "sonner";

export interface PhotoWithCaption {
  file: File;
  caption: string;
  preview: string;
}

interface PhotoUploadProps {
  photos: PhotoWithCaption[];
  onPhotosChange: (photos: PhotoWithCaption[]) => void;
}

export const PhotoUpload = ({ photos, onPhotosChange }: PhotoUploadProps) => {
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCompressing(true);
    toast.info(`Compressing ${files.length} image(s)...`);

    try {
      // Compress all images before creating previews
      const compressedFiles = await compressImages(files);

      const newPhotos = compressedFiles.map((file) => ({
        file,
        caption: "",
        preview: URL.createObjectURL(file),
      }));

      onPhotosChange([...photos, ...newPhotos]);
      toast.success(`${files.length} image(s) ready for upload`);
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to compress images. Please try again.');
    } finally {
      setCompressing(false);
    }
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index].caption = caption;
    onPhotosChange(updatedPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="space-y-4">
      <Label>Photos</Label>
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload"
          disabled={compressing}
        />
        <label htmlFor="photo-upload" className={compressing ? "cursor-wait" : "cursor-pointer"}>
          <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {compressing ? "Compressing images..." : "Click to add photos"}
          </p>
        </label>
      </div>
      
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative border rounded-lg p-3 space-y-2">
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => handleRemovePhoto(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={photo.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover rounded"
              />
              <Input
                placeholder="Add caption (optional)"
                value={photo.caption}
                onChange={(e) => handleCaptionChange(index, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
