import { Home, Card, People, Payments } from '../Icons.jsx';

const TABS = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'cards', label: 'Cards', Icon: Card },
  { id: 'recipients', label: 'Recipients', Icon: People },
  { id: 'payments', label: 'Payments', Icon: Payments }
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button key={id} type="button" className="nav-item" aria-current={active ? 'page' : undefined} onClick={() => onChange(id)}>
            <Icon size={26} color={active ? '#163300' : '#6A6C6A'} width={active ? 2.2 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
