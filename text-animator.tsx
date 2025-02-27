"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Download, Play, Settings2 } from "lucide-react";
import { toPng } from "html-to-image";
import { createGIF } from "gifshot";
import type { GifResponse } from "gifshot";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define the color palettes
const colorPalettes = {
  retro: ["#1FD755", "#FF69B4", "#FFD700", "#FF6B6B", "#4DC4FF"],
  pastel: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFB3F7"],
  neon: ["#FF1177", "#00FF9F", "#00B3FF", "#FFE600", "#FF8C00"],
};

// Define animation variants
const animationVariants = {
  dropIn: {
    initial: { opacity: 0, y: -50, rotateX: -90, scale: 0.5 },
    animate: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
    exit: { opacity: 0, y: 50, rotateX: 90, scale: 0.5 },
  },
  popOut: {
    initial: { opacity: 0, scale: 2, rotate: 180 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0, rotate: -180 },
  },
  slideIn: {
    initial: { opacity: 0, x: -100, rotateY: -90 },
    animate: { opacity: 1, x: 0, rotateY: 0 },
    exit: { opacity: 0, x: 100, rotateY: 90 },
  },
};

type AnimationStyle = "dropIn" | "popOut" | "slideIn";
type ColorPalette = "retro" | "pastel" | "neon";

interface AnimationSettings {
  speed: number;
  size: number;
  animationStyle: AnimationStyle;
  colorPalette: ColorPalette;
  loops: number;
  removeBackground: boolean;
  colorChangeSpeed: number;
  textStroke: boolean;
  textPosition: { x: number; y: number };
  letterSpacing: number;
  textAlign: "left" | "center" | "right";
}

interface AnimatedLetterProps {
  char: string;
  index: number;
  settings: AnimationSettings;
}

export default function TextAnimator() {
  const [text, setText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [settings, setSettings] = useState<AnimationSettings>({
    speed: 1,
    size: 2.5,
    animationStyle: "dropIn" as AnimationStyle,
    colorPalette: "retro" as ColorPalette,
    loops: 2,
    removeBackground: true,
    colorChangeSpeed: 1,
    textStroke: true,
    textPosition: { x: 50, y: 50 }, // Center position (in percentage)
    letterSpacing: 0,
    textAlign: "center",
  });
  const [showSettings, setShowSettings] = useState(false);
  const animationRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.toUpperCase());
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
        setSettings((prev) => ({ ...prev, removeBackground: false }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBackgroundImage = () => {
    setBackgroundImage(null);
    setSettings((prev) => ({ ...prev, removeBackground: true }));
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !animationRef.current) return;

    const rect = animationRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSettings((prev) => ({
      ...prev,
      textPosition: {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      },
    }));
  };

  const captureAnimation = async () => {
    if (isRecording) return;
    setIsAnimating(true);
    setIsRecording(true);

    try {
      const frames: string[] = [];
      const frameCount = 12;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Get the actual root font size - no doubling for GIF
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      );
      const relativeFontSize = settings.size * rootFontSize; // Original size for GIF
      ctx.font = `${relativeFontSize}px "Press Start 2P"`;

      // Calculate text dimensions with letter spacing
      const lines = text.split("\n");
      const letterSpacingPx = relativeFontSize * (1.5 + settings.letterSpacing);
      const measurements = lines.map((line) => {
        const chars = line.split("");
        const totalWidth = chars.reduce((width, char) => {
          const charWidth = ctx.measureText(char).width;
          return width + charWidth + letterSpacingPx;
        }, 0);
        return totalWidth;
      });

      const maxLineWidth = Math.max(...measurements);
      const lineHeight = relativeFontSize * 2;
      const totalHeight = lines.length * lineHeight;

      // Add padding that accounts for stroke and shadow
      const strokePadding = settings.textStroke ? relativeFontSize * 0.5 : 0;
      const basePadding = relativeFontSize;
      const totalPadding = basePadding + strokePadding;

      // Set canvas size based on background image or text dimensions
      let canvasWidth = 800;
      let canvasHeight = 400;

      if (settings.removeBackground) {
        canvasWidth = maxLineWidth + totalPadding * 2;
        canvasHeight = totalHeight + totalPadding * 2;
      } else if (backgroundImage) {
        // Load image and get its dimensions
        const img = new Image();
        img.src = backgroundImage;
        await new Promise((resolve) => {
          img.onload = () => {
            canvasWidth = img.naturalWidth;
            canvasHeight = img.naturalHeight;
            resolve(null);
          };
        });

        // Limit maximum dimensions for GIF while maintaining aspect ratio
        const MAX_GIF_DIMENSION = 1200;
        if (
          canvasWidth > MAX_GIF_DIMENSION ||
          canvasHeight > MAX_GIF_DIMENSION
        ) {
          const aspectRatio = canvasWidth / canvasHeight;
          if (canvasWidth > canvasHeight) {
            canvasWidth = MAX_GIF_DIMENSION;
            canvasHeight = Math.round(MAX_GIF_DIMENSION / aspectRatio);
          } else {
            canvasHeight = MAX_GIF_DIMENSION;
            canvasWidth = Math.round(MAX_GIF_DIMENSION * aspectRatio);
          }
        }
      }

      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Enable alpha channel for transparency
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Load background image if exists
      let bgImg: HTMLImageElement | null = null;
      if (backgroundImage && !settings.removeBackground) {
        bgImg = new Image();
        bgImg.src = backgroundImage;
        await new Promise((resolve) => {
          bgImg!.onload = resolve;
        });
      }

      // Load font before generating frames
      await document.fonts.load(`${relativeFontSize}px "Press Start 2P"`);

      // Initialize random color indices for each character
      const charColorIndices: number[][] = lines.map((line) =>
        Array.from({ length: line.length }, () =>
          Math.floor(
            Math.random() * colorPalettes[settings.colorPalette].length
          )
        )
      );

      // Generate frames
      const totalFrames = frameCount * settings.loops;
      const baseChangeProb = 0.08;
      const colorChangeProbability = baseChangeProb * settings.colorChangeSpeed;
      const frameInterval = 1 / 8 / settings.colorChangeSpeed;

      for (let f = 0; f < totalFrames; f++) {
        // Clear canvas with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bgImg && !settings.removeBackground) {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } else if (!settings.removeBackground) {
          ctx.fillStyle = "#0047AB";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Set text properties
        ctx.font = `${relativeFontSize}px "Press Start 2P"`;
        ctx.textAlign = settings.textAlign;
        ctx.textBaseline = "middle";

        // Calculate text position
        const textX = settings.removeBackground
          ? settings.textAlign === "left"
            ? totalPadding
            : settings.textAlign === "right"
            ? canvas.width - totalPadding
            : canvas.width / 2
          : settings.textAlign === "left"
          ? (canvas.width * settings.textPosition.x) / 100 -
            canvas.width / 2 +
            totalPadding
          : settings.textAlign === "right"
          ? (canvas.width * settings.textPosition.x) / 100 +
            canvas.width / 2 -
            totalPadding
          : (canvas.width * settings.textPosition.x) / 100;
        const textY = settings.removeBackground
          ? canvas.height / 2
          : (canvas.height * settings.textPosition.y) / 100;

        // Draw each line
        lines.forEach((line, lineIndex) => {
          const chars = line.split("");
          const y = textY + (lineIndex - lines.length / 2) * lineHeight;

          chars.forEach((char, charIndex) => {
            charColorIndices[lineIndex][charIndex] =
              (charColorIndices[lineIndex][charIndex] +
                (Math.random() < colorChangeProbability ? 1 : 0)) %
              colorPalettes[settings.colorPalette].length;

            const colorIndex = charColorIndices[lineIndex][charIndex];
            const color = colorPalettes[settings.colorPalette][colorIndex];
            const charX =
              textX +
              (charIndex -
                (settings.textAlign === "center" ? chars.length / 2 : 0)) *
                (relativeFontSize * (1.5 + settings.letterSpacing));

            ctx.save();
            ctx.translate(charX, y);

            if (settings.textStroke) {
              // Calculate shadow scale based on font size
              const shadowScale = relativeFontSize * 0.05;

              // Draw drop shadow first
              ctx.fillStyle = "rgba(0,0,0,0.3)";
              ctx.fillText(char === " " ? "\u00A0" : char, 0, shadowScale * 3);

              // Draw multiple shadows for depth
              ctx.fillStyle = "rgba(0,0,0,0.4)";
              [
                [1, 1],
                [-1, 1],
                [1, -1],
                [-1, -1],
                [0, 2],
              ].forEach(([offsetX, offsetY]) => {
                ctx.fillText(
                  char === " " ? "\u00A0" : char,
                  offsetX * shadowScale,
                  offsetY * shadowScale
                );
              });

              // Draw stroke
              ctx.strokeStyle = "black";
              ctx.lineWidth = relativeFontSize * 0.15;
              ctx.strokeText(char === " " ? "\u00A0" : char, 0, 0);
            }

            // Draw main colored text
            ctx.fillStyle = color;
            ctx.fillText(char === " " ? "\u00A0" : char, 0, 0);

            ctx.restore();
          });
        });

        frames.push(canvas.toDataURL("image/png", 0.8));
      }

      // Create GIF with optimized settings
      const gifPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("GIF creation timed out"));
        }, 30000);

        createGIF(
          {
            images: frames,
            gifWidth: canvasWidth,
            gifHeight: canvasHeight,
            interval: frameInterval,
            numWorkers: 4,
            frameDuration: 1,
            sampleInterval: 20,
            transparent: settings.removeBackground ? "FFFFFF" : null,
          },
          (obj: GifResponse) => {
            clearTimeout(timeout);
            if (!obj.error && obj.image) {
              resolve(obj.image);
            } else {
              reject(new Error(obj.errorMsg || "Failed to create GIF"));
            }
          }
        );
      });

      const gifImage = await gifPromise;
      const link = document.createElement("a");
      link.href = gifImage as string;
      link.download = "animation.gif";
      link.click();
    } catch (error) {
      console.error("Error generating GIF:", error);
      alert(
        "Failed to create GIF. The image might be too large or the process timed out."
      );
    } finally {
      setIsRecording(false);
      setIsAnimating(false);
    }
  };

  const captureStillImage = async () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) throw new Error("Could not get canvas context");

      // Get the actual root font size and double it to match preview for PNG
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      );
      const relativeFontSize = settings.size * rootFontSize * 2; // Double the font size for PNG
      ctx.font = `${relativeFontSize}px "Press Start 2P"`;

      // Calculate text dimensions with letter spacing
      const lines = text.split("\n");
      const letterSpacingPx = relativeFontSize * (1.5 + settings.letterSpacing);
      const measurements = lines.map((line) => {
        const chars = line.split("");
        const totalWidth = chars.reduce((width, char) => {
          const charWidth = ctx.measureText(char).width;
          return width + charWidth + letterSpacingPx;
        }, 0);
        return totalWidth;
      });

      const maxLineWidth = Math.max(...measurements);
      const lineHeight = relativeFontSize * 2;
      const totalHeight = lines.length * lineHeight;

      // Add padding that accounts for stroke and shadow
      const strokePadding = settings.textStroke ? relativeFontSize * 0.5 : 0;
      const basePadding = relativeFontSize;
      const totalPadding = basePadding + strokePadding;

      // Set canvas size based on background image or text dimensions
      let canvasWidth = 800;
      let canvasHeight = 400;

      if (settings.removeBackground) {
        canvasWidth = maxLineWidth + totalPadding * 2;
        canvasHeight = totalHeight + totalPadding * 2;
      } else if (backgroundImage) {
        // Load image and get its dimensions
        const img = new Image();
        img.src = backgroundImage;
        await new Promise((resolve) => {
          img.onload = () => {
            canvasWidth = img.naturalWidth;
            canvasHeight = img.naturalHeight;
            resolve(null);
          };
        });
      }

      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Configure context
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;

      // Clear canvas with transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fill background if not transparent and has background
      if (!settings.removeBackground) {
        if (backgroundImage) {
          const bgImg = new Image();
          bgImg.src = backgroundImage;
          await new Promise((resolve) => {
            bgImg.onload = resolve;
          });
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "#0047AB";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Reconfigure font after canvas resize
      ctx.font = `${relativeFontSize}px "Press Start 2P"`;
      ctx.textAlign = settings.textAlign;
      ctx.textBaseline = "middle";

      // Calculate text position
      const textX = settings.removeBackground
        ? settings.textAlign === "left"
          ? totalPadding
          : settings.textAlign === "right"
          ? canvas.width - totalPadding
          : canvas.width / 2
        : settings.textAlign === "left"
        ? (canvas.width * settings.textPosition.x) / 100 -
          canvas.width / 2 +
          totalPadding
        : settings.textAlign === "right"
        ? (canvas.width * settings.textPosition.x) / 100 +
          canvas.width / 2 -
          totalPadding
        : (canvas.width * settings.textPosition.x) / 100;
      const textY = settings.removeBackground
        ? canvas.height / 2
        : (canvas.height * settings.textPosition.y) / 100;

      // Draw text
      lines.forEach((line, lineIndex) => {
        const chars = line.split("");
        const y = textY + (lineIndex - lines.length / 2) * lineHeight;

        // Calculate the total characters before this line
        const previousLinesLength = text
          .split("\n")
          .slice(0, lineIndex)
          .reduce((sum, line) => sum + line.length, 0);

        chars.forEach((char, charIndex) => {
          const colorIndex =
            (previousLinesLength + charIndex) %
            colorPalettes[settings.colorPalette].length;
          const color = colorPalettes[settings.colorPalette][colorIndex];
          const charX =
            textX +
            (charIndex -
              (settings.textAlign === "center" ? chars.length / 2 : 0)) *
              letterSpacingPx;

          if (settings.textStroke) {
            // Calculate shadow scale based on font size (reduced from 0.1 to 0.05)
            const shadowScale = relativeFontSize * 0.05;

            // Draw drop shadow first (reduced from 5 to 3)
            ctx.fillStyle = "rgba(0,0,0,0.3)"; // Reduced opacity from 0.5 to 0.3
            ctx.fillText(
              char === " " ? "\u00A0" : char,
              charX,
              y + shadowScale * 3
            ); // Bottom shadow

            // Draw multiple shadows for depth (reduced offsets)
            ctx.fillStyle = "rgba(0,0,0,0.4)"; // Slightly more opaque for definition
            [
              [1, 1], // Top-right shadow (reduced from 2 to 1)
              [-1, 1], // Top-left shadow
              [1, -1], // Bottom-right shadow
              [-1, -1], // Bottom-left shadow
              [0, 2], // Extra bottom shadow (reduced from 4 to 2)
            ].forEach(([offsetX, offsetY]) => {
              ctx.fillText(
                char === " " ? "\u00A0" : char,
                charX + offsetX * shadowScale,
                y + offsetY * shadowScale
              );
            });

            // Draw stroke with scaled width
            ctx.strokeStyle = "black";
            ctx.lineWidth = relativeFontSize * 0.15;
            ctx.strokeText(char === " " ? "\u00A0" : char, charX, y);
          }

          // Draw main colored text
          ctx.fillStyle = color;
          ctx.fillText(char === " " ? "\u00A0" : char, charX, y);
        });
      });

      // Download PNG
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "text-animation.png";
      link.click();
    } catch (error) {
      console.error("Error capturing PNG:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#C0C0C0] p-4 md:p-6 space-y-6 md:space-y-0 md:grid md:grid-cols-[1.2fr_2fr] md:gap-6">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");

        /* Windows 98-style scrollbar */
        ::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }
        ::-webkit-scrollbar-track {
          background: #c0c0c0;
          border: 1px solid #000;
        }
        ::-webkit-scrollbar-thumb {
          background: #dfdfdf;
          border: 1px solid #000;
          box-shadow: inset 1px 1px #fff;
        }
        ::-webkit-scrollbar-button {
          background: #dfdfdf;
          border: 1px solid #000;
          box-shadow: inset 1px 1px #fff;
          width: 16px;
          height: 16px;
        }
      `}</style>

      {/* Left Column - Controls */}
      <div className="space-y-4">
        <Card className="w-full bg-[#dfdfdf] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-visible">
          <CardHeader className="border-b-2 border-black p-3 bg-[#543894] text-white">
            <CardTitle className="font-['Press_Start_2P'] text-lg text-center tracking-tight">
              Text Animator
            </CardTitle>
            <CardDescription className="font-['Press_Start_2P'] text-[10px] text-center text-white/90">
              Create animated pixel text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder="ENTER YOUR TEXT..."
                  value={text}
                  onChange={handleTextChange}
                  className="font-['Press_Start_2P'] text-base p-3 bg-white min-h-[100px] resize-none border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#543894]"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative h-auto aspect-square bg-[#dfdfdf] text-black border-[3px] border-black rounded-none group overflow-hidden
                      hover:bg-[#efefef] active:bg-[#cfcfcf]
                      before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent
                      after:absolute after:inset-[3px] after:border-2 after:border-t-white/30 after:border-l-white/30 after:border-b-black/30 after:border-r-black/30
                      active:translate-y-[2px] transition-all"
                  >
                    <span className="relative flex items-center justify-center">
                      <Settings2 className="w-5 h-5" />
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[90vw] sm:w-[400px] md:w-[540px] overflow-y-auto border-l-2 border-black">
                  <SheetHeader className="border-b-2 border-black pb-8 pt-6">
                    <SheetTitle className="font-['Press_Start_2P'] text-base">
                      Animation Settings
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-12 space-y-16">
                    <div className="space-y-10">
                      <h3 className="font-['Press_Start_2P'] text-xs text-muted-foreground pb-4">
                        Animation Controls
                      </h3>
                      <div className="space-y-8 pl-2">
                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Animation Speed
                          </Label>
                          <Slider
                            min={0.5}
                            max={2}
                            step={0.1}
                            value={[settings.speed]}
                            onValueChange={([speed]) =>
                              setSettings({ ...settings, speed })
                            }
                            className="py-4"
                          />
                        </div>

                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Letter Spacing
                          </Label>
                          <Slider
                            min={-2}
                            max={5}
                            step={0.1}
                            value={[settings.letterSpacing]}
                            onValueChange={([letterSpacing]) =>
                              setSettings({ ...settings, letterSpacing })
                            }
                            className="py-4"
                          />
                        </div>

                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Animation Style
                          </Label>
                          <Select
                            value={settings.animationStyle}
                            onValueChange={(value: AnimationStyle) =>
                              setSettings({
                                ...settings,
                                animationStyle: value,
                              })
                            }
                          >
                            <SelectTrigger className="font-['Press_Start_2P'] text-xs py-6">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dropIn">Drop In</SelectItem>
                              <SelectItem value="popOut">Pop Out</SelectItem>
                              <SelectItem value="slideIn">Slide In</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Animation Loops
                          </Label>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[settings.loops]}
                            onValueChange={([loops]) =>
                              setSettings({ ...settings, loops })
                            }
                            className="py-4"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <h3 className="font-['Press_Start_2P'] text-xs text-muted-foreground pb-4">
                        Appearance
                      </h3>
                      <div className="space-y-8 pl-2">
                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Letter Size
                          </Label>
                          <Slider
                            min={1}
                            max={4}
                            step={0.1}
                            value={[settings.size]}
                            onValueChange={([size]) =>
                              setSettings({ ...settings, size })
                            }
                            className="py-4"
                          />
                        </div>

                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Color Palette
                          </Label>
                          <Select
                            value={settings.colorPalette}
                            onValueChange={(value: ColorPalette) =>
                              setSettings({ ...settings, colorPalette: value })
                            }
                          >
                            <SelectTrigger className="font-['Press_Start_2P'] text-xs py-6">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="retro">Retro</SelectItem>
                              <SelectItem value="pastel">Pastel</SelectItem>
                              <SelectItem value="neon">Neon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4">
                          <Label className="font-['Press_Start_2P'] text-xs">
                            Color Change Speed
                          </Label>
                          <Slider
                            min={0.5}
                            max={2}
                            step={0.1}
                            value={[settings.colorChangeSpeed]}
                            onValueChange={([colorChangeSpeed]) =>
                              setSettings({ ...settings, colorChangeSpeed })
                            }
                            className="py-4"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <h3 className="font-['Press_Start_2P'] text-xs text-muted-foreground pb-4">
                        Export Options
                      </h3>
                      <div className="space-y-8 pl-2">
                        <div className="flex items-center space-x-3 py-4">
                          <Switch
                            id="remove-background"
                            checked={settings.removeBackground}
                            onCheckedChange={(removeBackground) =>
                              setSettings({ ...settings, removeBackground })
                            }
                          />
                          <Label
                            htmlFor="remove-background"
                            className="font-['Press_Start_2P'] text-xs"
                          >
                            Remove Background
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="textStroke">Text Stroke</Label>
                        <Switch
                          id="textStroke"
                          checked={settings.textStroke}
                          onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                              ...prev,
                              textStroke: checked,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="font-['Press_Start_2P'] text-xs">
                        Text Alignment
                      </Label>
                      <Select
                        value={settings.textAlign}
                        onValueChange={(value: "left" | "center" | "right") =>
                          setSettings({ ...settings, textAlign: value })
                        }
                      >
                        <SelectTrigger className="font-['Press_Start_2P'] text-xs py-6">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col space-y-2">
                <Label className="font-['Press_Start_2P'] text-xs text-black/80">
                  Background Image
                </Label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <div className="relative flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="font-['Press_Start_2P'] text-xs bg-white border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#543894] rounded-none file:bg-[#dfdfdf] file:border-r-[3px] file:border-black file:font-['Press_Start_2P'] file:text-xs"
                    />
                  </div>
                  {backgroundImage && (
                    <Button
                      onClick={clearBackgroundImage}
                      variant="destructive"
                      className="relative font-['Press_Start_2P'] text-xs px-4 h-auto bg-[#dfdfdf] text-black border-[3px] border-black rounded-none
                        hover:bg-[#efefef] active:bg-[#cfcfcf]
                        before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent
                        after:absolute after:inset-[3px] after:border-2 after:border-t-white/30 after:border-l-white/30 after:border-b-black/30 after:border-r-black/30
                        active:translate-y-[2px] transition-all"
                    >
                      Clear Image
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                onClick={() => setIsAnimating(true)}
                className="relative font-['Press_Start_2P'] text-xs px-4 py-3 h-auto bg-[#FF69B4] text-white border-[3px] border-black rounded-none group overflow-hidden
                  hover:bg-[#FF8DC6] active:bg-[#E54D98]
                  before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent
                  after:absolute after:inset-[3px] after:border-2 after:border-t-white/30 after:border-l-white/30 after:border-b-black/30 after:border-r-black/30
                  active:translate-y-[2px] transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                disabled={isRecording}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  Preview
                </span>
              </Button>
              <Button
                onClick={captureAnimation}
                className="relative font-['Press_Start_2P'] text-xs px-4 py-3 h-auto bg-[#543894] text-white border-[3px] border-black rounded-none group overflow-hidden
                  hover:bg-[#6B48B8] active:bg-[#432C76]
                  before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent
                  after:absolute after:inset-[3px] after:border-2 after:border-t-white/30 after:border-l-white/30 after:border-b-black/30 after:border-r-black/30
                  active:translate-y-[2px] transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                disabled={isRecording}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Save GIF
                </span>
              </Button>
              <Button
                onClick={captureStillImage}
                className="relative font-['Press_Start_2P'] text-xs px-4 py-3 h-auto bg-[#543894] text-white border-[3px] border-black rounded-none group overflow-hidden
                  hover:bg-[#6B48B8] active:bg-[#432C76]
                  before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent
                  after:absolute after:inset-[3px] after:border-2 after:border-t-white/30 after:border-l-white/30 after:border-b-black/30 after:border-r-black/30
                  active:translate-y-[2px] transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                disabled={isRecording}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Save PNG
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview */}
      <Card
        className={`w-full h-full min-h-[400px] overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          settings.removeBackground ? "bg-[#dfdfdf]" : "bg-[#543894]"
        }`}
      >
        <CardHeader className="border-b-2 border-black p-3 bg-[#543894] text-white">
          <CardTitle className="font-['Press_Start_2P'] text-sm text-center">
            Preview Window
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 relative h-[calc(100%-4rem)]">
          <div
            ref={animationRef}
            className="w-full h-full relative rounded-lg cursor-move"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onMouseMove={handleDrag}
            style={{
              background: backgroundImage
                ? `url(${backgroundImage}) center/contain no-repeat`
                : undefined,
              backgroundColor: settings.removeBackground
                ? "#f5f5f5"
                : "#543894",
              aspectRatio: backgroundImage ? "auto" : "2/1",
              minHeight: "400px",
            }}
          >
            <AnimatePresence mode="wait">
              {isAnimating && (
                <motion.div
                  className="absolute flex flex-col items-center gap-4"
                  style={{
                    left: `${settings.textPosition.x}%`,
                    top: `${settings.textPosition.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onAnimationComplete={() =>
                    !isRecording && setIsAnimating(false)
                  }
                >
                  {text.split("\n").map((line, lineIndex) => (
                    <motion.div
                      key={`line-${lineIndex}`}
                      className={`flex flex-wrap gap-2 w-full ${
                        settings.textAlign === "left"
                          ? "justify-start"
                          : settings.textAlign === "right"
                          ? "justify-end"
                          : "justify-center"
                      }`}
                    >
                      {line.split("").map((char, charIndex) => (
                        <AnimatedLetter
                          key={`${char}-${lineIndex}-${charIndex}`}
                          char={char}
                          index={charIndex + lineIndex * line.length}
                          settings={settings}
                        />
                      ))}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {!isAnimating && text && (
              <div
                className="absolute flex flex-col items-center gap-4 pointer-events-none"
                style={{
                  left: `${settings.textPosition.x}%`,
                  top: `${settings.textPosition.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {text.split("\n").map((line, lineIndex) => {
                  // Calculate the total characters before this line
                  const previousLinesLength = text
                    .split("\n")
                    .slice(0, lineIndex)
                    .reduce((sum, line) => sum + line.length, 0);

                  return (
                    <div
                      key={`preview-${lineIndex}`}
                      className={`flex flex-wrap gap-2 w-full ${
                        settings.textAlign === "left"
                          ? "justify-start"
                          : settings.textAlign === "right"
                          ? "justify-end"
                          : "justify-center"
                      }`}
                    >
                      {line.split("").map((char, charIndex) => (
                        <AnimatedLetter
                          key={`preview-${char}-${lineIndex}-${charIndex}`}
                          char={char}
                          index={previousLinesLength + charIndex}
                          settings={settings}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {(text || backgroundImage) && (
            <div className="absolute top-2 left-2 right-2 bg-black/70 text-white p-2 rounded text-xs font-['Press_Start_2P']">
              {isDragging
                ? "Release to set text position"
                : "Click and drag to position text"}
            </div>
          )}
        </CardContent>
      </Card>

      {isRecording && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#dfdfdf]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                <p className="font-['Press_Start_2P'] text-sm">
                  Recording GIF...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function AnimatedLetter({ char, index, settings }: AnimatedLetterProps) {
  const [colorIndex, setColorIndex] = useState(
    index % colorPalettes[settings.colorPalette].length
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex(
        (prevIndex) =>
          (prevIndex + 1) % colorPalettes[settings.colorPalette].length
      );
    }, 1000 / settings.colorChangeSpeed);

    return () => clearInterval(interval);
  }, [settings.colorPalette, settings.colorChangeSpeed]);

  return (
    <motion.div
      initial={animationVariants[settings.animationStyle].initial}
      animate={animationVariants[settings.animationStyle].animate}
      exit={animationVariants[settings.animationStyle].exit}
      transition={{
        duration: 0.5 / settings.speed,
        delay: (index * 0.1) / settings.speed,
        type: "spring",
        stiffness: 100,
      }}
    >
      <motion.span
        animate={{ color: colorPalettes[settings.colorPalette][colorIndex] }}
        style={{
          WebkitTextStroke: settings.textStroke
            ? `${settings.size * 0.15}px black`
            : "none",
          textShadow: settings.textStroke
            ? `2px 2px 0 #000,
             -2px -2px 0 #000,
             2px -2px 0 #000,
             -2px 2px 0 #000,
             0 4px 0 #000,
             0 5px 0 rgba(0,0,0,0.5)`
            : "none",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: `${settings.size}rem`,
          display: "inline-block",
          letterSpacing: `${settings.letterSpacing}rem`,
        }}
      >
        {char === " " ? "\u00A0" : char}
      </motion.span>
    </motion.div>
  );
}
