import { EyeClosed, Insights, Plus, Upload, Chevron, Bank, ArrowUp, Card, Euro } from '../Icons.jsx';
import { balance as fmtBalance, code, symbol, shortDate, pick } from '../../lib/format.js';

export function activityRows(data) {
  const transfers = data.transfers.map((transfer) => ({
    id: transfer.id,
    kind: 'transfer',
    title: pick(transfer.recipient?.name, 'en'),
    sub: `${transfer.status === 'completed' ? 'Sent' : 'Sending'} · ${shortDate(transfer.confirmedAt || transfer.createdAt)}${transfer.confirmedBy === 'voice' ? ' · by voice' : ''}`,
    amount: code(transfer.sourceAmount, transfer.sourceCurrency),
    second: transfer.targetCurrency !== transfer.sourceCurrency ? code(transfer.targetAmount, transfer.targetCurrency) : null,
    at: transfer.confirmedAt || transfer.createdAt
  }));
  const cards = (data.cardPayments || []).map((payment) => ({
    id: payment.id,
    kind: 'card',
    title: payment.merchant,
    sub: `Card payment · ${shortDate(payment.createdAt)}`,
    amount: code(payment.amount, payment.currency),
    second: null,
    at: payment.createdAt
  }));
  return [...transfers, ...cards].sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function ActivityRow({ row }) {
  return (
    <div className="tx">
      <span className="tx-icon">{row.kind === 'card' ? <Card size={22} /> : <ArrowUp size={22} width={2.2} />}</span>
      <span className="tx-main">
        <span className="tx-title">{row.title}</span>
        <span className="tx-sub">{row.sub}</span>
      </span>
      <span className="tx-end">
        <span className="tx-amount">{row.amount}</span>
        {row.second && <span className="tx-sub">{row.second}</span>}
      </span>
    </div>
  );
}

export default function Home({ data, onAsk, onSeeAll, onProfile }) {
  const rows = activityRows(data).slice(0, 3);
  return (
    <div className="home">
      <div className="home-top">
        <button type="button" className="profile" aria-label={`Profile, ${data.profile.fullName}`} onClick={onProfile}>
          {data.profile.initials}
        </button>
        <div className="home-top-actions">
          <button type="button" className="pill pill-green">Earn €100</button>
          <button type="button" className="pill pill-soft pill-icon">Do more<Plus size={18} width={2.2} /></button>
        </div>
      </div>

      <div className="balance">
        <p className="balance-label">Total balance</p>
        <div className="balance-row">
          <p className="balance-amount">{fmtBalance(data.balance.amount, data.balance.currency)}</p>
          <button type="button" className="round-btn" aria-label="Hide balance"><EyeClosed size={18} /></button>
          <button type="button" className="round-btn" aria-label="Insights"><Insights size={18} /></button>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="pill pill-green pill-lg" onClick={() => onAsk({ event: { type: 'intent', intent: 'send_money' } })}>Send</button>
        <button type="button" className="pill pill-soft pill-lg">Add money</button>
        <button type="button" className="pill pill-soft pill-lg">Request</button>
        <button type="button" className="pill pill-soft pill-lg pill-icon pill-icon-left"><Upload size={20} />Upload</button>
      </div>

      <div className="accounts">
        <div className="account">
          <div className="account-top" />
          <div className="account-notch" />
          <div className="account-body">
            <div className="account-row">
              <p className="account-title">Main account</p>
              <Chevron size={22} color="#454745" />
            </div>
            <div className="account-currency">
              <Euro size={26} />
              <p>{symbol(data.balance.amount, data.balance.currency)}</p>
              <Chevron size={22} color="#454745" />
            </div>
            <span className="grow" />
            <button type="button" className="pill pill-grey pill-icon pill-icon-left account-details"><Bank size={20} color="#0E0F0C" />Account details</button>
          </div>
        </div>
        <div className="account account-ghost"><div className="account-top" /></div>
      </div>
      <div className="dots"><span className="dot dot-on" /><span className="dot" /></div>

      <div className="section-head">
        <p className="section-title">Transactions</p>
        <button type="button" className="link-btn" onClick={onSeeAll}>See all</button>
      </div>
      <div className="tx-list">
        {rows.map((row) => <ActivityRow key={row.id} row={row} />)}
      </div>
    </div>
  );
}
