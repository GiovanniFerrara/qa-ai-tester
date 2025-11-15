import { useEffect, useRef, useState } from "react";

import { api } from "../api";
import type { TaskInput } from "../types";

interface QuickTaskPanelProps {
  onPrefill: (draft: TaskInput) => void;
}

export function QuickTaskPanel({ onPrefill }: QuickTaskPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const recordingSupported =
    typeof window !== "undefined" && "MediaRecorder" in window;

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleRecordToggle = async () => {
    if (!recordingSupported) {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }

    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      setError(null);
      setStatus(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        setError(event.error?.message ?? "Recorder error");
        setRecording(false);
      };

      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        if (chunksRef.current.length === 0) {
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        await handleTranscription(blob);
      };

      recorder.start();
      setRecording(true);
      setStatus("Recording...");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to access microphone."
      );
    }
  };

  const handleTranscription = async (blob: Blob) => {
    try {
      setTranscribing(true);
      setStatus("Transcribing audio…");
      const result = await api.transcribeAudio(blob);
      setPrompt((prev) => {
        if (!prev) return result.text;
        return `${prev.trim()}\n${result.text}`;
      });
      setStatus("Transcription added to the text area.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transcribe audio."
      );
    } finally {
      setTranscribing(false);
    }
  };

  const handleContextualize = async () => {
    if (!prompt.trim()) {
      setError("Please provide a short description first.");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setStatus("Generating task draft…");
      const draft = await api.contextualizeTask({ prompt });
      onPrefill(draft);
      setStatus("Task form pre-filled. Review and save when ready.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to contextualize task."
      );
      setStatus(null);
    } finally {
      setGenerating(false);
    }
  };

  const isBusy = transcribing || generating;

  return (
    <div className="quick-task-panel">
      <div className="quick-task-header">
        <h3>Quick Task Builder</h3>
        <p>
          Record or type a short request and let AI fill out the full task form.
        </p>
      </div>
      {error && <div className="error">{error}</div>}
      {status && !error && <div className="success-banner">{status}</div>}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want the QA agent to validate..."
        rows={4}
      />
      <div className="quick-task-actions">
        {recordingSupported && (
          <button
            type="button"
            className={`icon-button ${recording ? "danger recording" : "secondary"}`}
            onClick={handleRecordToggle}
            disabled={isBusy}
            title={recording ? "Stop Recording" : "Record Voice"}
          >
            🎤
          </button>
        )}
        <button type="button" onClick={handleContextualize} disabled={isBusy}>
          {generating ? "Creating Draft…" : "Prefill Task"}
        </button>
      </div>
      {recording && (
        <div className="quick-task-status recording-indicator">
          🔴 Recording in progress…
        </div>
      )}
      {!recording && transcribing && (
        <div className="quick-task-status">Transcribing audio…</div>
      )}
      {!recording && !transcribing && generating && (
        <div className="quick-task-status">Contextualizing task…</div>
      )}
    </div>
  );
}
