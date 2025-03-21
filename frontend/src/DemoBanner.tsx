import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="demo-banner uppercase top-2 bg-background text-xs pl-8 px-4 m-auto left-0 right-0 fixed w-48 h-12 rounded-lg z-50 flex justify-between items-center border-2 font-mono">
      demo mode
      <Button
        onClick={() => document.querySelector(".demo-banner")?.remove()}
        variant="ghost"
        className=" flex justify-center items-center p-1"
      >
        <X className="relative top-0 right-0 w-12 h-12" aria-label="close" />
      </Button>
    </div>
  );
}
