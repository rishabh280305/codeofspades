"use client";

import { useEffect, useState } from "react";

export function ScheduleAiSummary({ date }: { date: string }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  async function handleReadAloud() {
    if (!summary) {
      return;
    }

    if (speaking) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setSpeaking(false);
      return;
    }

    try {
      setError("");
      setSpeaking(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary.replace(/[-*]/g, " ") }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Unable to generate voice output");
      }

      const blob = await response.blob();
      const nextAudioUrl = URL.createObjectURL(blob);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const nextAudio = new Audio(nextAudioUrl);
      nextAudio.onended = () => setSpeaking(false);
      nextAudio.onerror = () => {
        setError("Failed to play generated audio");
        setSpeaking(false);
      };

      setAudioUrl(nextAudioUrl);
      setAudio(nextAudio);
      await nextAudio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Read aloud failed");
      setSpeaking(false);
    }
  }

  useEffect(() => {
    return () => {
      audio?.pause();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audio, audioUrl]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/ai/schedule-summary?date=${date}`);
        const data = await res.json() as { summary?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Failed to load AI briefing");
          return;
        }
        setSummary(data.summary ?? "");
      } catch {
        setError("AI service is currently unavailable");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date]);

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 border-2 border-black bg-[#e8f3ff] p-3 text-sm">
        <span className="animate-spin">⟳</span>
        <span className="font-semibold">AI is analyzing your schedule…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 border-2 border-black bg-red-50 p-3 text-xs text-red-700">
        <strong>AI Briefing unavailable:</strong> {error}
      </div>
    );
  }

  return (
    <div className="mb-4 border-2 border-black bg-[#e8f3ff] shadow-[4px_4px_0_0_#000]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2 font-black text-sm hover:bg-[#d0e8ff]"
      >
        <span>✦ AI Schedule Briefing</span>
        <span className="text-xs">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>
      {open && (
        <div className="border-t-2 border-black px-4 py-3">
          <div className="mb-2">
            <button
              type="button"
              onClick={handleReadAloud}
              className="border-2 border-black bg-white px-3 py-1 text-xs font-bold hover:bg-gray-100"
            >
              {speaking ? "Stop Reading" : "Read Aloud"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-800">
            {summary}
          </pre>
          <p className="mt-2 text-xs text-gray-400 italic">
            AI-generated briefing based on today&apos;s appointments.
          </p>
        </div>
      )}
    </div>
  );
}
