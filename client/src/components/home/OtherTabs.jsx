import Avatar from '../Avatar.jsx';
import { Mic } from '../Icons.jsx';
import { ActivityRow, activityRows } from './Home.jsx';
import { pick } from '../../lib/format.js';

export function Recipients({ data, onAsk }) {
  return (
    <div className="page">
      <h1 className="page-title">Recipients</h1>
      <button type="button" className="voice-add wv-btn" onClick={() => onAsk({ event: { type: 'intent', intent: 'add_recipient' } })}>
        <span className="voice-add-icon"><Mic size={22} width={2.2} /></span>
        <span>
          <span className="voice-add-title">Add a recipient by voice</span>
          <span className="voice-add-sub">Or say “Hey Wise, add a new recipient”</span>
        </span>
      </button>
      <div className="list">
        {data.recipients.map((person) => (
          <button key={person.id} type="button" className="list-row" onClick={() => onAsk({ event: { type: 'select_recipient', recipientId: person.id } })}>
            <Avatar person={person} size={48} />
            <span className="tx-main">
              <span className="tx-title">{pick(person.name, 'en')}</span>
              <span className="tx-sub">{pick(person.relation, 'en')} · {person.bank || person.country} {person.accountHint}</span>
            </span>
            {person.isNew && <span className="badge-new">New</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Payments({ data }) {
  return (
    <div className="page">
      <h1 className="page-title">Payments</h1>
      <div className="tx-list">
        {activityRows(data).map((row) => <ActivityRow key={row.id} row={row} />)}
      </div>
    </div>
  );
}

export function Cards({ data }) {
  return (
    <div className="page">
      <h1 className="page-title">Cards</h1>
      <div className="wise-card" aria-label="Debit card ending 4410">
        <span className="wise-card-chip" />
        <span className="wise-card-name">{data.profile.fullName.toUpperCase()}</span>
        <span className="wise-card-number">•••• 4410</span>
      </div>
      <p className="muted">Ask “What should I do if my card is lost?” to hear the Help Centre answer.</p>
    </div>
  );
}
