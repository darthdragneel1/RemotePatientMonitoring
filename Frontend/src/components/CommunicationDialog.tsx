import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommunicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  initialText?: string | null;
}

export function CommunicationDialog({ isOpen, onClose, onSave, initialText }: CommunicationDialogProps) {
  const [text, setText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(initialText || "");
      setShowConfirmation(false);
    }
  }, [isOpen, initialText]);

  const handleSave = () => {
    if (initialText && initialText !== text && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    onSave(text);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialText ? "Edit Communication" : "Add Communication"}</DialogTitle>
          <DialogDescription>
            {initialText ? "Edit the communication note for this reading." : "Add a communication note for this reading."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Textarea 
            placeholder="Type your notes here..." 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            className="min-h-[150px]"
            disabled={showConfirmation}
          />
          {showConfirmation && (
            <p className="text-sm font-medium text-destructive">
              Are you sure you want to overwrite the existing communication note?
            </p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            if (showConfirmation) {
              setShowConfirmation(false);
            } else {
              onClose();
            }
          }}>
            {showConfirmation ? "Cancel Edit" : "Cancel"}
          </Button>
          <Button onClick={handleSave} variant={showConfirmation ? "destructive" : "default"}>
            {showConfirmation ? "Confirm Edit" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
