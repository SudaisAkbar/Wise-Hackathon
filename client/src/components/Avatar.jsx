import { initials, pick } from '../lib/format.js';

// Initials on a soft colour with dark text, as in the design ("AK" on peach).
export default function Avatar({ person, size = 48 }) {
  const label = pick(person?.name, 'en');
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35), background: person?.color || '#FFC091' }}
    >
      {initials(label)}
    </span>
  );
}
