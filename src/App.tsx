import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { expandPrompt, compressPrompt } from './services/gemini';
import { cn } from './lib/utils';
import {
  ClipboardPaste,
  Trash2,
  Zap,
  Copy,
  Save,
  Image as ImageIcon,
  X,
  Play
} from 'lucide-react';

export default function App() {
  const [rawPrompt, setRawPrompt] = useState<string>('');
  const [expandedNarrative, setExpandedNarrative] = useState<string>('');
  const [densePrompt, setDensePrompt] = useState<string>('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('Ready.');
  const [statusColor, setStatusColor] = useState<string>('text-[#585b70]');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageBase64('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawPrompt(prev => prev + text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
      setStatusMsg('Clipboard access denied. Please use Ctrl+V (or Cmd+V) to paste.');
      setStatusColor('text-[#f38ba8]');
    }
  };

  const clearAll = () => {
    setRawPrompt('');
    setExpandedNarrative('');
    setDensePrompt('');
    removeImage({ stopPropagation: () => {} } as any);
    setStatusMsg('Cleared.');
    setStatusColor('text-[#a6adc8]');
  };

  const copyToClipboard = async (text: string, subject: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatusMsg(`${subject} copied!`);
      setStatusColor('text-[#a6e3a1]');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const runPipeline = async () => {
    if (!rawPrompt.trim() && !imageBase64) {
      setStatusMsg('Please enter a raw prompt or upload an image.');
      setStatusColor('text-[#f38ba8]');
      return;
    }

    setIsProcessing(true);
    setExpandedNarrative('');
    setDensePrompt('');
    
    try {
      setStatusMsg('Pass 1: Expanding into detailed narrative...');
      setStatusColor('text-[#f9e2af]');
      
      const expanded = await expandPrompt(
        rawPrompt,
        imageBase64 || undefined,
        imageFile?.type || undefined
      );
      
      setExpandedNarrative(expanded);

      setStatusMsg('Pass 2: Contracting into dense paragraph...');
      setStatusColor('text-[#f9e2af]');
      
      const dense = await compressPrompt(expanded);
      
      setDensePrompt(dense);
      
      setStatusMsg('Pipeline complete! Ready for copy.');
      setStatusColor('text-[#a6e3a1]');
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`Error: ${error.message || 'Operation failed'}`);
      setStatusColor('text-[#f38ba8]');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToFile = () => {
    if (!rawPrompt && !expandedNarrative && !densePrompt) return;
    
    const timestamp = new Date().toLocaleString();
    const content = `## Saved on: ${timestamp}\n\n` +
      `### 1. Raw Prompt\n\`\`\`text\n${rawPrompt}\n\`\`\`\n\n` +
      `### 2. Expanded Narrative\n\`\`\`text\n${expandedNarrative}\n\`\`\`\n\n` +
      `### 3. Contracted Dense Block\n\`\`\`text\n${densePrompt}\n\`\`\`\n\n---\n\n`;
      
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prompt_Optimized_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setStatusMsg('Saved full prompts to file!');
    setStatusColor('text-[#a6e3a1]');
  };

  return (
    <div className="bg-[#11111b] text-[#cdd6f4] h-screen flex flex-col font-sans overflow-hidden p-6 gap-4 selection:bg-[#89b4fa] selection:text-[#11111b]">
      {/* TOP BAR: Connection & Global Controls */}
      <header className="flex flex-shrink-0 items-center justify-between bg-[#181825] border border-[#313244] rounded-2xl px-6 py-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#89b4fa] rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-[#11111b]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#89b4fa]">
              Leo.ai <span className="text-[#cdd6f4]/50 font-normal underline decoration-[#313244]">Prompt Optimizer</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[#a6adc8] font-semibold">
              Multi-Pass Expansion & Compression
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 hidden sm:flex">
          <div className="flex items-center bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-bold text-[#89b4fa] mr-2">PLATFORM:</span>
            <span className="text-xs text-[#cdd6f4]/80">Google Gemini</span>
          </div>
          <div className="flex items-center bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-bold text-[#f9e2af] mr-2">STATE:</span>
            <span className="text-xs text-[#cdd6f4]/80 flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse"></span>
               Connected
            </span>
          </div>
        </div>
      </header>

      {/* MAIN BENTO GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-4 overflow-auto lg:overflow-hidden pb-4 lg:pb-0">
        
        {/* CARD 1: INPUT */}
        <section className="lg:col-span-5 lg:row-span-4 bg-[#181825] border border-[#313244] rounded-3xl p-5 flex flex-col gap-4 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#89b4fa]/20 text-[#89b4fa] text-[10px] font-black px-2 py-0.5 rounded-full">01</span>
              <h2 className="text-sm font-bold text-[#89b4fa] uppercase tracking-wider">Raw Input</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handlePaste}
                className="text-[10px] bg-[#313244] px-2 py-1 rounded hover:text-[#89b4fa] flex items-center gap-1 transition-colors"
                title="Paste"
              >
                <ClipboardPaste size={12} /> Paste
              </button>
              <button 
                onClick={clearAll}
                disabled={isProcessing}
                className="text-[10px] bg-[#313244] px-2 py-1 rounded hover:text-[#f38ba8] disabled:opacity-50 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <textarea
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            placeholder="Enter your chaotic or brief prompt here..."
            className="flex-1 bg-[#1e1e2e] border border-[#313244] rounded-xl p-4 text-xs font-mono resize-none focus:border-[#89b4fa] outline-none text-[#cdd6f4] leading-relaxed"
          />

          <div 
            {...getRootProps()} 
            className={cn(
              "h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer relative overflow-hidden",
              isDragActive ? "border-[#89b4fa] bg-[#89b4fa]/10" : "border-[#313244] bg-[#1e1e2e]/50 hover:bg-[#1e1e2e]",
              imagePreview && "border-none p-0"
            )}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="relative w-full h-full group bg-black/50 flex items-center justify-center">
                <img src={imagePreview} alt="Upload preview" className="max-w-full max-h-full object-contain mix-blend-screen" />
                <div className="absolute inset-0 bg-[#1e1e2e]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <p className="text-[#cdd6f4] text-xs font-bold uppercase tracking-widest">Replace Image</p>
                </div>
                <button 
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-[#f38ba8]/80 hover:bg-[#f38ba8] text-[#11111b] rounded-full z-10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-[#585b70]" />
                <span className="text-[10px] text-[#585b70] font-bold uppercase tracking-widest text-center px-4">Upload Image for VL Analysis</span>
              </>
            )}
          </div>
        </section>

        {/* CARD 2: PASS 1 (EXPANDED) */}
        <section className="lg:col-span-7 lg:row-span-3 bg-[#181825] border border-[#313244] rounded-3xl p-5 flex flex-col gap-3 shadow-sm min-h-[250px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#f9e2af]/20 text-[#f9e2af] text-[10px] font-black px-2 py-0.5 rounded-full">02</span>
              <h2 className="text-sm font-bold text-[#f9e2af] uppercase tracking-wider hidden sm:block">Pass 1: Expanded Narrative</h2>
              <h2 className="text-sm font-bold text-[#f9e2af] uppercase tracking-wider sm:hidden">Expanded</h2>
              <span className="text-[9px] bg-[#f9e2af]/10 text-[#f9e2af] px-2 py-0.5 rounded border border-[#f9e2af]/20 font-mono hidden md:block">LITE MODEL</span>
            </div>
            <div className="text-[10px] text-[#a6d1eb] font-mono font-bold">
              {expandedNarrative.length} CHARS
            </div>
          </div>
          <textarea
            value={expandedNarrative}
            readOnly
            placeholder="..."
            className="flex-1 bg-[#313244]/30 border border-[#313244] rounded-xl p-4 text-[11px] sm:text-xs font-mono text-[#f9e2af]/80 leading-relaxed outline-none resize-none"
          />
        </section>

        {/* CARD 3: PASS 2 (CONTRACTED) */}
        <section className="lg:col-span-7 lg:row-span-3 bg-[#181825] border border-[#45475a] rounded-3xl p-5 flex flex-col gap-3 shadow-md ring-1 ring-[#a6e3a1]/20 min-h-[250px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#a6e3a1]/20 text-[#a6e3a1] text-[10px] font-black px-2 py-0.5 rounded-full">03</span>
              <h2 className="text-sm font-bold text-[#a6e3a1] uppercase tracking-wider hidden sm:block">Final: Dense Prompt</h2>
              <h2 className="text-sm font-bold text-[#a6e3a1] uppercase tracking-wider sm:hidden">Dense</h2>
              <span className="text-[9px] bg-[#a6e3a1]/10 text-[#a6e3a1] px-2 py-0.5 rounded border border-[#a6e3a1]/20 font-mono hidden md:block">REASONING MODEL</span>
            </div>
            <div className={cn(
               "text-[10px] font-mono font-bold",
               densePrompt.length > 1500 ? "text-[#f38ba8]" : "text-[#a6e3a1]"
            )}>
              {densePrompt.length} / 1500
            </div>
          </div>
          <textarea
            value={densePrompt}
            readOnly
            placeholder="..."
            className="flex-1 bg-[#313244]/50 border border-[#45475a] rounded-xl p-4 text-[11px] sm:text-xs font-mono text-[#a6e3a1] leading-relaxed select-all outline-none resize-none"
          />
        </section>

        {/* CARD 4: ACTIONS & PIPELINE */}
        <section className="lg:col-span-5 lg:row-span-2 bg-[#1e1e2e] border border-[#313244] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[200px]">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#89b4fa]/5 blur-3xl rounded-full"></div>
          
          <div className="flex flex-col gap-3 relative z-10">
            <button 
              onClick={runPipeline}
              disabled={isProcessing}
              className="w-full bg-[#89b4fa] hover:bg-[#b4befe] text-[#11111b] font-bold py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                 <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#11111b] animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-[#11111b] animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 rounded-full bg-[#11111b] animate-bounce" style={{animationDelay: '0.2s'}}></span>
                 </span>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  RUN PIPELINE
                </>
              )}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => copyToClipboard(expandedNarrative, 'Expanded narrative')}
                className="bg-[#313244] hover:bg-[#45475a] py-2.5 rounded-lg text-[10px] text-[#cdd6f4] font-bold uppercase tracking-wider transition-colors"
              >
                Copy Expanded
              </button>
              <button 
                onClick={() => copyToClipboard(densePrompt, 'Dense prompt')}
                className="bg-[#313244] hover:bg-[#45475a] py-2.5 rounded-lg text-[10px] text-[#cdd6f4] font-bold uppercase tracking-wider transition-colors"
              >
                Copy Dense
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#313244] relative z-10 mt-3 sm:mt-0">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                 <Zap className="w-3 h-3 text-[#f9e2af] animate-pulse" />
              ) : (
                 <div className={cn("w-2 h-2 rounded-full", densePrompt && !isProcessing ? "bg-[#a6e3a1]" : "bg-[#585b70]")}></div>
              )}
              <span className={cn(
                 "text-[10px] font-mono truncate max-w-[150px] sm:max-w-[200px]",
                 statusColor
              )}>
                {statusMsg.toUpperCase()}
              </span>
            </div>
            <button 
              onClick={saveToFile}
              className="text-[10px] text-[#89b4fa] hover:text-[#b4befe] hover:underline flex items-center gap-1 font-bold transition-colors whitespace-nowrap"
            >
              <Save size={12} />
              SAVE TO MD
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}

