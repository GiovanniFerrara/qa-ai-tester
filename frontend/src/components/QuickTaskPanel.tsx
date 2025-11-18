import { useEffect, useRef, useState } from "react";
import { useTranscribeAudio, useContextualizeTask } from "../hooks/useApi";
import type { TaskInput } from "../types";
import {
  Button,
  ErrorMessage,
  SuccessBanner,
  IconButton,
} from "../styles/shared.styled";
import {
  QuickTaskPanelWrapper,
  QuickTaskHeader,
  QuickTaskTextarea,
  QuickTaskActions,
  QuickTaskStatus,
} from "./QuickTaskPanel.styled";

interface QuickTaskPanelProps {
  onPrefill: (draft: TaskInput) => void;
}

export function QuickTaskPanel({ onPrefill }: QuickTaskPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const recordingSupported =
    typeof window !== "undefined" && "MediaRecorder" in window;

  const transcribeMutation = useTranscribeAudio({
    onSuccess: (result) => {
      setPrompt((prev) => {
        if (!prev) return result.text;
        return `${prev.trim()}\n${result.text}`;
      });
      setStatus("Transcription added to the text area.");
    },
  });

  const contextualizeMutation = useContextualizeTask({
    onSuccess: (draft) => {
      onPrefill(draft);
      setStatus("Test Case form pre-filled. Review and save when ready.");
    },
  });

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleRecordToggle = async () => {
    if (!recordingSupported) {
      setStatus(null);
      return;
    }

    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      setStatus(null);
      transcribeMutation.reset();
      contextualizeMutation.reset();
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

      recorder.onerror = () => {
        setRecording(false);
        setStatus(null);
      };

      recorder.onstop = () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        if (chunksRef.current.length === 0) {
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        setStatus("Transcribing audio…");
        transcribeMutation.mutate(blob);
      };

      recorder.start();
      setRecording(true);
      setStatus("Recording...");
    } catch {
      setStatus(null);
    }
  };

  const handleContextualize = () => {
    if (!prompt.trim()) {
      return;
    }

    setStatus("Generating test draft…");
    contextualizeMutation.mutate({ prompt });
  };

  const isBusy =
    transcribeMutation.isPending || contextualizeMutation.isPending;
  const error = transcribeMutation.error || contextualizeMutation.error;

  return (
    <QuickTaskPanelWrapper>
      <QuickTaskHeader>
        <h3>Quick Test Case Builder</h3>
        <p>
          Record or type a short request and let AI fill out the full test case
          form.
        </p>
      </QuickTaskHeader>
      {error && <ErrorMessage>{error.message}</ErrorMessage>}
      {status && !error && <SuccessBanner>{status}</SuccessBanner>}
      <QuickTaskTextarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want the QA agent to validate..."
        rows={8}
      />
      <QuickTaskActions>
        {recordingSupported && (
          <IconButton
            type="button"
            $recording={recording}
            onClick={handleRecordToggle}
            disabled={isBusy}
            title={recording ? "Stop Recording" : "Record Voice"}
          >
            🎤
          </IconButton>
        )}
        <Button type="button" onClick={handleContextualize} disabled={isBusy}>
          {contextualizeMutation.isPending
            ? "Creating Draft…"
            : "Create Test Case Draft"}
        </Button>
      </QuickTaskActions>
      {recording && (
        <QuickTaskStatus $isRecording={true}>
          🔴 Recording in progress…
        </QuickTaskStatus>
      )}
      {!recording && transcribeMutation.isPending && (
        <QuickTaskStatus>Transcribing audio…</QuickTaskStatus>
      )}
      {!recording &&
        !transcribeMutation.isPending &&
        contextualizeMutation.isPending && (
          <QuickTaskStatus>Contextualizing task…</QuickTaskStatus>
        )}
    </QuickTaskPanelWrapper>
  );
}
