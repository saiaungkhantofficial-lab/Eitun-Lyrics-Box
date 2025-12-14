export interface LyricLine {
  time: number; // in seconds
  text: string;
  translation?: string; // Optional field for the translated text
  originalTimeTag: string; // e.g., "[01:23.45]"
}

export interface GeneratedLyrics {
  rawLrc: string;
  parsedLines: LyricLine[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}