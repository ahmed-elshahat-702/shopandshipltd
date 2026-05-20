"use client";

import { useState, useRef, useEffect } from "react";

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
}

export default function OTPInput({ length = 6, onComplete }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Handle multi-character input (like on some mobile keyboards or paste)
    if (value.length > 1) {
      const pastedData = value.trim().slice(0, length);
      if (/^\d+$/.test(pastedData)) {
        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
          newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        if (pastedData.length === length) {
          onComplete(newOtp.join(""));
        }
        const nextIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    if (value && isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const otpValue = newOtp.join("");
    if (otpValue.length === length) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    if (pastedData.length === length) {
      onComplete(newOtp.join(""));
    }
    
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-4 ltr:flex-row rtl:flex-row-reverse" dir="ltr">
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={digit}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-full aspect-square text-center text-2xl font-black border-2 border-border bg-background rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
        />
      ))}
    </div>
  );
}
