// Embedded Jitsi Meet call using the public external_api.js (no npm dep,
// no infrastructure cost — per docs/audit.md recommendation 4.4).

import { useEffect, useRef, useState } from 'react';

const JITSI_DOMAIN = 'meet.jit.si';
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

interface JitsiApi {
  dispose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
      },
    ) => JitsiApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Failed to load the Jitsi script'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface JitsiCallProps {
  roomName: string;
  displayName: string;
  onClose: () => void;
}

export default function JitsiCall({ roomName, displayName, onClose }: JitsiCallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let api: JitsiApi | null = null;
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: { prejoinConfig: { enabled: false } },
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, [roomName, displayName]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-white">Live Session</span>
        <button
          onClick={onClose}
          className="bg-surface border border-border text-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-border transition-colors"
        >
          Leave Call
        </button>
      </div>
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 [&_iframe]:w-full [&_iframe]:h-full" />
      )}
    </div>
  );
}
