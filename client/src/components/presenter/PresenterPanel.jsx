import { useState, useSyncExternalStore } from 'react';
import { api } from '../../api.js';
import { engine } from '../../voice/engine.js';
import { SAMPLE_PHRASES, directionOf } from '../../lib/strings.js';
import { timeLabel } from '../../lib/format.js';
import { Reset, Shield, ShieldAlert, Mic, Check, People, Book, Pause } from '../Icons.jsx';

const ALERT_ICON = {
  scam_blocked: [ShieldAlert, 'stop'],
  voice_paused: [Pause, 'stop'],
  pin_locked: [ShieldAlert, 'stop'],
  recipient_added: [People, 'ask'],
  transfer_sent: [Check, 'ok'],
  voice_enrolled: [Shield, 'ok']
};

const MODE_TEXT = { off: 'Not listening', wake: 'Listening for “Hey Wise”', listen: 'Listening', speak: 'Speaking' };
const DECISION_TEXT = { match: 'Owner’s voice', mismatch: 'Different voice', uncertain: 'Not sure (too short or too close)' };

function Toggle({ checked, onChange, label, sub }) {
  return (
    <label className="toggle">
      <span>
        <span className="toggle-label">{label}</span>
        {sub && <span className="toggle-sub">{sub}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

// Shown beside the phone on wide screens (and from the profile button on a
// phone). It is a demo aid: the app is the phone.
export default function PresenterPanel({ data, lang, onLang, handsFree, onHandsFree, onAsk, onChanged, onEnable }) {
  const voice = useSyncExternalStore(engine.subscribe, engine.getState);
  const [busy, setBusy] = useState(false);
  const match = data.voice;
  const last = match.last;

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="presenter" aria-label="Presenter panel">
      <div className="p-head">
        <div>
          <h2>Presenter panel</h2>
          <p>For the demo only. The app is the phone.</p>
        </div>
        <button type="button" className="p-btn" disabled={busy} onClick={() => run(async () => { await api.resetDemo(); onChanged({ reset: true }); })}>
          <Reset size={18} /> Reset demo
        </button>
      </div>

      <section className="p-card">
        <h3><Mic size={20} /> Hands-free</h3>
        <Toggle checked={handsFree} onChange={onHandsFree} label="Hands-free voice" sub="Listens again after every reply, and for “Hey Wise” on the home screen." />
        <div className="p-status">
          <span className={`p-dot p-dot-${voice.mode}`} />
          <span>{voice.enabled ? MODE_TEXT[voice.mode] : 'Microphone off'}</span>
          <span className="p-level"><span style={{ width: `${Math.round(voice.level * 100)}%` }} /></span>
        </div>
        {!voice.enabled && (
          <button type="button" className="p-btn p-btn-green" onClick={onEnable}>Turn on the microphone</button>
        )}
        {voice.micError && <p className="p-warn">The microphone is {voice.micError === 'blocked' ? 'blocked in the browser settings' : 'not available'}.</p>}
        {!voice.canListen && <p className="p-warn">This browser has no speech recognition. Use Chrome or Edge.</p>}
        {voice.lastHeard && <p className="p-small">Last heard: “{voice.lastHeard}”</p>}
      </section>

      <section className="p-card">
        <h3><Shield size={20} /> Voice match</h3>
        <p className="p-small">
          {match.enrolled
            ? `Owner’s voice saved from ${match.samples} samples. Another voice pauses the assistant; money needs a clear match.`
            : 'Not set up yet. The first time Ask Wise opens, it asks the owner to repeat three short sentences.'}
        </p>
        {last && (
          <div className={`p-match p-match-${last.decision}`}>
            <b>{DECISION_TEXT[last.decision] || last.decision}</b>
            {last.score !== null && last.score !== undefined && (
              <span className="p-meter"><span style={{ width: `${Math.round(last.score * 100)}%` }} /></span>
            )}
            <span className="p-small">
              {last.purpose} · {timeLabel(last.at)}
              {last.distance !== null && last.distance !== undefined ? ` · distance ${last.distance} / limit ${last.threshold}` : ''}
            </span>
          </div>
        )}
        <Toggle checked={match.enabled} onChange={(enabled) => run(() => api.setVoice({ enabled }))} label="Only listen to the owner" />
        <div className="p-seg" role="group" aria-label="Sensitivity">
          {[[0.8, 'Relaxed'], [1, 'Normal'], [1.25, 'Strict']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={match.sensitivity === value} onClick={() => run(() => api.setVoice({ sensitivity: value }))}>{label}</button>
          ))}
        </div>
        <div className="p-row">
          <button type="button" className="p-btn" onClick={() => onAsk({ event: { type: 'enroll_start' } })}>{match.enrolled ? 'Teach the voice again' : 'Set up voice match'}</button>
          {match.enrolled && <button type="button" className="p-btn" onClick={() => run(() => api.forgetVoice())}>Forget voice</button>}
        </div>
      </section>

      <section className="p-card">
        <h3>Try saying</h3>
        <div className="p-seg p-seg-wrap" role="group" aria-label="Language">
          {data.languages.map((item) => (
            <button key={item.code} type="button" aria-pressed={lang === item.code} onClick={() => onLang(item.code)}>{item.label}</button>
          ))}
        </div>
        <ul className="p-phrases">
          {(SAMPLE_PHRASES[lang] || SAMPLE_PHRASES.en).map((phrase) => (
            <li key={phrase.text}>
              <button type="button" onClick={() => onAsk({ text: phrase.text })}>
                <span className={`p-phrase t-${lang}`} dir={directionOf(lang)}>{phrase.text}</span>
                <span className="p-small">{phrase.note}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="p-small">A click sends the sentence as typed text (no voice check). Code: {data.app.demoPin}.</p>
      </section>

      <section className="p-card">
        <h3><Book size={20} /> Understanding</h3>
        <p className="p-small">
          {data.ai.engine === 'claude'
            ? <>Speech is understood by <b>Claude</b> ({data.ai.model}).{data.ai.lastFailure ? ' The last call failed; built-in rules answered.' : ''}</>
            : <>Speech is understood by <b>built-in rules</b>. Add an Anthropic key to <code>.env</code> for Claude.</>}
        </p>
        <p className="p-small">
          Help Centre: {data.help.articles} Wise articles indexed. {data.help.live ? 'Article text is read live from wise.com' : 'Live reading is off'}
          {data.ai.engine === 'claude' ? ' and summarised by Claude.' : '; without Claude a general answer and the article link are given.'}
        </p>
        <div className="p-seg" role="group" aria-label="Most per voice transfer">
          {[100, 300, 500].map((limit) => (
            <button key={limit} type="button" aria-pressed={data.settings.voiceLimit === limit} onClick={() => run(() => api.setVoiceLimit(limit))}>€{limit} per voice transfer</button>
          ))}
        </div>
      </section>

      <section className="p-card">
        <h3><People size={20} /> Messages to {data.helper.name.en} (family helper)</h3>
        <ul className="p-alerts">
          {data.alerts.slice(0, 8).map((alert) => {
            const [Icon, tone] = ALERT_ICON[alert.type] || [Check, 'plain'];
            return (
              <li key={alert.id} className={`p-alert p-alert-${tone}`}>
                <span className="p-alert-icon"><Icon size={18} /></span>
                <span>
                  <b>{alert.title}</b>
                  <span className="p-small">{alert.detail}</span>
                  <span className="p-small">{timeLabel(alert.createdAt)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
