import { ComingLater } from "@/components/app/coming-later";

export default function Scan() {
  return (
    <ComingLater
      back
      title="Add a document"
      phase="Phase 2"
      detail="Camera capture, EXIF stripping and upload to private storage. A photo of a prescription carries the GPS of the house it was taken in, so the strip lands with the picker."
    />
  );
}
