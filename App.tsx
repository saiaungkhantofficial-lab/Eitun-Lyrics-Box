import React, { useState, useEffect, useRef } from 'react';
import { Download, Mic2, Sparkles, AlertTriangle, Music, Languages, X, Settings, Key, Save } from 'lucide-react';
import { LyricLine, ProcessingStatus } from './types';
import { generateLyricsFromAudio } from './services/geminiService';
import { parseLrc } from './utils/lrcParser';
import FileUploader from './components/FileUploader';
import AudioPlayer from './components/AudioPlayer';
import LyricsDisplay from './components/LyricsDisplay';
import Button from './components/Button';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [rawLrc, setRawLrc] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Settings & API Key State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Ref to track cancellation
  const abortRef = useRef<boolean>(false);

  // Language State
  const [targetLanguage, setTargetLanguage] = useState<string>('None');

  const languageOptions = [
    { value: 'None', label: 'None (Original Lyrics)' },
    { value: 'Burmese', label: 'Burmese' },
    { value: 'English', label: 'English' },
    { value: 'Chinese', label: 'Chinese' },
  ];

  // Load API Key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setUserApiKey(storedKey);
      setTempApiKey(storedKey);
    }
  }, []);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempApiKey);
    setUserApiKey(tempApiKey);
    setShowSettings(false);
  };

  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    // Reset state
    setLyrics([]);
    setRawLrc('');
    setStatus(ProcessingStatus.IDLE);
    setErrorMessage(null);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleGenerateLyrics = async () => {
    if (!audioFile) return;

    // Strict check: User must have an API Key set before processing
    if (!userApiKey) {
      setShowSettings(true);
      return;
    }

    abortRef.current = false; // Reset cancel flag
    setStatus(ProcessingStatus.UPLOADING);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioFile);
      
      reader.onload = async () => {
        if (abortRef.current) return; // Check if cancelled

        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
        const base64Content = base64String.split(',')[1];
        
        if (abortRef.current) return;
        setStatus(ProcessingStatus.GENERATING);
        
        try {
          const generatedLrc = await generateLyricsFromAudio(
            base64Content, 
            audioFile.type, 
            targetLanguage,
            userApiKey // Pass the user's API key
          );
          
          if (abortRef.current) return; // Check if cancelled during generation

          const parsed = parseLrc(generatedLrc);
          setRawLrc(generatedLrc);
          setLyrics(parsed);
          setStatus(ProcessingStatus.COMPLETE);
        } catch (err: any) {
          if (abortRef.current) return; // Ignore errors if cancelled
          console.error(err);
          setErrorMessage(err.message || "Failed to generate lyrics.");
          setStatus(ProcessingStatus.ERROR);
        }
      };

      reader.onerror = () => {
        if (abortRef.current) return;
        setErrorMessage("Failed to read audio file.");
        setStatus(ProcessingStatus.ERROR);
      };

    } catch (e) {
      if (abortRef.current) return;
      setErrorMessage("An unexpected error occurred.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setStatus(ProcessingStatus.IDLE);
  };

  const downloadLrc = () => {
    if (!rawLrc) return;
    
    const blob = new Blob([rawLrc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = audioFile ? `${audioFile.name.replace(/\.[^/.]+$/, "")}.lrc` : 'lyrics.lrc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 px-4 relative">
      
      {/* Settings Button */}
      <button 
        onClick={() => setShowSettings(true)}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all shadow-lg border ${
            !userApiKey ? 'bg-indigo-600 text-white animate-pulse border-indigo-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-white/5'
        }`}
        title="Settings"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Key className="w-5 h-5 text-indigo-400" /> API Configuration
               </h3>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <div className="space-y-4">
                <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl">
                    <p className="text-indigo-200 text-sm">
                        👋 <strong>Welcome!</strong> To use Ei Tun Lyrics Box, you need to provide your own Google Gemini API Key. 
                        It's free to get and is stored securely on your device.
                    </p>
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Gemini API Key
                    </label>
                    <input 
                        type="password" 
                        placeholder="AIzaSy..."
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                   <Button variant="secondary" onClick={() => setShowSettings(false)}>
                      Cancel
                   </Button>
                   <Button onClick={handleSaveApiKey}>
                      <Save className="w-4 h-4" /> Save Key
                   </Button>
                </div>
                <div className="pt-4 border-t border-white/5 text-center">
                   <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                   >
                      Get an API key from Google AI Studio
                   </a>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-12 text-center max-w-2xl w-full relative">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30">
            <Mic2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Ei Tun Lyrics Box
          </h1>
        </div>
        <p className="text-slate-400 text-lg">
          Upload an MP3. Get perfectly synchronized, auto-corrected LRC lyrics powered by AI.
        </p>
      </header>

      <main className="w-full max-w-4xl space-y-8">
        
        {/* Upload Section */}
        {status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR ? (
          <div className="space-y-6 animate-fade-in-up">
            <FileUploader onFileSelect={handleFileSelect} />
            
            {audioFile && (
              <div className="flex flex-col items-center gap-6 bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                <p className="text-indigo-300 font-medium flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  {audioFile.name}
                </p>

                {/* Language Selector */}
                <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-xl border border-white/10">
                    <Languages className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Translate to:</span>
                    <select 
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="bg-transparent text-indigo-400 font-medium focus:outline-none cursor-pointer text-sm"
                    >
                        {languageOptions.map(lang => (
                            <option key={lang.value} value={lang.value} className="bg-slate-800 text-slate-200">
                                {lang.label}
                            </option>
                        ))}
                    </select>
                </div>

                <Button 
                  onClick={handleGenerateLyrics} 
                  isLoading={status === ProcessingStatus.UPLOADING || status === ProcessingStatus.GENERATING}
                  className="w-full max-w-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Magic Lyrics
                </Button>
              </div>
            )}

            {status === ProcessingStatus.ERROR && errorMessage && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 justify-center">
                <AlertTriangle className="w-5 h-5" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Loading State */}
        {(status === ProcessingStatus.UPLOADING || status === ProcessingStatus.GENERATING) && (
            <div className="flex flex-col items-center justify-center py-20 relative">
                {/* Background glow for ambience */}
                <div className="absolute w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-8">
                        {/* Custom Spinner */}
                        <div className="w-20 h-20 border-4 border-slate-700/50 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-lg shadow-indigo-500/20"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        {status === ProcessingStatus.UPLOADING 
                            ? 'Reading Audio...' 
                            : targetLanguage === 'None' 
                                ? 'Transcribing Lyrics...' 
                                : `Creating Magic in ${targetLanguage}...`
                        }
                    </h3>
                    <p className="text-slate-400 text-base mb-10 text-center max-w-md leading-relaxed">
                        Our AI is listening to the track and synchronizing every beat.
                    </p>
                    
                    {/* Professional Stop Button */}
                    <button 
                        onClick={handleStop}
                        className="group relative px-8 py-3 rounded-full bg-slate-900 border border-red-500/30 text-red-400 hover:bg-red-950/30 hover:border-red-500/60 hover:text-red-300 transition-all duration-300 ease-out shadow-lg hover:shadow-red-900/20 active:scale-95 flex items-center gap-3 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2 font-medium">
                            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                            Stop Generation
                        </span>
                        {/* Subtle sheen effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                    </button>
                </div>
            </div>
        )}

        {/* Player & Lyrics View */}
        {status === ProcessingStatus.COMPLETE && audioUrl && (
          <div className="space-y-6 animate-fade-in">
             
            {/* Controls */}
            <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-white/5 backdrop-blur">
                <div className="flex items-center gap-4">
                     <div className="p-2 bg-indigo-500/20 rounded-lg">
                         <Music className="w-5 h-5 text-indigo-400" />
                     </div>
                     <div>
                        <h2 className="font-semibold text-white truncate max-w-[200px] sm:max-w-md">{audioFile?.name}</h2>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 
                            {targetLanguage === 'None' ? 'Lyrics Synced' : `Lyrics Synced & Translated to ${targetLanguage}`}
                        </span>
                     </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => {
                        setAudioFile(null);
                        setAudioUrl(null);
                        setStatus(ProcessingStatus.IDLE);
                    }}>
                        New Song
                    </Button>
                    <Button variant="primary" onClick={downloadLrc}>
                        <Download className="w-4 h-4" />
                        Save .LRC
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 relative">
                 {/* Visualizer Background Effect (Simple CSS glow) */}
                 <div className="absolute inset-0 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                 <LyricsDisplay lyrics={lyrics} currentTime={currentTime} />
                 
                 <div className="sticky bottom-6 z-10">
                    <AudioPlayer 
                        src={audioUrl} 
                        onTimeUpdate={setCurrentTime} 
                        isPlaying={isPlaying}
                        onPlayPause={setIsPlaying}
                        onEnded={() => setIsPlaying(false)}
                    />
                 </div>
            </div>

          </div>
        )}

      </main>

      <footer className="mt-16 text-slate-600 text-sm flex gap-2">
        <span>Powered by Passion</span>
        <span>•</span>
        <span>Created by Freedom</span>
      </footer>
    </div>
  );
};

export default App;