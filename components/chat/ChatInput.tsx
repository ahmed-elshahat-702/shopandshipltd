"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string, file: File | null) => void;
  isSending?: boolean;
}

export function ChatInput({
  onSendMessage,
  isSending = false,
}: ChatInputProps) {
  const t = useTranslations("chat");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || file) {
      onSendMessage(message, file);
      setMessage("");
      removeFile();
    }
  };

  return (
    <div className="p-4 border-t bg-card/50 backdrop-blur-md flex flex-col gap-2">
      {preview && (
        <div className="relative w-20 h-20 rounded-md overflow-hidden border ml-12">
          <Image src={preview} alt="Preview" fill className="object-cover" />
          <button
            type="button"
            onClick={removeFile}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full text-muted-foreground shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
          disabled={isSending}
        >
          <Paperclip size={20} />
        </Button>

        <div className="relative flex-1">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("typeMessage") || "Type a message..."}
            className="h-14 rounded-2xl border-2 pl-4 pr-12 font-medium focus:ring-primary/20 transition-all bg-background"
            disabled={isSending}
          />
        </div>

        <Button
          type="submit"
          size="icon"
          className="h-14 w-14 rounded-2xl shadow-xl shadow-primary/20 shrink-0"
          disabled={(!message.trim() && !file) || isSending}
        >
          {isSending ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SendHorizontal size={24} />
          )}
        </Button>
      </form>
    </div>
  );
}
