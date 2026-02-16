// ============================================================
// CodeSonify - Diff Analyzer
// Analyzes code diffs and creates musical representations
// Additions sound bright/ascending, deletions sound dark/descending
// ============================================================

import { Composer } from './composer.js';
import { MusicMapper, SCALES, NOTE_NAMES, DURATION_VALUES } from './mapper.js';
import type { MusicStyle } from './mapper.js';
import {
  MusicComposition,
  MusicNote,
  MusicTrack,
  InstrumentType,
  TrackEffect,
} from './types.js';

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'header';
  content: string;
  lineNumber: number;
}

interface DiffAnalysis {
  addedLines: number;
  removedLines: number;
  contextLines: number;
  totalChanges: number;
  changeRatio: number; // added / (added + removed), 0 = all deletions, 1 = all additions
  files: string[];
}

export class DiffSonifier {
  private composer: Composer;

  constructor() {
    this.composer = new Composer();
  }

  /**
   * Parse a unified diff string into structured lines.
   */
  parseDiff(diffText: string): DiffLine[] {
    const lines = diffText.split('\n');
    const parsed: DiffLine[] = [];
    let lineNum = 0;

    for (const line of lines) {
      lineNum++;
      if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
        parsed.push({ type: 'header', content: line, lineNumber: lineNum });
      } else if (line.startsWith('@@')) {
        parsed.push({ type: 'header', content: line, lineNumber: lineNum });
      } else if (line.startsWith('+')) {
        parsed.push({ type: 'added', content: line.substring(1), lineNumber: lineNum });
      } else if (line.startsWith('-')) {
        parsed.push({ type: 'removed', content: line.substring(1), lineNumber: lineNum });
      } else {
        parsed.push({ type: 'context', content: line, lineNumber: lineNum });
      }
    }

    return parsed;
  }

  /**
   * Analyze a diff for summary statistics.
   */
  analyzeDiff(diffLines: DiffLine[]): DiffAnalysis {
    const addedLines = diffLines.filter(l => l.type === 'added').length;
    const removedLines = diffLines.filter(l => l.type === 'removed').length;
    const contextLines = diffLines.filter(l => l.type === 'context').length;
    const totalChanges = addedLines + removedLines;

    // Extract file names from headers
    const files: string[] = [];
    for (const line of diffLines) {
      if (line.content.startsWith('+++ b/') || line.content.startsWith('+++ ')) {
        const filename = line.content.replace('+++ b/', '').replace('+++ ', '').trim();
        if (filename && filename !== '/dev/null') {
          files.push(filename);
        }
      }
    }

    return {
      addedLines,
      removedLines,
      contextLines,
      totalChanges,
      changeRatio: totalChanges > 0 ? addedLines / totalChanges : 0.5,
      files,
    };
  }

  /**
   * Sonify a diff: create a musical composition that represents code changes.
   * - Added lines: bright, ascending notes in major key
   * - Removed lines: darker, descending notes in minor key
   * - Context lines: soft ambient notes
   * - The overall feel reflects the change ratio
   */
  sonifyDiff(diffText: string, style: MusicStyle = 'classical'): {
    composition: MusicComposition;
    diffAnalysis: DiffAnalysis;
    summary: string;
  } {
    const diffLines = this.parseDiff(diffText);
    const diffAnalysis = this.analyzeDiff(diffLines);

    // Determine musical parameters based on diff character
    const isMainlyAdding = diffAnalysis.changeRatio > 0.6;
    const isMainlyRemoving = diffAnalysis.changeRatio < 0.4;

    // Key: additions → major (bright), deletions → minor (dark)
    const key = isMainlyAdding ? 'C' : isMainlyRemoving ? 'A' : 'D';
    const scale = isMainlyAdding ? 'major' : isMainlyRemoving ? 'minor' : 'dorian';

    // Tempo based on change intensity
    const tempo = Math.min(160, Math.max(70, 80 + diffAnalysis.totalChanges * 2));

    // Generate notes from diff lines
    const notes = this.mapDiffToNotes(diffLines, key, scale, tempo);

    // Organize into tracks
    const tracks = this.organizeDiffTracks(notes);

    // Calculate total duration
    const totalDuration = notes.length > 0
      ? Math.max(...notes.map(n => n.time)) + 1
      : 5;

    const composition: MusicComposition = {
      title: `CodeSonify: Diff Composition (${diffAnalysis.addedLines}+ / ${diffAnalysis.removedLines}-)`,
      tempo,
      timeSignature: [4, 4],
      key: key as any,
      scale: scale as any,
      duration: totalDuration,
      tracks,
      metadata: {
        sourceLanguage: 'unknown',
        linesAnalyzed: diffLines.length,
        complexity: Math.min(100, diffAnalysis.totalChanges * 3),
        generatedAt: new Date().toISOString(),
        codeHash: this.simpleHash(diffText),
        musicalInterpretation: this.generateDiffInterpretation(diffAnalysis, style),
      },
    };

    const summary = this.generateDiffSummary(diffAnalysis, composition);

    return { composition, diffAnalysis, summary };
  }

  /**
   * Sonify the difference between two code versions.
   */
  sonifyTwoVersions(oldCode: string, newCode: string, style: MusicStyle = 'classical'): {
    composition: MusicComposition;
    diffAnalysis: DiffAnalysis;
    summary: string;
    oldComposition: MusicComposition;
    newComposition: MusicComposition;
  } {
    // Generate compositions for both versions
    const oldResult = this.composer.sonify({ code: oldCode, style });
    const newResult = this.composer.sonify({ code: newCode, style });

    // Create a simple diff between the two
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    // Build a pseudo-diff
    let diffText = '--- a/old.code\n+++ b/new.code\n@@ -1 +1 @@\n';
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        diffText += `+${newLine}\n`;
      } else if (oldLine !== undefined && newLine === undefined) {
        diffText += `-${oldLine}\n`;
      } else if (oldLine !== newLine) {
        diffText += `-${oldLine}\n+${newLine}\n`;
      } else {
        diffText += ` ${oldLine}\n`;
      }
    }

    const { composition, diffAnalysis, summary } = this.sonifyDiff(diffText, style);

    return {
      composition,
      diffAnalysis,
      summary,
      oldComposition: oldResult.composition,
      newComposition: newResult.composition,
    };
  }

  /**
   * Map diff lines to musical notes.
   */
  private mapDiffToNotes(
    diffLines: DiffLine[],
    key: string,
    scale: string,
    tempo: number,
  ): MusicNote[] {
    const notes: MusicNote[] = [];
    let currentTime = 0;
    const tempoMultiplier = 120 / tempo;

    const majorScale = SCALES.major;
    const minorScale = SCALES.minor;
    const pentatonicScale = SCALES.pentatonic;
    const keyIndex = NOTE_NAMES.indexOf(key as any) || 0;

    for (const line of diffLines) {
      if (line.type === 'header') {
        // Headers → brief cymbal/hit sound
        notes.push({
          note: `${key}5`,
          duration: '16n',
          velocity: 0.2,
          time: currentTime,
          instrument: 'ambient',
        });
        currentTime += 0.1 * tempoMultiplier;
        continue;
      }

      if (line.type === 'context') {
        // Context lines → soft ambient notes
        const scaleIdx = line.lineNumber % pentatonicScale.length;
        const semitone = (keyIndex + pentatonicScale[scaleIdx]) % 12;
        notes.push({
          note: `${NOTE_NAMES[semitone]}3`,
          duration: '4n',
          velocity: 0.15,
          time: currentTime,
          instrument: 'ambient',
        });
        currentTime += 0.15 * tempoMultiplier;
        continue;
      }

      if (line.type === 'added') {
        // Added lines → bright, ASCENDING melody in major scale
        const contentLength = line.content.trim().length;
        const phraseNotes = Math.min(5, Math.max(1, Math.floor(contentLength / 10) + 1));

        for (let i = 0; i < phraseNotes; i++) {
          const scaleIdx = i % majorScale.length;
          const semitone = (keyIndex + majorScale[scaleIdx]) % 12;
          const octave = 4 + Math.floor(i / majorScale.length);

          notes.push({
            note: `${NOTE_NAMES[semitone]}${Math.min(6, octave)}`,
            duration: '8n',
            velocity: 0.6 + (i * 0.05),
            time: currentTime,
            instrument: 'melody',
          });
          currentTime += 0.12 * tempoMultiplier;
        }

        // Add a harmonic chord for significant additions
        if (contentLength > 20) {
          const chordNotes = [0, 4, 7]; // major triad
          for (const interval of chordNotes) {
            const semitone = (keyIndex + interval) % 12;
            notes.push({
              note: `${NOTE_NAMES[semitone]}4`,
              duration: '4n',
              velocity: 0.35,
              time: currentTime,
              instrument: 'harmony',
            });
          }
        }

        currentTime += 0.1 * tempoMultiplier;
      }

      if (line.type === 'removed') {
        // Removed lines → darker, DESCENDING melody in minor scale
        const contentLength = line.content.trim().length;
        const phraseNotes = Math.min(4, Math.max(1, Math.floor(contentLength / 12) + 1));

        for (let i = 0; i < phraseNotes; i++) {
          const scaleIdx = (minorScale.length - 1 - i) % minorScale.length;
          const semitone = (keyIndex + minorScale[Math.abs(scaleIdx)]) % 12;
          const octave = 4 - Math.floor(i / minorScale.length);

          notes.push({
            note: `${NOTE_NAMES[semitone]}${Math.max(2, octave)}`,
            duration: '8n',
            velocity: 0.45 - (i * 0.05),
            time: currentTime,
            instrument: 'bass',
          });
          currentTime += 0.15 * tempoMultiplier;
        }

        // Subtle percussion hit for deletions
        notes.push({
          note: `${key}2`,
          duration: '16n',
          velocity: 0.3,
          time: currentTime,
          instrument: 'percussion',
        });

        currentTime += 0.08 * tempoMultiplier;
      }
    }

    return notes;
  }

  /**
   * Organize diff notes into tracks.
   */
  private organizeDiffTracks(notes: MusicNote[]): MusicTrack[] {
    const trackMap = new Map<InstrumentType, MusicNote[]>();

    for (const note of notes) {
      if (!trackMap.has(note.instrument)) {
        trackMap.set(note.instrument, []);
      }
      trackMap.get(note.instrument)!.push(note);
    }

    const trackConfigs: Record<string, { waveform: any; volume: number; effects: TrackEffect[] }> = {
      melody:     { waveform: 'triangle', volume: 0.7, effects: [{ type: 'reverb', params: { decay: 2, wet: 0.3 } }] },
      bass:       { waveform: 'sine',     volume: 0.5, effects: [{ type: 'filter', params: { frequency: 400, type: 0 } }] },
      harmony:    { waveform: 'sine',     volume: 0.4, effects: [{ type: 'reverb', params: { decay: 3, wet: 0.5 } }] },
      percussion: { waveform: 'square',   volume: 0.4, effects: [] },
      ambient:    { waveform: 'sine',     volume: 0.2, effects: [{ type: 'reverb', params: { decay: 5, wet: 0.6 } }] },
    };

    const trackNames: Record<string, string> = {
      melody: '✨ Additions (Ascending Major)',
      bass: '🔻 Deletions (Descending Minor)',
      harmony: '🎹 Significant Changes (Chords)',
      percussion: '🥁 Change Markers',
      ambient: '🌊 Context & Headers',
    };

    const tracks: MusicTrack[] = [];
    for (const [instrument, trackNotes] of trackMap) {
      const config = trackConfigs[instrument] || trackConfigs['ambient'];
      tracks.push({
        name: trackNames[instrument] || instrument,
        instrument,
        waveform: config.waveform,
        volume: config.volume,
        notes: trackNotes,
        effects: config.effects,
      });
    }

    return tracks;
  }

  /**
   * Generate a musical interpretation of the diff.
   */
  private generateDiffInterpretation(analysis: DiffAnalysis, style: MusicStyle): string {
    const parts: string[] = [];

    if (analysis.changeRatio > 0.8) {
      parts.push('A bright, optimistic composition reflecting significant new code additions');
    } else if (analysis.changeRatio > 0.6) {
      parts.push('A mostly uplifting piece with new code dominating the melody');
    } else if (analysis.changeRatio > 0.4) {
      parts.push('A balanced composition reflecting equal parts creation and removal — a refactoring journey');
    } else if (analysis.changeRatio > 0.2) {
      parts.push('A contemplative piece where code cleanup dominates — simplification in progress');
    } else {
      parts.push('A minimalist, descending composition reflecting major code removal — a bold cleanup');
    }

    parts.push(`${analysis.addedLines} lines added, ${analysis.removedLines} lines removed`);

    if (analysis.files.length > 0) {
      parts.push(`across ${analysis.files.length} file${analysis.files.length > 1 ? 's' : ''}`);
    }

    parts.push(`rendered in ${style} style`);

    return parts.join(', ') + '.';
  }

  /**
   * Generate a formatted summary for MCP output.
   */
  private generateDiffSummary(analysis: DiffAnalysis, composition: MusicComposition): string {
    const addBar = '🟩'.repeat(Math.min(20, analysis.addedLines));
    const removeBar = '🟥'.repeat(Math.min(20, analysis.removedLines));

    return [
      `🎵 **Diff Sonification Complete!**`,
      ``,
      `**Changes:**`,
      `+ ${analysis.addedLines} lines added  ${addBar}`,
      `- ${analysis.removedLines} lines removed  ${removeBar}`,
      ``,
      `**Musical Interpretation:**`,
      `- Key: ${composition.key} ${composition.scale} (${analysis.changeRatio > 0.5 ? 'bright — more additions' : 'dark — more deletions'})`,
      `- Tempo: ${composition.tempo} BPM (${analysis.totalChanges > 30 ? 'intense' : 'moderate'} changes)`,
      `- Duration: ${composition.duration.toFixed(1)}s`,
      `- Tracks: ${composition.tracks.length}`,
      ``,
      `**How to read it:**`,
      `- 🔺 Ascending bright melodies = added code`,
      `- 🔻 Descending dark bass = removed code`,
      `- 🎹 Chords = significant changes`,
      `- 🌊 Soft ambient = unchanged context`,
      ``,
      `💬 ${composition.metadata.musicalInterpretation}`,
    ].join('\n');
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export default DiffSonifier;
