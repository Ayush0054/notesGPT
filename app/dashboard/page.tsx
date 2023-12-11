/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getCurrentFormattedDate } from '@/lib/utils';

export default function AudioRecorder() {
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);
  const createNote = useMutation(api.notes.createNote);

  async function startRecording() {
    setIsRunning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let audioChunks: any = [];

    recorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioURL(audioUrl);

      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/mp3' },
        body: audioBlob,
      });
      const { storageId } = await result.json();
      let fileUrl = await createNote({
        storageId,
      });

      console.log({ fileUrl });

      let res = await fetch('/api/whisper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl,
        }),
      });

      let data = await res.json();
      setTranscript(data.text);

      let res2 = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: data.text,
        }),
      });

      let openaiRes = await res2.json();
      const parsedOutput = JSON.parse(openaiRes.output);
      console.log({ parsedOutput });
      setSummary(parsedOutput.summary);
      setActionItems(parsedOutput.actionItems);
    };
    setMediaRecorder(recorder as any);
    recorder.start();
  }

  function stopRecording() {
    // @ts-ignore
    mediaRecorder.stop();
    setIsRunning(false);
  }

  const formattedDate = getCurrentFormattedDate();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => {
          if (prevSeconds === 59) {
            setMinutes((prevMinutes) => prevMinutes + 1);
            return 0;
          }
          return prevSeconds + 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center p-4 border-b">
        <div>
          <svg
            className=" h-6 w-6"
            fill="none"
            height="24"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" x2="4" y1="22" y2="15" />
          </svg>
        </div>
        {/* <Button className="rounded-full" size="icon" variant="ghost"></Button> */}
      </header>
      <main className="flex flex-col items-center justify-center flex-grow p-4 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <Button
            className={`w-24 h-24 rounded-full border-2 ${
              isRunning && 'animate-pulse border-red-500'
            }`}
            variant="outline"
            onClick={startRecording}
          >
            <svg
              className=" h-6 w-6"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </Button>
          <p className="text-lg">
            {minutes < 10 ? `0${minutes}` : minutes}:
            {seconds < 10 ? `0${seconds}` : seconds}
          </p>
          <Button
            variant="destructive"
            className="bg-red-500 text-white"
            onClick={stopRecording}
          >
            Stop
          </Button>
          {audioURL && <audio src={audioURL} controls />}
        </div>
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <Input placeholder="Search recordings..." type="search" />
          {transcript && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-medium">{formattedDate}</p>
                <Button size="icon" variant="ghost">
                  <svg
                    className=" h-5 w-5"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </Button>
              </div>

              <div className="space-y-4 mt-5">
                {transcript && (
                  <>
                    <h1 className="text-xl">Transcript</h1>
                    <p className="text-sm text-gray-500">{transcript}</p>
                  </>
                )}
                {summary && (
                  <>
                    <h1 className="text-xl">Summary</h1>
                    <p className="text-sm text-gray-500">{summary}</p>
                  </>
                )}
                {actionItems.length > 0 && (
                  <>
                    <h1 className="text-xl">Action Items</h1>
                    <ul className="list-disc">
                      {actionItems.map((item, idx) => (
                        <li className="text-sm text-gray-500 ml-5" key={idx}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
