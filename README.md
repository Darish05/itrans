# Tantra Connect

Build a high-quality responsive web prototype/mock UI for an SIH project called:

iTantra – Indian Multilingual TTS & STT Aided Neural Transceiver Radio Access for Low Bitrate

SIH Problem Statement: 26173

The purpose of this UI is to demonstrate a low-bandwidth voice communication system where speech is converted to text using STT, transmitted as lightweight text data, and converted back to speech using TTS on another device.

IMPORTANT:
This is primarily a VISUAL DEMO / SIMULATION UI. Do not build a real Android application in this task. Create a polished web-based control dashboard that visually simulates two Android phones communicating with each other.

CORE UI CONCEPT

The main screen should show:

             PHONE A                         PHONE B
         ┌─────────────┐                 ┌─────────────┐
         │ Android UI  │  ← Wi-Fi/BLE → │ Android UI  │
         │ STT MODE    │                 │ TTS MODE    │
         └─────────────┘                 └─────────────┘


Both phones must be visible simultaneously in the center of the screen.

The UI should make it immediately understandable that:

PHONE A:

User speaks

STT converts speech → text

Text is transmitted

Transmission latency is measured

PHONE B:

Receives text

TTS converts text → speech

Audio is played

TTS latency and Real-Time Factor are measured

The interface should visually resemble two real Android smartphones placed side-by-side.

DESIGN STYLE

Use a modern technology / communication / defense / emergency-response aesthetic.

Style:

Dark dashboard

Black / dark navy background

Cyan/blue/green accent colors

Glassmorphism panels

Subtle glowing borders

Clear typography

Professional engineering dashboard

No excessive futuristic animations

Suitable for an SIH presentation/demo

Use responsive design.

The page should work well on:

Laptop

Projector

Large screen

MAIN DASHBOARD

Create the following sections.

1. HEADER

Title:

iTantra

Subtitle:

Indian Multilingual TTS & STT Aided Neural Transceiver

Small label:

SIH 26173 • Low-Bitrate Voice Communication

Header controls:

Connection status

Wi-Fi / Bluetooth selector

Language selector

Start Demo button

Stop button

Connection status should show:

● CONNECTED

or

● DISCONNECTED

2. TWO-PHONE SIMULATION AREA

The most important part of the interface.

Place two realistic phone frames side-by-side.

PHONE A:

Header inside phone:

iTantra
STT DEVICE

Status:

● Listening

Show:

Microphone icon

Push-to-Talk button

Waveform animation

Current language

Recognized text

Transmission status

Example:

Language:
Tamil

STT Status:
Listening...

Recognized Text:

"வணக்கம், இது அவசர தகவல்."

Below:

TEXT PACKET

Size: 42 bytes

Transmission:
██████████ 100%

Latency:
82 ms

PHONE B:

Header:

iTantra
TTS DEVICE

Status:

● Receiving

Show:

Incoming Text

"வணக்கம், இது அவசர தகவல்."

TTS Status:
Synthesizing...

Audio Output:
▶ Playing

TTS Latency:
146 ms

RTF:
0.21x

Audio Duration:
2.4 sec

Also show a speaker icon and animated audio waveform while playing.

3. COMMUNICATION LINK

Between the two phones create a visual communication connection.

Display:

PHONE A
↓
STT
↓
TEXT PACKET
↓
Wi-Fi / Bluetooth
↓
TEXT PACKET
↓
TTS
↓
PHONE B

Animate small data packets moving between the phones.

The transmitted object should visually be TEXT, not raw audio.

Clearly show:

Speech → Text → Low-Bitrate Transmission → Text → Speech

This is one of the most important concepts of the project.

4. LANGUAGE PANEL

Create a language selector containing all 10 supported languages:

Hindi
Gujarati
Marathi
Kannada
Malayalam
Tamil
Telugu
Odia
Bengali
English

Show language chips/cards.

Example:

Tamil ✓

When language changes, update the displayed sample text.

Use native scripts where possible.

Examples:

English:
"Emergency assistance required."

Tamil:
"அவசர உதவி தேவை."

Hindi:
"आपातकालीन सहायता आवश्यक है।"

Telugu:
"అత్యవసర సహాయం అవసరం."

5. PERFORMANCE METRICS

Create a metrics panel below the phones.

Show metrics for BOTH devices.

PHONE A – STT

Model:
Google STT Adapter

CPU:
18%

RAM:
142 MB

STT Latency:
82 ms

Word Error Rate:
4.8%

Packet Size:
42 bytes

PHONE B – TTS

Model:
Microsoft TTS Adapter

CPU:
21%

RAM:
168 MB

TTS Latency:
146 ms

RTF:
0.21x

Audio Duration:
2.4 sec

END-TO-END

Speech-to-Speech:
228 ms

Transmission:
31 ms

Text Packet:
42 bytes

Network:
Wi-Fi

Create small real-time-looking charts for:

CPU

RAM

Latency

The numbers can be simulated/mock values.

Clearly label:

DEMO / SIMULATED METRICS

Do not imply these are actual benchmark measurements.

6. PUSH-TO-TALK CONTROL

Add a large central Push-To-Talk button.

Button states:

IDLE
Press and Hold
Listening
Processing
Transmitting
Complete

When pressed:

Phone A should show:
Listening...

Waveform should animate.

Then:

Speech detected

STT processing...

Recognized text appears.

Then:

Transmitting...

A text packet moves from Phone A to Phone B.

Phone B then shows:

Text received

TTS processing...

Then:

▶ Playing

This should be visually simulated.

7. PHONE MODE

Add a mode switch:

[ WALKIE-TALKIE ] [ PHONE MODE ]

Walkie-Talkie mode:

Push-to-talk

One-way transmission

Low-bandwidth text transmission

Fast response

Phone Mode:

Continuous conversation

Automatic speech detection

Pause detection

STT → text → transmission → TTS

8. PAUSE / VOICE ACTIVITY DETECTION

Show a small control panel:

Voice Activity Detection

Status:
ACTIVE

Silence threshold:
1.2 sec

When the simulated user stops speaking, show:

Pause detected
Sentence finalized

Then trigger STT → transmission → TTS animation.

9. ALERT MODE

Create a prominent emergency alert control.

Button:

🚨 EMERGENCY ALERT

When activated:

Phone B screen turns into ALERT MODE

Large red/orange alert indicator

Speaker icon

Text:

"Emergency assistance required."

Show:

HIGH VOLUME
NON-INTERRUPTIBLE

Also show:

Alert priority: CRITICAL

This is a UI simulation only.

10. COMMUNICATION LOG

Create a message/event log.

Example:

20:41:03
Speech detected

20:41:04
Sentence finalized

20:41:04
STT completed – 82 ms

20:41:04
Text packet created – 42 bytes

20:41:04
Packet transmitted – 31 ms

20:41:04
Text received

20:41:04
TTS completed – 146 ms

20:41:04
Audio playback started

Use different icons for:

STT

Network

TTS

Audio

Alert

11. ARCHITECTURE OVERVIEW

At the bottom create a simple architecture diagram:

USER SPEECH
↓
VOICE ACTIVITY DETECTION
↓
STT ENGINE
↓
TEXT
↓
TEXT PACKET
↓
Wi-Fi / Bluetooth
↓
TEXT
↓
TTS ENGINE
↓
AUDIO
↓
USER

Add a small note:

"Low-bandwidth communication by transmitting text instead of raw audio."

12. DEMO CONTROLS

Add:

▶ Start Demo

⏸ Pause

↻ Reset

Connection:
Wi-Fi

Language:
Tamil

Mode:
Walkie-Talkie

STT:
Enabled

TTS:
Enabled

13. RESPONSIVE BEHAVIOR

On desktop:
Show both phones side-by-side.

On smaller screens:
Stack them vertically.

But maintain the communication flow visually.

14. IMPORTANT VISUAL REQUIREMENT

The two phones should look like actual smartphone screens, not two generic cards.

Phone frame should contain:

Status bar

App header

Main content

Bottom controls

Microphone / speaker icons

Waveform

Connection indicator

The surrounding dashboard should look like an engineering test console.

15. MOCK FUNCTIONALITY

Implement frontend interactions:

Start Demo

Stop Demo

Reset

Language switching

Wi-Fi/Bluetooth switching

Walkie-Talkie/Phone mode

Push-to-talk interaction

Simulated STT processing

Simulated text transmission

Simulated TTS processing

Simulated audio playback

CPU/RAM/latency value updates

Communication log updates

Emergency alert mode

Connection/disconnection state

Use realistic simulated delays.

Example flow:

Press PTT
→ Listening 1 sec
→ STT processing 0.5 sec
→ Text generated
→ Transmission 0.2 sec
→ Phone B receives text
→ TTS processing 0.7 sec
→ Audio playback

Do NOT use real Google or Microsoft API calls in this UI prototype.

Use clean component architecture so the real backend/API implementation can later be connected.

16. TECHNOLOGY

Use:

React

TypeScript

Tailwind CSS

Lucide icons

Modern reusable components

Keep the UI clean and maintainable.

Avoid unnecessary dependencies.


## Development


Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
