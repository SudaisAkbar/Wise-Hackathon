import test from 'node:test';
import assert from 'node:assert/strict';
import { spokenCode, spokenDigits, spokenAccount, spellOut, hasSpokenDigits } from '../../shared/spoken.js';

test('a spoken 4-digit code in every language and common transcript shapes', () => {
  const cases = {
    '1234': '1234', '12 34': '1234', 'one two three four': '1234', 'twelve thirty four': '1234',
    'my code is 1 2 3 4': '1234', 'один два три четыре': '1234', "чотири п'ять шість сім": '4567',
    'üks kaks kolm neli': '1234', 'ایک دو تین چار': '1234', 'एक दो तीन चार': '1234', 'oh one two three': '0123',
    '١٢٣٤': '1234', '१२३४': '1234'
  };
  for (const [said, code] of Object.entries(cases)) assert.equal(spokenCode(said), code, said);
});

test('anything but exactly four digits is not a code', () => {
  assert.equal(spokenCode('one two three'), null);
  assert.equal(spokenCode('12345'), null);
  assert.equal(spokenCode('yes please'), null);
  assert.equal(spokenDigits('one two three'), '123');
  assert.equal(hasSpokenDigits('go back'), false);
  assert.equal(hasSpokenDigits('nine'), true);
});

test('spoken account numbers become IBAN-like strings and are read back in groups', () => {
  assert.equal(spokenAccount('EE38 2200 2210 2014 5685'), 'EE382200221020145685');
  assert.equal(spokenAccount('e e three eight two two zero zero'), 'EE382200');
  assert.equal(spokenAccount('PL61 1090 1014 0000 0712 1981 2874'), 'PL61109010140000071219812874');
  assert.equal(spellOut('EE382200'), 'E E 3 8, 2 2 0 0');
});
