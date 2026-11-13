// The body of each Ask Wise step, following the design screens 03-08.
import { useEffect, useState } from 'react';
import Avatar from '../Avatar.jsx';
import {
  Mic, MicSmall, Speaker, Shield, ShieldAlert, Lock, FaceId, Backspace, Check, Play, Pause, Phone, Book, Close
} from '../Icons.jsx';
import { code, fixed, symbol, pick } from '../../lib/format.js';

const DIGITS = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ']];

// ---- shared pieces -----------------------------------------------------------------

export function Bars({ level = 0, color = '#9FE870', live }) {
  const heights = [22, 40, 30, 44, 24];
  return (
    <div className="bars" aria-hidden="true">
      {heights.map((height, i) => (
        <span
          key={height + i}
          className={live ? 'bar' : 'bar wv-bar'}
          style={{
            height,
            background: color,
            animationDelay: `${[0, 160, 320, 80, 240][i]}ms`,
            transform: live ? `scaleY(${Math.max(0.25, Math.min(1, level * (0.7 + ((i * 37) % 5) / 8) + 0.2))})` : undefined
          }}
        />
      ))}
    </div>
  );
}

// The big round mic from screens 03 and 04.
export function MicBlock({ phase, handsFree, level, t, onPress, onRelease }) {
  const listening = phase === 'listening';
  const title = listening ? t('speakNow') : phase === 'thinking' ? t('thinking') : phase === 'speaking' ? t('speaking') : handsFree ? t('tapToTalk') : t('holdToTalk');
  const hint = listening ? (handsFree ? t('stopHint') : t('letGo')) : phase === 'idle' ? (handsFree ? t('tapHint') : t('holdHint')) : '';
  return (
    <div className="mic-block">
      <div className="mic-wrap">
        {listening && <span className="mic-ring wv-ring" />}
        <button
          type="button"
          className={`mic${listening ? ' mic-on' : ''}`}
          aria-label={title}
          onPointerDown={onPress}
          onPointerUp={onRelease}
          onPointerLeave={(event) => event.buttons && onRelease?.(event)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onPress?.(event, true);
            }
          }}
        >
          {listening ? <Bars level={level} live={level > 0.02} /> : <Mic size={48} width={2} />}
        </button>
      </div>
      <p className="mic-title">{title}</p>
      <p className="mic-hint">{hint}</p>
    </div>
  );
}

export function TypeBar({ t, value, onChange, onSubmit, disabled }) {
  return (
    <form
      className="type-bar"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <label htmlFor="ask-type" className="sr-only">{t('typeHere')}</label>
      <input id="ask-type" type="text" value={value} placeholder={t('typeHere')} onChange={(event) => onChange(event.target.value)} autoComplete="off" dir="auto" />
      <button type="submit" className="type-send" aria-label={t('sendMessage')} disabled={disabled || !value.trim()}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9FE870" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
      </button>
    </form>
  );
}

// A slim status line for screens that keep their layout while listening.
export function VoiceChip({ phase, hint, level, t, onTap }) {
  if (phase === 'idle' && !hint) return null;
  const text =
    phase === 'listening' ? hint || t('listeningNow') : phase === 'speaking' ? t('speaking') : phase === 'thinking' ? t('thinking') : phase === 'wake' ? t('waitingWake') : hint;
  return (
    <button type="button" className={`voice-chip voice-chip-${phase}`} onClick={onTap} aria-live="polite">
      <span className="voice-chip-icon">{phase === 'listening' ? <Bars level={level} color="#163300" live={level > 0.02} /> : <MicSmall size={18} width={2.4} />}</span>
      <span>{text}</span>
    </button>
  );
}

function Listen({ t, onClick }) {
  return (
    <button type="button" className="listen-btn" aria-label={t('listen')} onClick={onClick}>
      <Speaker size={18} />
    </button>
  );
}

// ---- screen 04: speaking, then sent ---------------------------------------------------

export function ListeningView({ t, interim, children }) {
  return (
    <>
      <div className="scroll">
        <p className="eyebrow">{t('yourWords')}</p>
        <p className="words" dir="auto">
          {interim}
          <span className="wv-caret" />
        </p>
      </div>
      {children}
    </>
  );
}

export function ThinkingView({ t, words, seconds, children }) {
  return (
    <>
      <div className="scroll">
        <div className="user-bubble wv-fly">
          <div className="user-bubble-top">
            <span className="play-dot"><Play size={14} /></span>
            <span className="mini-wave" aria-hidden="true">
              {[8, 14, 10, 18, 12, 20, 9, 15, 11, 17, 8, 13, 10, 16, 9].map((h, i) => <span key={i} style={{ height: h }} />)}
            </span>
            <span className="user-bubble-time">0:{String(Math.max(1, Math.min(59, seconds))).padStart(2, '0')}</span>
          </div>
          <p className="user-bubble-text" dir="auto">{words}</p>
          <span className="user-bubble-sent">{t('sentLabel')} <Check size={16} width={2.8} /></span>
        </div>
        <div className="checking wv-msg">
          <span className="wv-dots" aria-hidden="true"><span /><span /><span /></span>
          <span>{t('checking')}</span>
        </div>
      </div>
      {children}
    </>
  );
}

// ---- screen 05: Please check -------------------------------------------------------------

export function CheckView({ t, lang, transfer, said, onListen, onChange, onYes, chip }) {
  const person = transfer.recipient;
  const first = pick(person?.first, lang) || pick(person?.name, lang);
  return (
    <div className="stack">
      {said && (
        <div className="said-bubble">
          <MicSmall size={16} width={2.4} />
          <p dir="auto">{said}</p>
        </div>
      )}
      <div className="wv-msg stack-12" style={{ animationDelay: '150ms' }}>
        <div className="row-between">
          <p className="lead">{t('sendingTo', { first })}</p>
          <Listen t={t} onClick={onListen} />
        </div>
        <div className="card">
          <div className="person">
            <Avatar person={person} size={48} />
            <div>
              <p className="person-name">{pick(person?.name, lang)}</p>
              <p className="person-sub">{pick(person?.relation, lang)} · {person?.bank || person?.country} {person?.accountHint}</p>
            </div>
          </div>
          <div className="hr" />
          <div className="line"><span>{t('youSend')}</span><b>{code(transfer.sourceAmount, transfer.sourceCurrency, lang)}</b></div>
          <div className="line"><span>{t('gets', { first })}</span><b>{code(transfer.targetAmount, transfer.targetCurrency, lang)}</b></div>
          <div className="line line-small"><span>{t('arrives')}</span><b>{t('today')}</b></div>
        </div>
      </div>
      <span className="grow" />
      {chip}
      <p className="question wv-msg" style={{ animationDelay: '250ms' }}>{t('isRight')}</p>
      <div className="two-buttons wv-msg" style={{ animationDelay: '300ms' }}>
        <button type="button" className="big-btn big-btn-soft wv-btn" onClick={onChange}>{t('change')}</button>
        <button type="button" className="big-btn big-btn-green wv-btn" onClick={onYes}>{t('yesContinue')}</button>
      </div>
    </div>
  );
}

// ---- screen 06: Ready to send -------------------------------------------------------------

export function ReadyView({ t, lang, transfer, onSend, onBack, chip }) {
  const person = transfer.recipient;
  const first = pick(person?.first, lang) || pick(person?.name, lang);
  return (
    <div className="stack">
      <div className="card card-20 wv-msg">
        <div className="person">
          <Avatar person={person} size={52} />
          <div>
            <p className="person-sub">{t('to')}</p>
            <p className="person-name person-name-19">{pick(person?.name, lang)}</p>
          </div>
        </div>
        <div className="hr" />
        <div>
          <p className="person-sub">{t('youSend')}</p>
          <p className="amount-xl">{fixed(transfer.sourceAmount, transfer.sourceCurrency, lang)} <span>{transfer.sourceCurrency}</span></p>
          <p className="fee-note">{t('includesFee', { fee: code(transfer.fee, transfer.sourceCurrency, lang) })}</p>
        </div>
        <div>
          <p className="person-sub">{t('gets', { first })}</p>
          <p className="amount-l">{fixed(transfer.targetAmount, transfer.targetCurrency, lang)} <span>{transfer.targetCurrency}</span></p>
        </div>
        <div className="hr" />
        <div className="line line-16"><span>{t('arrives')}</span><b>{t('todayMinutes')}</b></div>
      </div>
      <div className={`trust wv-msg${transfer.sentBefore ? '' : ' trust-warn'}`} style={{ animationDelay: '120ms' }}>
        {transfer.sentBefore ? <Shield size={22} /> : <ShieldAlert size={22} color="#A8200D" />}
        <p>{transfer.sentBefore ? t('sentBefore', { first }) : t('firstTime', { first })}</p>
      </div>
      <span className="grow" />
      {chip}
      <button type="button" className="send-btn wv-btn" onClick={onSend}>
        <Lock size={22} width={2.2} />
        {t('sendAmount', { amount: code(transfer.sourceAmount, transfer.sourceCurrency, lang) })}
      </button>
      <button type="button" className="text-link" onClick={onBack}>{t('goBack')}</button>
    </div>
  );
}

// ---- screen 07: Enter your code -----------------------------------------------------------

export function CodeView({ t, lang, transfer, entered, status, wrongLeft, onDigit, onDelete, onCancel, chip }) {
  const person = transfer.recipient;
  const first = pick(person?.first, lang) || pick(person?.name, lang);
  const hint = status === 'checking' ? t('codeChecking') : wrongLeft ? t('codeWrong', { n: wrongLeft }) : t('codeSay');
  return (
    <div className="stack">
      <p className="code-to">
        {t('toSend', { amount: '\u0000', first: '\u0001' }).split(/(\u0000|\u0001)/).map((part, i) =>
          part === '\u0000' ? <b key={i}>{code(transfer.sourceAmount, transfer.sourceCurrency, lang)}</b> : part === '\u0001' ? <b key={i}>{first}</b> : part
        )}
      </p>
      <div className={`code-dots${wrongLeft ? ' wv-shake' : ''}`} role="status" aria-label={`${entered} of 4 numbers entered`} dir="ltr">
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < entered ? 'on' : ''} />)}
      </div>
      <p className={`code-hint${wrongLeft ? ' code-hint-wrong' : ''}`}>{hint}</p>
      <span className="grow" />
      {chip}
      <div className="keypad" dir="ltr">
        {DIGITS.map(([digit, letters]) => (
          <button key={digit} type="button" className="key wv-btn" aria-label={digit} onClick={() => onDigit(digit)}>
            {digit}
            {letters && <span>{letters}</span>}
          </button>
        ))}
        <button type="button" className="key key-quiet wv-btn" aria-label="Use Face ID instead" disabled>
          <FaceId size={22} />
          <span className="key-face">{t('faceId')}</span>
        </button>
        <button type="button" className="key wv-btn" aria-label="0" onClick={() => onDigit('0')}>0</button>
        <button type="button" className="key key-quiet wv-btn" aria-label="Delete" onClick={onDelete}>
          <Backspace size={30} />
        </button>
      </div>
      <button type="button" className="text-link text-link-small" onClick={onCancel}>{t('cancel')}</button>
    </div>
  );
}

// ---- screen 08: Money sent ------------------------------------------------------------------

export function SentScreen({ t, lang, transfer, onDone, chip }) {
  const [copied, setCopied] = useState(false);
  const person = transfer.recipient;
  const first = pick(person?.first, lang) || pick(person?.name, lang);
  const pronoun = person?.pronoun === 'she' ? t('she') : person?.pronoun === 'he' ? t('he') : first;
  const amount = code(transfer.sourceAmount, transfer.sourceCurrency, lang);
  const gets = code(transfer.targetAmount, transfer.targetCurrency, lang);
  const share = async () => {
    const text = `Wise transfer ${transfer.reference}: ${amount} to ${pick(person?.name, 'en')}, who gets ${gets}.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="sent-screen">
      <span className="grow" />
      <div className="sent-check wv-pop2"><Check size={56} width={2.6} /></div>
      <h1 className="wv-display sent-title wv-msg" style={{ animationDelay: '200ms' }}>{t('hSent')[0]}</h1>
      <p className="sent-text wv-msg" style={{ animationDelay: '280ms' }}>
        {t('youSent', { amount, first })}
        <br />
        {t('getsToday', { who: pronoun, amount: gets }).trim()}
      </p>
      <span className="grow grow-14" />
      {chip}
      <button type="button" className="done-btn wv-btn" onClick={onDone}>{t('done')}</button>
      <button type="button" className="outline-btn wv-btn" onClick={share}>{copied ? t('receiptCopied') : t('shareReceipt')}</button>
    </div>
  );
}

// ---- other steps ------------------------------------------------------------------------------

export function EnrollView({ t, ui, chip, children }) {
  return (
    <>
      <div className="scroll">
        <div className="steps" aria-label={t('stepOf', { n: ui.step + 1, total: ui.total })}>
          {Array.from({ length: ui.total }, (_, i) => <span key={i} className={i < ui.step ? 'done' : i === ui.step ? 'now' : ''} />)}
          <b>{t('stepOf', { n: ui.step + 1, total: ui.total })}</b>
        </div>
        <p className="eyebrow">{t('sayThis')}</p>
        <p className="phrase wv-msg" dir="auto">“{ui.phrase}”</p>
        {chip}
      </div>
      {children}
    </>
  );
}

export function PausedView({ t, text, type, phase, level, onBack }) {
  return (
    <>
      <div className="scroll center">
        <span className={`pause-icon${type === 'not_owner' ? ' pause-icon-stop' : ''}`}>
          {type === 'not_owner' ? <ShieldAlert size={44} color="#A8200D" /> : <Pause size={44} />}
        </span>
        <p className="reply-text" dir="auto">{text}</p>
        <div className="wake-wait">
          <span className={`wake-dot${phase === 'wake' ? ' wake-dot-live' : ''}`} />
          {t('waitingWake')}
          {phase === 'wake' && level > 0.05 && <Bars level={level} color="#163300" live />}
        </div>
      </div>
      <div className="footer">
        <button type="button" className="big-btn big-btn-green wv-btn" onClick={onBack}>{t('yesContinue')}</button>
      </div>
    </>
  );
}

export function AddView({ t, lang, ui, stage, onConfirm, onCancel, chip, children }) {
  const draft = ui.draft || {};
  const rows = [
    ['name', t('fName'), draft.name],
    ['relation', t('fRelation'), draft.relation],
    ['country', t('fCountry'), draft.country && draft.currency ? `${draft.country} · ${draft.currency}` : draft.country],
    ['account', t('fAccount'), draft.account]
  ];
  const current = { add_name: 'name', add_relation: 'relation', add_country: 'country', add_account: 'account' }[stage];
  const first = draft.name ? draft.name.split(' ')[0] : '';
  return (
    <>
      <div className="scroll">
        <div className="card">
          {rows.map(([key, label, value]) => (
            <div key={key} className={`field${current === key ? ' field-now' : ''}`}>
              <span>{label}</span>
              <b dir="auto">{value || (current === key ? '…' : '—')}</b>
            </div>
          ))}
        </div>
        {chip}
      </div>
      {stage === 'add_confirm' ? (
        <div className="footer two-buttons">
          <button type="button" className="big-btn big-btn-soft wv-btn" onClick={onCancel}>{t('cancel')}</button>
          <button type="button" className="big-btn big-btn-green wv-btn" onClick={onConfirm}>{t('add', { first })}</button>
        </div>
      ) : (
        children
      )}
    </>
  );
}

// Cards shown under a spoken answer.
export function AnswerCard({ t, lang, ui, data, onPick, onEvent }) {
  switch (ui?.type) {
    case 'people':
    case 'choices':
      return (
        <div className="choice-list">
          {ui.recipients.map((person) => (
            <button key={person.id} type="button" className="choice wv-btn" onClick={() => onPick(person)}>
              <Avatar person={person} size={48} />
              <span>
                <span className="person-name">{pick(person.name, lang)}</span>
                <span className="person-sub">{pick(person.relation, lang)} · {person.country}</span>
              </span>
            </button>
          ))}
        </div>
      );
    case 'recipient':
    case 'added':
      return (
        <div className="card">
          <div className="person">
            <Avatar person={ui.recipient} size={48} />
            <div>
              <p className="person-name">{pick(ui.recipient.name, lang)}</p>
              <p className="person-sub">{pick(ui.recipient.relation, lang)} · {ui.recipient.bank || ui.recipient.country} {ui.recipient.accountHint}</p>
            </div>
          </div>
        </div>
      );
    case 'balance':
      return (
        <div className="card">
          <p className="person-sub">{t('inAccount')}</p>
          <p className="amount-xl">{symbol(ui.balance.amount, ui.balance.currency, lang)}</p>
        </div>
      );
    case 'status':
      return (
        <div className="card">
          <div className="person">
            <Avatar person={ui.transfer.recipient} size={48} />
            <div className="grow">
              <p className="person-name">{pick(ui.transfer.recipient?.name, lang)}</p>
              <p className="person-sub">{code(ui.transfer.targetAmount, ui.transfer.targetCurrency, lang)}</p>
            </div>
            <span className={`status ${ui.transfer.status === 'completed' ? 'status-done' : 'status-moving'}`}>
              {ui.transfer.status === 'completed' ? t('arrived') : t('onItsWay')}
            </span>
          </div>
        </div>
      );
    case 'help':
      return ui.article ? (
        <a className="card article" href={ui.article.url} target="_blank" rel="noreferrer">
          <span className="article-icon"><Book size={22} /></span>
          <span>
            <span className="person-sub">{t('fromHelp')}</span>
            <span className="person-name">{ui.article.title}</span>
            <span className="article-link">{t('readArticle')}</span>
          </span>
        </a>
      ) : null;
    case 'scam':
      return (
        <div className="scam-card" role="alert">
          <ShieldAlert size={32} color="#FFFFFF" />
          <p>{t('nothingSent')}</p>
          <a className="big-btn big-btn-white" href={`tel:${ui.helper.phone.replace(/\s/g, '')}`}>
            <Phone size={20} color="#A8200D" /> {t('callHelper', { helper: pick(ui.helper.name, lang) })}
          </a>
          <p className="scam-phone" dir="ltr">{ui.helper.phone}</p>
        </div>
      );
    case 'offer_add':
      return (
        <div className="two-buttons">
          <button type="button" className="big-btn big-btn-soft wv-btn" onClick={() => onEvent({ type: 'cancel' })}><Close size={18} />{t('cancel')}</button>
          <button type="button" className="big-btn big-btn-green wv-btn" onClick={() => onEvent({ type: 'intent', intent: 'add_recipient' })}>{t('add', { first: ui.name })}</button>
        </div>
      );
    default:
      return null;
  }
}

export function useSeconds(running) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    setSeconds(0);
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, [running]);
  return seconds;
}
