"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export function AnalyticsAiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Ask me anything about your analytics. Example: least used slot?",
    },
  ]);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/analytics-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = (await response.json()) as { answer?: string; error?: string };
      const reply = response.ok
        ? data.answer || "No answer available."
        : data.error || "Could not answer right now.";

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Network issue. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-2 border-black bg-white shadow-[6px_6px_0_0_#000]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-black">AI Analytics Chat</span>
        <span className="text-xs font-semibold">{open ? "▲ Hide" : "▼ Open"}</span>
      </button>

      {open ? (
        <div className="border-t-2 border-black p-3">
          <div className="max-h-64 space-y-2 overflow-y-auto border-2 border-black bg-[var(--panel)] p-2">
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`text-xs ${message.role === "assistant" ? "text-black" : "font-semibold text-blue-800"}`}
              >
                <span className="mr-1 font-bold">{message.role === "assistant" ? "AI:" : "You:"}</span>
                <span>{message.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAsk} className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask: Which slot is least used?"
              className="flex-1 border-2 border-black px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="border-2 border-black bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "..." : "Ask"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
