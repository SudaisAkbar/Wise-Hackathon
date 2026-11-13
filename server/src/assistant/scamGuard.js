// Scam guard. Older people are the main target of "someone told me to send
// money" fraud, so this check runs on every sentence before anything else and
// does not depend on the language model. If it fires, the assistant stops,
// nothing is drafted and the family helper is told.
import { normalize } from './text.js';

const PATTERNS = [
  // English
  { reason: 'Someone else is telling the user to send money', re: /(someone|somebody|a man|a woman|a person|a caller|they|he|she|the caller).{0,50}(told|asked|said|wants|instructed|is telling|is asking).{0,30}(send|transfer|pay|move|wire)/ },
  { reason: 'A caller claiming to be the bank, police or support', re: /(police|officer|bank|tax office|tax department|microsoft|tech support|customs|court).{0,40}(called|calling|phoned|rang|said|told|asked|on the phone)/ },
  { reason: 'A caller claiming to be the bank, police or support', re: /(call|phone call|called|phoned).{0,30}from.{0,20}(police|bank|tax|microsoft|support|customs|court)/ },
  { reason: '"Safe account" request', re: /safe account|secure account|holding account/ },
  { reason: 'Gift card payment', re: /gift ?card/ },
  { reason: 'Prize or lottery fee', re: /(won|win|winning).{0,25}(prize|lottery|jackpot)|lottery (fee|tax)/ },
  { reason: 'Asked to keep it secret', re: /(don'?t|do not|not to) tell (anyone|anybody|my family|my son|my daughter)|keep it (a )?secret/ },
  { reason: 'Threat of arrest or blocked account', re: /(arrest|arrested|jail|frozen|blocked|suspended).{0,40}(unless|if i don'?t|if i do not|otherwise)|(unless|otherwise).{0,40}(arrest|jail|frozen|blocked)/ },
  { reason: 'Remote access software', re: /anydesk|teamviewer|remote access/ },
  { reason: 'Investment or crypto pressure', re: /bitcoin|crypto|guaranteed (profit|return)|double my money/ },

  // Urdu and Hindi in Latin letters
  { reason: 'Someone else is telling the user to send money', re: /(kisi ne|koi|aadmi ne|admi ne|aurat ne|phone pe|phone par|call pe|call par).{0,50}(kaha|kah raha|keh raha|bola|bol raha|kehta).{0,40}(bhej|transfer)/ },
  { reason: 'A caller claiming to be the bank or police', re: /(police|bank wale|bank se|afsar).{0,40}(call|phone|kaha|bola|keh raha|bol raha)/ },
  { reason: 'Prize or lottery fee', re: /inaam|inam nikla|lottery|lotri/ },
  { reason: 'Asked to keep it secret', re: /kisi ko (mat|na|nahi) batana/ },
  { reason: '"Safe account" request', re: /mehfooz account|safe account/ },

  // Urdu
  { reason: 'Someone else is telling the user to send money', re: /(کسی نے|کوئی|آدمی نے|عورت نے|فون پر|کال پر).{0,50}(کہا|کہہ رہا|بولا|بول رہا|کہتا).{0,40}(بھیج|ٹرانسفر)/u },
  { reason: 'A caller claiming to be the bank or police', re: /پولیس|(بینک (سے|والے|والوں)).{0,40}(کال|فون)/u },
  { reason: 'Prize or lottery fee', re: /انعام|لاٹری/u },
  { reason: 'Asked to keep it secret', re: /کسی کو (مت|نہ|نہیں) بتانا/u },

  // Hindi
  { reason: 'Someone else is telling the user to send money', re: /(किसी ने|कोई|आदमी ने|औरत ने|फोन पर|कॉल पर).{0,50}(कहा|कह रहा|बोला|बोल रहा|कहता).{0,40}(भेज|ट्रांसफर)/u },
  { reason: 'A caller claiming to be the bank or police', re: /पुलिस|(बैंक (से|वाले|वालों)).{0,40}(कॉल|फोन)/u },
  { reason: 'Prize or lottery fee', re: /इनाम|लॉटरी/u },
  { reason: 'Asked to keep it secret', re: /किसी को (मत|न|नहीं) बताना/u },

  // Estonian
  { reason: 'Someone else is telling the user to send money', re: /(keegi|mees|naine|helistaja|mulle helistati).{0,50}(ütles|palus|käskis|nõudis).{0,40}(saat|saad|kand|kann|maks)/u },
  { reason: 'A caller claiming to be the bank or police', re: /politsei|pangast helista|pank helistas|helistati pangast/u },
  { reason: '"Safe account" request', re: /turvalis\S* konto|turvakonto/u },
  { reason: 'Prize or lottery fee', re: /võitsin|loterii|auhin/u },
  { reason: 'Asked to keep it secret', re: /ära räägi kellelegi|mitte kellelegi rääkida/u },
  { reason: 'Gift card payment', re: /kinkekaar/u },

  // Russian
  { reason: 'Someone else is telling the user to send money', re: /(кто-то|мужчина|женщина|звонивший|позвонили|позвонил|по телефону).{0,50}(сказал|сказали|попросил|попросили|велел|велели|требу).{0,40}(перевес|перевед|отправ|послат|перечисл)/u },
  { reason: 'A caller claiming to be the bank or police', re: /полици|из банка|служб\S* безопасности|сотрудник\S* банка|следовател/u },
  { reason: '"Safe account" request', re: /безопасн\S* счет|защищенн\S* счет/u },
  { reason: 'Prize or lottery fee', re: /выиграл|лотере|приз/u },
  { reason: 'Asked to keep it secret', re: /никому не (говори|рассказыва)/u },
  { reason: 'Gift card payment', re: /подарочн\S* карт/u }
];

export function detectScam(text) {
  const normalized = normalize(text);
  if (!normalized) return { hit: false, reason: null };
  for (const pattern of PATTERNS) {
    if (pattern.re.test(normalized)) return { hit: true, reason: pattern.reason };
  }
  return { hit: false, reason: null };
}
