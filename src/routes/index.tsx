import { createFileRoute } from "@tanstack/react-router";
import { ITantraDashboard } from "@/components/itantra-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iTantra | Multilingual Neural Transceiver Demo" },
      { name: "description", content: "SIH 26173 visual simulation of low-bitrate multilingual voice communication using speech-to-text and text-to-speech." },
      { property: "og:title", content: "iTantra — Low-Bitrate Voice Communication" },
      { property: "og:description", content: "Interactive SIH 2026 engineering dashboard simulating multilingual STT, lightweight text transmission, and TTS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ITantraDashboard,
});