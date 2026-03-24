"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      if (!res.ok) {
        throw new Error("API failed");
      }

      const data = await res.json();
      setResponse(data.data.message);
    } catch (error) {
      console.error(error);
      setResponse("Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Agent Assistant</h1>

      <textarea
        className="w-full border p-2 rounded"
        rows={4}
        placeholder="Type your request..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleSend}
        className="mt-3 px-4 py-2 bg-black text-white rounded border cursor-pointer"
        disabled={loading}
      >
        {loading ? "Thinking..." : "Send"}
      </button>

      {response && (
        <div className="mt-6 p-4 border rounded bg-gray-50 text-black">
          <p>{response}</p>
        </div>
      )}
    </main>
  );
}
