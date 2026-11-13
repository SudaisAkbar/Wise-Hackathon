# Ask Wise: send money hands-free, by voice

A hackathon prototype for the Wise "Max Ease" brief. It's built for older and less tech-confident customers. They say what they need ("Send 150 euros to my grandson Artem"). Ask Wise reads the details back aloud and asks them to say their code, and the money is sent. They don't need to type or tap anything.

**Demo data only.** It never touches real Wise accounts or real money. The demo code is `1234`.

## Run it

You need Node 18.17 or newer and **Google Chrome** (or Edge). Chrome and Edge have the speech recognition the app relies on.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

To work on the interface with live reload, run `npm run dev` and open http://localhost:5173.

Optional: copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`. Claude then understands free, messy speech in all six languages and writes the Help Centre answers. Without a key, the built-in rules handle everything in the demo script.

### Truly hands-free from the first second

Browsers only allow the microphone and speech after one tap on the page. After that one tap (on "Try it" or the green button), everything happens by voice. For a demo with no tap at all, start Chrome like this:

```bash
google-chrome --autoplay-policy=no-user-gesture-required http://localhost:3000
```

Allow the microphone once. From then on, saying "Hey Wise" on the home screen opens the assistant.

## What it does

| | |
|---|---|
| **Hands-free loop** | After every reply it speaks, then listens again by itself. If it hears silence twice, it goes on standby; "Hey Wise" wakes it. |
| **Voice match** | On first use it learns the owner's voice from three short phrases. Every instruction is checked against that voice. A different voice **pauses** everything ("Nothing was sent. Say Hey Wise"). Only the owner's "Hey Wise" resumes, and the transfer carries on from the exact step it stopped at. |
| **Spoken code** | At "Enter your code" the owner says the four digits ("one two three four"). This works in every supported language. The code is accepted only if the voice matches. The keypad is still there. |
| **Spoken read-back** | Each step is said aloud: the recipient, both amounts, the fee and the arrival time. It warns about first-time recipients and amounts over the limit. |
| **Add a recipient by voice** | "Add a new recipient" asks for the name, relationship, country and account number. It reads everything back, with the IBAN in groups of four, and asks "Shall I add Anna?" |
| **Wise Help Centre** | General questions ("How long does a transfer take?", "How do I cancel?") are matched to the relevant public Help Centre article. The answer is spoken in two or three plain sentences, and a link is shown. |
| **Scam guard** | Phrases like "the bank told me to move my money" or "a stranger asked me" stop the flow and suggest calling a family helper. |
| **Six languages** | English, Eesti, Русский, Українська, اردو, हिन्दी. Spoken numbers, currencies and replies are handled in each one. Urdu is laid out right to left. |
| **Helper** | A trusted family member (Olena in the demo) is told about every voice transfer and every new recipient. |

The screens follow the 8-screen design file: Home → Ask Wise opens → Speak now → Your words → Please check → Ready to send → Enter your code → Money sent. Pause, standby, "learn my voice", new recipient and help answers use the same parts.

## Demo script (about 2 minutes)

1. Open the app and tap **Try it**. Say the three phrases it shows to teach it your voice.
2. "Send 150 euros to my grandson Artem." It reads back the amount, what Artem gets in PLN, the fee and the arrival time.
3. "Yes." → *Ready to send.*
4. **A second person speaks.** It pauses: "I heard a different voice… Nothing was sent."
5. The second person says "Hey Wise." → *"Sorry, I can only take instructions from the account owner."*
6. The owner says "Hey Wise." → "Welcome back, Galina. Ready to send 150 euros…"
7. "Send." → "One two three four." → **Money sent.**
8. "How long does a transfer take?" → a spoken answer and a Help Centre link.
9. "Add a new recipient" → name, relationship, country, IBAN → "Yes."

The **presenter panel** (right side on a laptop) can reset the demo, show the voice-match distance live, change its strictness, and re-teach or forget the voice.

## How it works

- `client/`: React 19 + Vite. `voice/engine.js` handles the microphone, listening, speaking and waiting for "Hey Wise". While the browser recognises the words, the microphone is also recorded locally. That recording becomes a voice fingerprint, sent as 25 numbers (never audio).
- `shared/`: code used by both sides. `voiceprint.js` builds the fingerprint (MFCC averages and spread, plus pitch) and compares it with the owner's profile. `spoken.js` parses spoken codes, IBANs and the wake phrase.
- `server/`: Express 5. The server decides every step of the conversation (`assistant/dialog.js`). The browser can't skip a step or send money without the server agreeing. Payments are a mock provider with live-looking quotes. The Help Centre module keeps an index of public wise.com/help articles and fetches the matching one when it can.
- Tests: `npm test` runs 56 tests on the server and shared code. They include synthetic "voices" (owner, a man, a child, a similar woman) to check that voice match tells them apart.

## Honest limits

- **Voice match is a prototype, not bank-grade biometrics.** It tells clearly different voices apart and is fine for a live demo, but a recording or a good imitation could fool it. A real product would use a certified speaker-verification service and liveness checks, and would keep the code or Face ID as the real authorisation.
- **Speech goes to the browser's speech service.** Chrome sends microphone audio to Google to turn it into text, so a spoken code passes through that service too. A production version would recognise the code on the device.
- **The Help Centre reading was not tested against the live wise.com.** The build environment had no access to it, so it was tested against a stand-in page. If the page can't be read, the app falls back to its own short summary and links the article title.
- **Translations** were written carefully but have not been checked by native speakers.
- The fees, rates and recipients are made up.
