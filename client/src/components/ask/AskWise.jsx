// Ask Wise: the voice screen from the design (screens 03-08), made fully
// hands-free. After every reply the assistant speaks, then listens again on
// its own. Silence twice puts it on standby; "Hey Wise" brings it back.
// Another person's voice pauses it; only the owner saying "Hey Wise" resumes.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { api } from '../../api.js';
import { engine } from '../../voice/engine.js';
import { strings, directionOf } from '../../lib/strings.js';
import { pick } from '../../lib/format.js';
import { spokenCode, spokenDigits, hasSpokenDigits } from '../../../../shared/spoken.js';
import { ChevronDown, Close, Check, Shield } from '../Icons.jsx';
import {
  AddView, AnswerCard, CheckView, CodeView, EnrollView, ListeningView, MicBlock, PausedView, ReadyView, SentScreen,
  ThinkingView, TypeBar, VoiceChip, useSeconds
} from './Views.jsx';

const newSessionId = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Screens that keep their layout while listening (a small status line shows it).
const STICKY = new Set(['review', 'ready', 'code', 'sent', 'enroll', 'paused', 'standby', 'not_owner', 'add', 'scam']);

// Answers that stay on screen while it listens for the next thing.
const HOLD = new Set(['people', 'choices', 'recipient', 'balance', 'status', 'help', 'added', 'offer_add', 'enrolled']);

const ERROR_KEYS = { blocked: 'micBlocked', unsupported: 'sttUnsupported', network: 'sttNetwork' };

function Wave({ color }) {
  return (
    <svg className="wave" width="390" height="80" viewBox="0 0 390 80" aria-hidden="true" preserveAspectRatio="none">
      <g fill={color}>
        <rect x="0" y="0" width="390" height="20" />
        <circle cx="8" cy="14" r="30" />
        <circle cx="64" cy="24" r="34" />
        <circle cx="126" cy="20" r="32" />
        <circle cx="190" cy="28" r="38" />
        <circle cx="254" cy="20" r="32" />
        <circle cx="316" cy="24" r="34" />
        <circle cx="380" cy="14" r="32" />
      </g>
    </svg>
  );
}

function headlineFor(t, { type, phase, sticky, name }) {
  if (phase === 'listening' && !sticky && !HOLD.has(type)) return t('hSpeak');
  if (phase === 'thinking' && !sticky) return t('hGot');
  switch (type) {
    case 'review': return t('hCheck');
    case 'ready': return t('hReady');
    case 'code': return t('hCode');
    case 'people': case 'choices': return t('hWho');
    case 'recipient': return t('hHowMuch');
    case 'balance': return t('hBalance');
    case 'status': return t('hStatus');
    case 'help': return t('hHelp');
    case 'scam': return t('hScam');
    case 'paused': return t('hPaused');
    case 'standby': return t('hStandby');
    case 'not_owner': return t('hOwner');
    case 'enroll': return t('hEnroll');
    case 'enrolled': return t('hAllSet');
    case 'add': return t('hAdd');
    case 'added': return t('hAdded');
    case 'offer_add': return t('hNewPerson');
    case 'bye': return t('hBye');
    default: return t('hGreet', { name });
  }
}

export default function AskWise({ data, lang, onLang, opening, handsFree, onClose, onChanged }) {
  const t = useMemo(() => strings(lang), [lang]);
  const voice = useSyncExternalStore(engine.subscribe, engine.getState);
  const language = data.languages.find((item) => item.code === lang) || data.languages[0];

  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState('thinking'); // idle | listening | thinking | speaking | wake
  const [interim, setInterim] = useState('');
  const [words, setWords] = useState('');
  const [notice, setNotice] = useState('');
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');
  const [spokenCount, setSpokenCount] = useState(0);
  const [langOpen, setLangOpen] = useState(false);

  const sessionId = useRef(newSessionId());
  const alive = useRef(true);
  const turnRef = useRef(0);
  const resultRef = useRef(null);
  const langRef = useRef(lang);
  const handsFreeRef = useRef(handsFree);
  const silentRef = useRef(0);
  const toldNoVoice = useRef(false);
  const pressRef = useRef({ at: 0, active: false });
  langRef.current = lang;
  handsFreeRef.current = handsFree;
  const seconds = useSeconds(phase === 'listening');
  const secondsRef = useRef(0);
  if (phase === 'listening') secondsRef.current = seconds;

  const sttLocale = () => (data.languages.find((item) => item.code === langRef.current) || data.languages[0]).stt;

  // ---- the hands-free loop -----------------------------------------------------------

  const runTurnRef = useRef(null);
  const listenRef = useRef(null);

  const waitWake = useCallback(async (turn) => {
    setPhase('wake');
    const heard = await engine.waitForWake({ locale: 'en-US' });
    if (!alive.current || turn !== turnRef.current || !heard) return;
    runTurnRef.current({ event: { type: 'wake' }, input: 'voice', voice: { embedding: heard.embedding } }, { words: heard.text });
  }, []);

  const next = useCallback((listen, turn) => {
    if (!handsFreeRef.current || !engine.state.enabled || !engine.state.canListen || !listen) {
      setPhase('idle');
      return;
    }
    if (listen === 'wake') waitWake(turn);
    else listenRef.current(listen, turn);
  }, [waitWake]);

  const runTurn = useCallback(async (payload, { words: said } = {}) => {
    const turn = ++turnRef.current;
    engine.stopAll();
    setPhase('thinking');
    setNotice('');
    setLangOpen(false);
    if (said !== undefined) setWords(said);

    let reply;
    try {
      reply = await api.assistant({ sessionId: sessionId.current, lang: langRef.current, ...payload });
    } catch {
      if (alive.current && turn === turnRef.current) {
        setPhase('idle');
        setNotice(strings(langRef.current)('offline'));
      }
      return;
    }
    if (!alive.current || turn !== turnRef.current) return;

    resultRef.current = reply;
    setResult(reply);
    if (reply.ui?.type !== 'code') {
      setCode('');
      setSpokenCount(0);
    } else if (reply.ui.wrong || reply.reply.key !== 'askCode') {
      setCode('');
      setSpokenCount(0);
    }
    onChanged();

    if (engine.state.canSpeak) {
      setPhase('speaking');
      const { spoken, cancelled } = await engine.speak(reply.reply.speech);
      if (!alive.current || turn !== turnRef.current || cancelled) return;
      if (!spoken && !toldNoVoice.current) {
        toldNoVoice.current = true;
        setNotice(strings(langRef.current)(engine.state.ttsBlocked ? 'ttsBlocked' : 'noVoice'));
      }
    }
    if (reply.close) {
      onClose({ goodbye: true });
      return;
    }
    next(reply.listen, turn);
  }, [next, onChanged, onClose]);
  runTurnRef.current = runTurn;

  const listen = useCallback(async (kind, turn = turnRef.current) => {
    setPhase('listening');
    setInterim('');
    const heard = await engine.listenOnce({
      locale: sttLocale(),
      onInterim: (text) => {
        if (!alive.current) return;
        if (kind === 'code') setSpokenCount(Math.min(4, spokenDigits(text).length));
        else setInterim(text);
      }
    });
    if (!alive.current || turn !== turnRef.current) return;

    if (heard.error) {
      if (heard.error === 'aborted') return;
      if (heard.error === 'no-speech') {
        silentRef.current += 1;
        if (handsFreeRef.current && silentRef.current >= 2 && kind !== 'enroll') {
          silentRef.current = 0;
          runTurnRef.current({ event: { type: 'standby' } });
          return;
        }
        if (handsFreeRef.current) {
          listenRef.current(kind, turn);
          return;
        }
        setPhase('idle');
        setNotice(strings(langRef.current)('noSpeech'));
        return;
      }
      setPhase('idle');
      setNotice(strings(langRef.current)(ERROR_KEYS[heard.error] || 'sttNetwork'));
      return;
    }

    silentRef.current = 0;
    const voicePrint = { embedding: heard.embedding };
    if (kind === 'enroll') {
      runTurnRef.current({ event: { type: 'enroll_sample' }, input: 'voice', voice: voicePrint }, { words: heard.text });
    } else if (kind === 'code' && hasSpokenDigits(heard.text)) {
      // The code goes only to the confirm step, never to the language model.
      setSpokenCount(Math.min(4, spokenDigits(heard.text).length));
      runTurnRef.current({ event: { type: 'code', code: spokenCode(heard.text) || '', method: 'voice' }, input: 'voice', voice: voicePrint }, { words: '••••' });
    } else if (kind === 'wake-tap') {
      runTurnRef.current({ event: { type: 'wake' }, input: 'voice', voice: voicePrint }, { words: heard.text });
    } else {
      runTurnRef.current({ text: heard.text, input: 'voice', voice: voicePrint }, { words: heard.text });
    }
  }, []);
  listenRef.current = listen;

  // ---- opening and closing ------------------------------------------------------------

  const openingKey = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      engine.stopAll();
    };
  }, []);

  useEffect(() => {
    if (!opening || opening.key === openingKey.current) return;
    openingKey.current = opening.key;
    if (opening.wake) runTurn({ event: { type: 'wake' }, input: 'voice', voice: { embedding: opening.wake.embedding } }, { words: opening.wake.text });
    else if (opening.text) runTurn({ text: opening.text, input: 'typed' }, { words: opening.text });
    else runTurn({ event: opening.event || { type: 'start' }, input: 'tap' });
  }, [opening, runTurn]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose({});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ---- actions --------------------------------------------------------------------------

  const event = (payload) => runTurn({ event: payload, input: 'tap' });
  const ui = result?.ui || { type: 'none' };
  const type = result?.close ? 'bye' : ui.type;
  const listenKind = () => {
    const kind = resultRef.current?.listen;
    if (kind === 'wake') return 'wake-tap';
    return kind || 'command';
  };

  const startManual = () => {
    turnRef.current += 1;
    engine.stopAll();
    listen(listenKind(), turnRef.current);
  };

  const onMicPress = (pressEvent, keyboard) => {
    if (phase === 'listening') {
      engine.finishListening();
      return;
    }
    pressRef.current = { at: Date.now(), active: !keyboard };
    startManual();
  };
  const onMicRelease = () => {
    // Held down: release ends the utterance (hold to talk). A quick tap keeps listening.
    if (pressRef.current.active && Date.now() - pressRef.current.at > 450) engine.finishListening();
    pressRef.current.active = false;
  };

  const replay = () => {
    if (!result) return;
    turnRef.current += 1;
    const turn = turnRef.current;
    engine.stopAll();
    setPhase('speaking');
    engine.speak(result.reply.speech).then(({ cancelled }) => {
      if (!cancelled && alive.current && turn === turnRef.current) next(result.listen, turn);
    });
  };

  const changeLanguage = (code_) => {
    setLangOpen(false);
    if (code_ === lang) return;
    langRef.current = code_;
    onLang(code_);
    toldNoVoice.current = false;
    sessionId.current = newSessionId();
    runTurn({ event: { type: 'start' }, input: 'tap' });
  };

  const pressDigit = (digit) => {
    if (code.length >= 4) return;
    turnRef.current += 1;
    engine.stopAll();
    setPhase('idle');
    const nextCode = code + digit;
    setCode(nextCode);
    if (nextCode.length === 4) runTurn({ event: { type: 'code', code: nextCode, method: 'keypad' }, input: 'tap' }, { words: '••••' });
  };

  const hint = (() => {
    if (phase !== 'listening') return '';
    if (type === 'review') return t('say2', { a: t('wYes'), b: t('wChange') });
    if (type === 'ready') return t('say2', { a: t('wSend'), b: t('wBack') });
    if (type === 'code') return t('listeningCode');
    if (type === 'sent') return t('say1', { a: t('wDone') });
    if (type === 'add' && result?.stage === 'add_confirm') return t('say2', { a: t('wYes'), b: t('wNo') });
    return '';
  })();
  const chip = <VoiceChip phase={phase} hint={hint} level={voice.level} t={t} onTap={phase === 'listening' ? () => engine.finishListening() : startManual} />;
  const sticky = STICKY.has(type);
  const name = pick(data.profile.firstName, lang);
  const lines = headlineFor(t, { type, phase, sticky, name });
  const dir = directionOf(lang);
  const theme = type === 'scam' ? 'danger' : ['paused', 'standby', 'not_owner'].includes(type) ? 'quiet' : 'green';
  const waveColor = { green: '#9FE870', danger: '#FFC7BD', quiet: '#E8EBE6' }[theme];

  const micBlock = (
    <div className="footer">
      <MicBlock phase={phase === 'wake' ? 'idle' : phase} handsFree={handsFree} level={voice.level} t={t} onPress={onMicPress} onRelease={onMicRelease} />
      <TypeBar t={t} value={typed} onChange={setTyped} disabled={phase === 'thinking'} onSubmit={(text) => { setTyped(''); runTurn({ text, input: 'typed' }, { words: text }); }} />
    </div>
  );

  let body;
  if (type === 'sent' && ui.transfer) {
    body = null;
  } else if (phase === 'listening' && !sticky && !HOLD.has(type)) {
    body = <ListeningView t={t} interim={interim}>{micBlock}</ListeningView>;
  } else if (phase === 'thinking' && !sticky && words) {
    body = <ThinkingView t={t} words={words} seconds={secondsRef.current || 3}>{micBlock}</ThinkingView>;
  } else if (type === 'review') {
    body = <CheckView t={t} lang={lang} transfer={ui.transfer} said={ui.said} onListen={replay} onChange={() => event({ type: 'change' })} onYes={() => event({ type: 'continue' })} chip={chip} />;
  } else if (type === 'ready') {
    body = <ReadyView t={t} lang={lang} transfer={ui.transfer} onSend={() => event({ type: 'continue' })} onBack={() => event({ type: 'go_back' })} chip={chip} />;
  } else if (type === 'code') {
    body = (
      <CodeView
        t={t} lang={lang} transfer={ui.transfer} entered={Math.max(code.length, spokenCount)}
        status={phase === 'thinking' ? 'checking' : ''} wrongLeft={ui.wrong ? ui.attemptsLeft : 0}
        onDigit={pressDigit} onDelete={() => setCode((value) => value.slice(0, -1))} onCancel={() => event({ type: 'cancel' })} chip={chip}
      />
    );
  } else if (type === 'enroll') {
    body = <EnrollView t={t} ui={ui} chip={null}>{micBlock}</EnrollView>;
  } else if (['paused', 'standby', 'not_owner'].includes(type)) {
    body = <PausedView t={t} text={result.reply.text} type={type} phase={phase} level={voice.level} onBack={() => runTurn({ text: 'hey wise', input: 'typed' }, { words: '' })} />;
  } else if (type === 'add') {
    body = (
      <AddView t={t} lang={lang} ui={ui} stage={result.stage} onConfirm={() => event({ type: 'add_confirm' })} onCancel={() => event({ type: 'cancel' })} chip={<div className="spaced">{chip}</div>}>
        {micBlock}
      </AddView>
    );
  } else {
    body = (
      <>
        <div className="scroll">
          {result && (
            <div className="answer wv-msg">
              <div className="row-between row-top">
                <p className="reply-text" dir="auto">{result.reply.text}</p>
              </div>
              <AnswerCard t={t} lang={lang} ui={ui} data={data} onPick={(person) => event({ type: 'select_recipient', recipientId: person.id })} onEvent={event} />
            </div>
          )}
        </div>
        {micBlock}
      </>
    );
  }

  if (type === 'sent' && ui.transfer) {
    return (
      <div className="ask ask-sent" role="dialog" aria-modal="true" aria-label={t('askWise')} lang={lang}>
        <SentScreen t={t} lang={lang} transfer={ui.transfer} onDone={() => onClose({})} chip={handsFree ? chip : null} />
      </div>
    );
  }

  return (
    <div className={`ask ask-${theme}`} role="dialog" aria-modal="true" aria-label={t('askWise')} lang={lang}>
      <div className="ask-head">
        <div className="ask-head-row">
          <div className="ask-title-wrap">
            <p className="ask-title">{t('askWise')}</p>
            {data.voice?.active && (
              <span className={`voice-badge${data.voice.last?.decision === 'match' ? ' voice-badge-ok' : ''}`} title={t('voiceOn')} role="img" aria-label={t('voiceOn')}>
                <Shield size={15} width={2.4} />
              </span>
            )}
          </div>
          <div className="ask-head-actions">
            <button type="button" className="lang-btn" aria-haspopup="true" aria-expanded={langOpen} onClick={() => setLangOpen((open) => !open)}>
              {language.label}
              <ChevronDown size={18} color="#0E0F0C" />
            </button>
            <button type="button" className="close-btn" aria-label={t('closeAsk')} onClick={() => onClose({})}>
              <Close size={20} color="#0E0F0C" width={2.2} />
            </button>
          </div>
          {langOpen && (
            <div className="lang-menu wv-msg" role="menu">
              <p>{t('speakIn')}</p>
              {data.languages.map((item) => (
                <button key={item.code} type="button" role="menuitemradio" aria-checked={item.code === lang} onClick={() => changeLanguage(item.code)}>
                  <span className="lang-code">{item.short}</span>
                  <span className={`lang-name t-${item.code}`}>{item.label}</span>
                  {item.code === lang && <Check size={20} width={2.4} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <h1 key={lines.join('|')} className={`wv-display wv-in t-${lang}`} dir={dir}>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </h1>
      </div>
      <Wave color={waveColor} />
      <div className={`ask-body t-${lang}`} dir={dir}>
        {body}
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>
    </div>
  );
}
