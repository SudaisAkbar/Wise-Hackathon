// Everything the assistant says, in every language.
//
// The sentences are fixed templates on purpose: amounts, names and fees are
// filled in by the server from real data, so the language model can never
// invent or change a number that the user hears. (The one exception is a Help
// Centre answer, which Claude writes from the article text; it never contains
// account data.)
//
// Style: short sentences, plain words, no banking jargon, and every question
// says what to answer ("Say yes, or say change"), because there may be no
// screen the person is looking at.

const withRel = (p, sep = ', ') => (p.rel ? `${sep}${p.rel}` : '');

// Phrases read aloud while the assistant learns the user's voice.
export const ENROLL_PHRASES = {
  en: ['Hey Wise, this is my voice.', 'Please send money to my family.', 'My voice is my key.'],
  et: ['Hei Wise, see on minu hääl.', 'Palun saada raha minu perele.', 'Minu hääl on minu võti.'],
  ru: ['Хей Вайз, это мой голос.', 'Пожалуйста, отправь деньги моей семье.', 'Мой голос — мой ключ.'],
  uk: ['Хей Вайз, це мій голос.', 'Будь ласка, надішли гроші моїй родині.', 'Мій голос — мій ключ.'],
  ur: ['ہے وائز، یہ میری آواز ہے۔', 'میرے گھر والوں کو پیسے بھیجو۔', 'میری آواز میری چابی ہے۔'],
  hi: ['हे वाइज़, यह मेरी आवाज़ है।', 'मेरे परिवार को पैसे भेजो।', 'मेरी आवाज़ मेरी चाबी है।']
};

const en = {
  voiceUnclear: () => 'I could not recognise your voice clearly. Please say your code again, a little closer.',
  notOwner: () => 'Sorry, I can only take instructions from the account owner.',
  codeByHand: () => 'I still could not recognise your voice. You can type your code on the screen instead.',
  greeting: (p) => `Hi ${p.name}. What do you need? For example: send 50 euros to my grandson.`,
  askRecipient: () => 'Who do you want to send money to?',
  askAmount: (p) => `How much do you want to send to ${p.first}?`,
  askWhich: (p) => `You have more than one ${p.name}. Which one do you mean? Say the full name, or say first or second.`,
  review: (p) =>
    `Please check. You are sending ${p.send} to ${p.full}${withRel(p)}. ${p.first} gets ${p.get}. ` +
    `The fee is ${p.fee}. It arrives today. Is this right? Say yes, or say change.`,
  readyToSend: (p) =>
    `Ready to send ${p.send} to ${p.full}. ` +
    (p.sentBefore
      ? `You have sent money to ${p.first} before. `
      : `You have never sent money to ${p.first} before. Only continue if you know this person. `) +
    'Say send to continue, or say go back.',
  askCode: () => 'Please say your four-digit code. Just the numbers.',
  codeWrong: (p) => `That code is not right. You have ${p.n} ${p.n === 1 ? 'try' : 'tries'} left. Please say it again.`,
  codeUnclear: () => 'I need exactly four numbers. Please say your code again, one number at a time.',
  changeWhat: () => 'No problem. Nothing was sent. Tell me the new amount or the other person, or say cancel.',
  cancelled: () => 'Okay, I cancelled it. Nothing was sent.',
  sent: (p) =>
    `Money sent. You sent ${p.send} to ${p.first}. ${p.first} gets ${p.get} today. I have told ${p.helper}. ` +
    'Say done to finish, or tell me what else you need.',
  balance: (p) => `You have ${p.balance} in your account.`,
  statusNone: () => 'You have not sent any money yet.',
  statusCompleted: (p) => `Your last transfer has arrived. ${p.full} got ${p.get}.`,
  statusProcessing: (p) => `Your transfer of ${p.send} to ${p.full} is on its way. It should arrive today.`,
  unknownNamed: (p) =>
    `${p.name} is not one of your recipients yet. Do you want to add ${p.name}? Say add recipient, or say cancel.`,
  unknownUnnamed: () => 'I could not find that person among your recipients. These are the people I can send to.',
  overLimit: (p) =>
    `That is more than your limit of ${p.limit} for one voice transfer. Please say a smaller amount.`,
  insufficient: (p) => `You do not have enough money for that. You have ${p.balance}. Please say a smaller amount.`,
  currencyUnsupported: () => 'I send money from your euros. Please tell me the amount in euros.',
  scam: (p) =>
    'Please stop. This sounds like a scam. A real bank or police officer never asks you to move money. ' +
    `I have not sent anything, and I have told ${p.helper}. Please talk to ${p.helper} first.`,
  notUnderstood: () =>
    'Sorry, I did not understand. You can say: send 50 euros to my grandson. Or ask: how much money do I have?',
  help: () =>
    'I can send money to your recipients, add a new recipient, tell you your balance, check if money arrived, ' +
    'and answer questions from the Wise Help Centre. Just say it in your own words.',
  pinLocked: () => 'The code was wrong three times, so I cancelled this transfer. Nothing was sent.',
  amountInvalid: () => 'Please tell me the amount, for example 50 euros.',
  nothingToConfirm: () => 'There is nothing to confirm yet. Tell me who to send money to and how much.',
  paused: () =>
    'I heard a different voice, so I have paused. Nothing was sent. When you are ready, say Hey Wise.',
  welcomeBack: (p) => `Welcome back, ${p.name}.`,
  voiceRequired: () => 'I need to hear your voice first. Please say Hey Wise.',
  enrollIntro: (p) =>
    `Before we start, let me learn your voice, so only you can send money. Please repeat after me: ${p.phrase}`,
  enrollNext: (p) => `Thank you. Now say: ${p.phrase}`,
  enrollRetry: (p) => `I could not hear that clearly. Please say it again: ${p.phrase}`,
  enrollDone: () => 'Thank you. I know your voice now, and I will only listen to you. What do you need?',
  goodbye: (p) => `Goodbye, ${p.name}. Say Hey Wise whenever you need me.`,
  standby: () => 'I will wait. Say Hey Wise when you need me.',
  goneBack: () => 'Okay, let us check it again.',
  addAskName: () => 'Let us add a new recipient. What is their full name?',
  addAskRelation: (p) => `How do you know ${p.name}? For example: grandson, neighbour or friend.`,
  addAskCountry: (p) => `Which country is ${p.first}'s bank in?`,
  addCountryUnknown: (p) => `I can add banks in ${p.countries}. Which one is it?`,
  addAskAccount: (p) => `Please say ${p.first}'s account number, slowly, a few characters at a time.`,
  addAccountInvalid: () => 'I did not catch a full account number. Please say it again, slowly.',
  addConfirm: (p) =>
    `Please check. Name: ${p.name}. ${p.relation}. Bank in ${p.country}. Account number: ${p.spelled}. ` +
    `Shall I add ${p.first}? Say yes, or say no.`,
  addDone: (p) => `Done. ${p.name} is now one of your recipients, and I have told ${p.helper}. To send money, just say how much.`,
  addCancelled: () => 'Okay, I did not add anyone.',
  helpArticle: (p) => `The Wise Help Centre has an article about this: ${p.title}. I have put it on your screen.`,
  helpNothing: () =>
    'I could not find that in the Wise Help Centre. You can ask me about fees, transfer times, cancelling or limits.',
  helpTopic_fees: () =>
    'In general, the fee depends on the currencies and the amount. Before you send, you always see the exact fee and what the other person gets.',
  helpTopic_speed: () =>
    'In general, many transfers arrive within seconds or the same day. Some take longer, for example because of bank holidays or extra checks. You see an estimate before you send.',
  helpTopic_cancel: () =>
    'In general, you can cancel a transfer until the money has been paid out. Once it has arrived, it cannot be cancelled.',
  helpTopic_limits: () =>
    'In general, there are limits on how much you can send, and they depend on your country and the currency. Large transfers can need extra documents.',
  helpTopic_recipients: () =>
    'You can add a recipient by saying add recipient, and see them all in the Recipients tab. Always check the bank details before you send.',
  helpTopic_card: () =>
    'If your card is lost or stolen, freeze it in the app straight away, and then order a new one.',
  helpTopic_scam: () =>
    'Wise will never ask you to move money to a safe account. If someone pressures you to send money, stop and talk to someone you trust.',
  helpTopic_status: () =>
    'You can see every transfer and whether it has arrived in the Payments tab. You can also ask me: did my money arrive?'
};

const et = {
  voiceUnclear: () => 'Ma ei tundnud teie häält selgelt ära. Palun öelge kood uuesti, natuke lähemalt.',
  notOwner: () => 'Vabandust, ma võtan juhiseid ainult konto omanikult.',
  codeByHand: () => 'Ma ei tundnud teie häält ikka ära. Võite koodi ekraanil sisestada.',
  greeting: (p) => `Tere, ${p.name}. Mida te vajate? Näiteks: „Saada lapselapsele 50 eurot.“`,
  askRecipient: () => 'Kellele soovite raha saata?',
  askAmount: (p) => `Saaja on ${p.first}. Kui palju soovite saata?`,
  askWhich: (p) => `Teil on mitu inimest nimega ${p.name}. Keda neist te mõtlete? Öelge täisnimi või „esimene“ või „teine“.`,
  review: (p) =>
    `Palun kontrollige. Saaja on ${p.full}${withRel(p)}. Te saadate ${p.send}. ${p.first} saab ${p.get}. ` +
    `Teenustasu on ${p.fee}. Raha jõuab kohale täna. Kas see on õige? Öelge „jah“ või „muuda“.`,
  readyToSend: (p) =>
    `Valmis saatma ${p.send}. Saaja on ${p.full}. ` +
    (p.sentBefore
      ? `Olete sellele inimesele varem raha saatnud. `
      : `Te ei ole sellele inimesele varem raha saatnud. Jätkake ainult siis, kui tunnete teda. `) +
    'Jätkamiseks öelge „saada“, tagasi minekuks „tagasi“.',
  askCode: () => 'Palun öelge oma neljakohaline kood. Ainult numbrid.',
  codeWrong: (p) => `See kood ei ole õige. Katseid jäänud: ${p.n}. Palun öelge uuesti.`,
  codeUnclear: () => 'Mul on vaja täpselt nelja numbrit. Palun öelge kood uuesti, üks number korraga.',
  changeWhat: () => 'Pole probleemi. Midagi ei saadetud. Öelge uus summa või teine inimene või öelge „tühista“.',
  cancelled: () => 'Hästi, tühistatud. Midagi ei saadetud.',
  sent: (p) =>
    `Raha saadetud. Te saatsite ${p.send}. Saaja on ${p.first}, kes saab täna ${p.get}. Teie abiline ${p.helper} sai teate. ` +
    'Lõpetamiseks öelge „valmis“ või öelge, mida veel vajate.',
  balance: (p) => `Teie kontol on ${p.balance}.`,
  statusNone: () => 'Te ei ole veel raha saatnud.',
  statusCompleted: (p) => `Teie viimane ülekanne on kohale jõudnud. ${p.full} sai ${p.get}.`,
  statusProcessing: (p) => `Teie ülekanne on teel. Saaja on ${p.full}, summa ${p.send}. See jõuab kohale täna.`,
  unknownNamed: (p) =>
    `Inimest nimega ${p.name} ei ole teie saajate hulgas. Kas soovite ta lisada? Öelge „lisa saaja“ või „tühista“.`,
  unknownUnnamed: () => 'Ma ei leidnud seda inimest teie saajate hulgast. Nendele inimestele saan raha saata.',
  overLimit: (p) => `See on rohkem kui teie häälülekande limiit. Limiit on ${p.limit}. Palun öelge väiksem summa.`,
  insufficient: (p) => `Teil ei ole selleks piisavalt raha. Teie kontol on ${p.balance}. Palun öelge väiksem summa.`,
  currencyUnsupported: () => 'Raha läheb teie eurokontolt. Palun öelge summa eurodes.',
  scam: (p) =>
    'Palun peatuge. See kõlab nagu pettus. Päris pank ega politsei ei palu kunagi raha üle kanda. ' +
    `Ma ei saatnud midagi ja teie abiline ${p.helper} sai teate. Palun rääkige kõigepealt temaga.`,
  notUnderstood: () =>
    'Vabandust, ma ei saanud aru. Võite öelda: „Saada lapselapsele 50 eurot.“ Või küsida: „Kui palju mul raha on?“',
  help: () =>
    'Saan saata raha teie saajatele, lisada uue saaja, öelda teie saldo, kontrollida, kas raha jõudis kohale, ' +
    'ja vastata küsimustele Wise’i abikeskusest. Öelge lihtsalt oma sõnadega.',
  pinLocked: () => 'Kood oli kolm korda vale, seepärast on see ülekanne tühistatud. Midagi ei saadetud.',
  amountInvalid: () => 'Palun öelge summa, näiteks 50 eurot.',
  nothingToConfirm: () => 'Praegu ei ole midagi kinnitada. Öelge, kellele ja kui palju soovite saata.',
  paused: () => 'Kuulsin teist häält, seepärast tegin pausi. Midagi ei saadetud. Kui olete valmis, öelge „Hei Wise“.',
  welcomeBack: (p) => `Tere tulemast tagasi, ${p.name}.`,
  voiceRequired: () => 'Pean kõigepealt teie häält kuulma. Palun öelge „Hei Wise“.',
  enrollIntro: (p) =>
    `Enne alustamist lubage mul teie hääl selgeks õppida, et ainult teie saaksite raha saata. Palun korrake: ${p.phrase}`,
  enrollNext: (p) => `Aitäh. Nüüd öelge: ${p.phrase}`,
  enrollRetry: (p) => `Ma ei kuulnud seda selgelt. Palun öelge uuesti: ${p.phrase}`,
  enrollDone: () => 'Aitäh. Tunnen nüüd teie häält ja kuulan ainult teid. Mida te vajate?',
  goodbye: (p) => `Head aega, ${p.name}. Kui mind vajate, öelge „Hei Wise“.`,
  standby: () => 'Ootan. Kui mind vajate, öelge „Hei Wise“.',
  goneBack: () => 'Hästi, kontrollime uuesti.',
  addAskName: () => 'Lisame uue saaja. Mis on tema täisnimi?',
  addAskRelation: (p) => `Kes on teile ${p.name}? Näiteks lapselaps, naaber või sõber.`,
  addAskCountry: (p) => `Mis riigis on saaja ${p.first} pank?`,
  addCountryUnknown: (p) => `Saan lisada panku nendes riikides: ${p.countries}. Mis riik see on?`,
  addAskAccount: (p) => `Palun öelge saaja ${p.first} kontonumber aeglaselt, paar märki korraga.`,
  addAccountInvalid: () => 'Ma ei saanud kogu kontonumbrit kätte. Palun öelge see uuesti, aeglaselt.',
  addConfirm: (p) =>
    `Palun kontrollige. Nimi: ${p.name}. ${p.relation}. Pank riigis ${p.country}. Kontonumber: ${p.spelled}. ` +
    'Kas lisan selle saaja? Öelge „jah“ või „ei“.',
  addDone: (p) => `Valmis. ${p.name} on nüüd teie saaja ja teie abiline ${p.helper} sai teate. Raha saatmiseks öelge lihtsalt summa.`,
  addCancelled: () => 'Hästi, ma ei lisanud kedagi.',
  helpArticle: () => 'Wise’i abikeskuses on selle kohta artikkel. Panin selle teie ekraanile.',
  helpNothing: () =>
    'Ma ei leidnud seda Wise’i abikeskusest. Võite küsida tasude, ülekande aja, tühistamise või limiitide kohta.',
  helpTopic_fees: () =>
    'Üldiselt sõltub tasu valuutadest ja summast. Enne saatmist näete alati täpset tasu ja seda, kui palju saaja saab.',
  helpTopic_speed: () =>
    'Üldiselt jõuavad paljud ülekanded kohale mõne sekundiga või samal päeval. Mõni võtab kauem, näiteks pühade või lisakontrolli tõttu. Enne saatmist näete hinnangut.',
  helpTopic_cancel: () =>
    'Üldiselt saab ülekande tühistada seni, kuni raha ei ole välja makstud. Kui raha on kohale jõudnud, ei saa seda tühistada.',
  helpTopic_limits: () =>
    'Üldiselt on saadetavale summale limiidid, mis sõltuvad teie riigist ja valuutast. Suurte ülekannete jaoks võib vaja minna lisadokumente.',
  helpTopic_recipients: () =>
    'Saaja lisamiseks öelge „lisa saaja“. Kõiki saajaid näete saajate vahekaardil. Kontrollige alati pangaandmeid enne saatmist.',
  helpTopic_card: () => 'Kui kaart kaob või varastatakse, külmutage see kohe rakenduses ja tellige uus.',
  helpTopic_scam: () =>
    'Wise ei palu teil kunagi raha „turvalisele kontole“ kanda. Kui keegi survestab teid raha saatma, peatuge ja rääkige usaldusväärse inimesega.',
  helpTopic_status: () =>
    'Kõiki ülekandeid ja nende olekut näete maksete vahekaardil. Võite ka küsida: „Kas raha jõudis kohale?“'
};

const ru = {
  voiceUnclear: () => 'Я не смог чётко узнать ваш голос. Пожалуйста, скажите код ещё раз, чуть ближе.',
  notOwner: () => 'Извините, я принимаю команды только от владельца счёта.',
  codeByHand: () => 'Я всё ещё не узнаю ваш голос. Вы можете ввести код на экране.',
  greeting: (p) => `Здравствуйте, ${p.name}. Что вам нужно? Например: «Отправь внуку 50 евро».`,
  askRecipient: () => 'Кому вы хотите отправить деньги?',
  askAmount: (p) => `Получатель — ${p.first}. Сколько вы хотите отправить?`,
  askWhich: (p) => `У вас несколько получателей с именем ${p.name}. Кого вы имеете в виду? Назовите полное имя или скажите «первый» или «второй».`,
  review: (p) =>
    `Проверьте, пожалуйста. Получатель — ${p.full}${withRel(p)}. Вы отправляете ${p.send}. ${p.first} получит ${p.get}. ` +
    `Комиссия — ${p.fee}. Деньги придут сегодня. Всё верно? Скажите «да» или «изменить».`,
  readyToSend: (p) =>
    `Всё готово к отправке: ${p.send}. Получатель — ${p.full}. ` +
    (p.sentBefore
      ? 'Вы уже отправляли деньги этому человеку. '
      : 'Вы ещё не отправляли деньги этому человеку. Продолжайте, только если вы его знаете. ') +
    'Чтобы продолжить, скажите «отправить». Чтобы вернуться, скажите «назад».',
  askCode: () => 'Пожалуйста, назовите ваш код из четырёх цифр. Только цифры.',
  codeWrong: (p) => `Код неверный. Осталось попыток: ${p.n}. Пожалуйста, скажите его ещё раз.`,
  codeUnclear: () => 'Мне нужно ровно четыре цифры. Пожалуйста, скажите код ещё раз, по одной цифре.',
  changeWhat: () => 'Хорошо. Ничего не отправлено. Назовите новую сумму или другого человека, или скажите «отмена».',
  cancelled: () => 'Хорошо, отменено. Ничего не отправлено.',
  sent: (p) =>
    `Деньги отправлены. Вы отправили ${p.send}. Получатель — ${p.first}, сегодня придёт ${p.get}. Ваш помощник, ${p.helper}, получит уведомление. ` +
    'Скажите «готово», чтобы закончить, или скажите, что ещё нужно.',
  balance: (p) => `На вашем счёте ${p.balance}.`,
  statusNone: () => 'Вы ещё не отправляли деньги.',
  statusCompleted: (p) => `Ваш последний перевод доставлен. Получатель — ${p.full}, сумма — ${p.get}.`,
  statusProcessing: (p) => `Ваш перевод в пути. Получатель — ${p.full}, сумма — ${p.send}. Деньги придут сегодня.`,
  unknownNamed: (p) =>
    `Имени «${p.name}» нет среди ваших получателей. Хотите добавить этого человека? Скажите «добавить получателя» или «отмена».`,
  unknownUnnamed: () => 'Я не нахожу этого человека среди получателей. Вот кому можно отправить деньги.',
  overLimit: (p) => `Это больше вашего лимита на один голосовой перевод. Лимит — ${p.limit}. Назовите сумму поменьше.`,
  insufficient: (p) => `На это не хватает денег. На вашем счёте ${p.balance}. Назовите сумму поменьше.`,
  currencyUnsupported: () => 'Деньги отправляются с вашего счёта в евро. Назовите сумму в евро.',
  scam: (p) =>
    'Пожалуйста, остановитесь. Это похоже на мошенничество. Настоящий банк или полиция никогда не просят переводить деньги. ' +
    `Ничего не отправлено. Ваш помощник, ${p.helper}, получит уведомление. Сначала поговорите с близкими.`,
  notUnderstood: () =>
    'Простите, я не понимаю. Можно сказать: «Отправь внуку 50 евро». Или спросить: «Сколько у меня денег?»',
  help: () =>
    'Я могу отправить деньги вашим получателям, добавить нового получателя, сказать ваш баланс, проверить, дошли ли деньги, ' +
    'и ответить на вопросы из справочного центра Wise. Просто скажите своими словами.',
  pinLocked: () => 'Код введён неверно три раза, поэтому перевод отменён. Ничего не отправлено.',
  amountInvalid: () => 'Назовите сумму, например 50 евро.',
  nothingToConfirm: () => 'Пока нечего подтверждать. Скажите, кому и сколько отправить.',
  paused: () => 'Я услышал другой голос, поэтому сделал паузу. Ничего не отправлено. Когда будете готовы, скажите «Хей Вайз».',
  welcomeBack: (p) => `С возвращением, ${p.name}.`,
  voiceRequired: () => 'Сначала мне нужно услышать ваш голос. Пожалуйста, скажите «Хей Вайз».',
  enrollIntro: (p) =>
    `Прежде чем начать, позвольте мне запомнить ваш голос, чтобы только вы могли отправлять деньги. Повторите за мной: ${p.phrase}`,
  enrollNext: (p) => `Спасибо. Теперь скажите: ${p.phrase}`,
  enrollRetry: (p) => `Я не расслышал. Пожалуйста, скажите ещё раз: ${p.phrase}`,
  enrollDone: () => 'Спасибо. Теперь я знаю ваш голос и буду слушать только вас. Что вам нужно?',
  goodbye: (p) => `До свидания, ${p.name}. Когда понадоблюсь, скажите «Хей Вайз».`,
  standby: () => 'Я подожду. Когда понадоблюсь, скажите «Хей Вайз».',
  goneBack: () => 'Хорошо, давайте проверим ещё раз.',
  addAskName: () => 'Добавим нового получателя. Как его полное имя?',
  addAskRelation: (p) => `Кем вам приходится ${p.name}? Например: внук, сосед или друг.`,
  addAskCountry: (p) => `В какой стране банк получателя ${p.first}?`,
  addCountryUnknown: (p) => `Я могу добавить банки в этих странах: ${p.countries}. Какая из них?`,
  addAskAccount: (p) => `Пожалуйста, медленно назовите номер счёта получателя ${p.first}, по несколько знаков.`,
  addAccountInvalid: () => 'Я не расслышал номер счёта полностью. Пожалуйста, назовите его ещё раз, медленно.',
  addConfirm: (p) =>
    `Проверьте, пожалуйста. Имя: ${p.name}. ${p.relation}. Банк в стране: ${p.country}. Номер счёта: ${p.spelled}. ` +
    'Добавить этого получателя? Скажите «да» или «нет».',
  addDone: (p) => `Готово. ${p.name} теперь среди ваших получателей. Ваш помощник, ${p.helper}, получит уведомление. Чтобы отправить деньги, просто назовите сумму.`,
  addCancelled: () => 'Хорошо, я никого не добавил.',
  helpArticle: () => 'В справочном центре Wise есть статья об этом. Я показал её на экране.',
  helpNothing: () =>
    'Я не нашёл этого в справочном центре Wise. Можно спросить о комиссиях, сроках перевода, отмене или лимитах.',
  helpTopic_fees: () =>
    'Обычно комиссия зависит от валют и суммы. Перед отправкой вы всегда видите точную комиссию и сколько получит человек.',
  helpTopic_speed: () =>
    'Обычно многие переводы приходят за несколько секунд или в тот же день. Некоторые идут дольше, например из-за праздников или дополнительных проверок. Перед отправкой вы видите примерный срок.',
  helpTopic_cancel: () =>
    'Обычно перевод можно отменить, пока деньги ещё не выплачены. Если деньги уже пришли, отменить перевод нельзя.',
  helpTopic_limits: () =>
    'Обычно есть лимиты на сумму перевода, они зависят от вашей страны и валюты. Для крупных переводов могут понадобиться документы.',
  helpTopic_recipients: () =>
    'Чтобы добавить получателя, скажите «добавить получателя». Всех получателей видно на вкладке «Получатели». Всегда проверяйте реквизиты перед отправкой.',
  helpTopic_card: () => 'Если карта потеряна или украдена, сразу заморозьте её в приложении, а потом закажите новую.',
  helpTopic_scam: () =>
    'Wise никогда не просит переводить деньги на «безопасный счёт». Если кто-то торопит вас отправить деньги, остановитесь и поговорите с близкими.',
  helpTopic_status: () =>
    'Все переводы и их статус видны на вкладке «Платежи». Также можно спросить меня: «Деньги дошли?»'
};

const uk = {
  voiceUnclear: () => 'Я не зміг чітко впізнати ваш голос. Будь ласка, скажіть код ще раз, трохи ближче.',
  notOwner: () => 'Вибачте, я приймаю команди лише від власника рахунку.',
  codeByHand: () => 'Я досі не впізнаю ваш голос. Ви можете ввести код на екрані.',
  greeting: (p) => `Вітаю, ${p.name}. Що вам потрібно? Наприклад: «Надішли онуку 50 євро».`,
  askRecipient: () => 'Кому ви хочете надіслати гроші?',
  askAmount: (p) => `Отримувач — ${p.first}. Скільки ви хочете надіслати?`,
  askWhich: (p) => `У вас кілька отримувачів з іменем ${p.name}. Кого ви маєте на увазі? Назвіть повне ім’я або скажіть «перший» чи «другий».`,
  review: (p) =>
    `Перевірте, будь ласка. Отримувач — ${p.full}${withRel(p)}. Ви надсилаєте ${p.send}. ${p.first} отримає ${p.get}. ` +
    `Комісія — ${p.fee}. Гроші надійдуть сьогодні. Усе правильно? Скажіть «так» або «змінити».`,
  readyToSend: (p) =>
    `Усе готово до надсилання: ${p.send}. Отримувач — ${p.full}. ` +
    (p.sentBefore
      ? 'Ви вже надсилали гроші цій людині. '
      : 'Ви ще не надсилали гроші цій людині. Продовжуйте, лише якщо ви її знаєте. ') +
    'Щоб продовжити, скажіть «надіслати». Щоб повернутися, скажіть «назад».',
  askCode: () => 'Будь ласка, назвіть ваш код із чотирьох цифр. Лише цифри.',
  codeWrong: (p) => `Код неправильний. Залишилося спроб: ${p.n}. Будь ласка, скажіть його ще раз.`,
  codeUnclear: () => 'Мені потрібно рівно чотири цифри. Будь ласка, скажіть код ще раз, по одній цифрі.',
  changeWhat: () => 'Добре. Нічого не надіслано. Назвіть нову суму або іншу людину, або скажіть «скасувати».',
  cancelled: () => 'Добре, скасовано. Нічого не надіслано.',
  sent: (p) =>
    `Гроші надіслано. Ви надіслали ${p.send}. Отримувач — ${p.first}, сьогодні надійде ${p.get}. Ваш помічник, ${p.helper}, отримає сповіщення. ` +
    'Скажіть «готово», щоб завершити, або скажіть, що ще потрібно.',
  balance: (p) => `На вашому рахунку ${p.balance}.`,
  statusNone: () => 'Ви ще не надсилали гроші.',
  statusCompleted: (p) => `Ваш останній переказ надійшов. Отримувач — ${p.full}, сума — ${p.get}.`,
  statusProcessing: (p) => `Ваш переказ у дорозі. Отримувач — ${p.full}, сума — ${p.send}. Гроші надійдуть сьогодні.`,
  unknownNamed: (p) =>
    `Імені «${p.name}» немає серед ваших отримувачів. Хочете додати цю людину? Скажіть «додати отримувача» або «скасувати».`,
  unknownUnnamed: () => 'Я не знаходжу цієї людини серед отримувачів. Ось кому можна надіслати гроші.',
  overLimit: (p) => `Це більше за ваш ліміт на один голосовий переказ. Ліміт — ${p.limit}. Назвіть меншу суму.`,
  insufficient: (p) => `На це не вистачає грошей. На вашому рахунку ${p.balance}. Назвіть меншу суму.`,
  currencyUnsupported: () => 'Гроші надсилаються з вашого рахунку в євро. Назвіть суму в євро.',
  scam: (p) =>
    'Будь ласка, зупиніться. Це схоже на шахрайство. Справжній банк чи поліція ніколи не просять переказувати гроші. ' +
    `Нічого не надіслано. Ваш помічник, ${p.helper}, отримає сповіщення. Спершу поговоріть з рідними.`,
  notUnderstood: () =>
    'Вибачте, я не зрозумів. Можна сказати: «Надішли онуку 50 євро». Або запитати: «Скільки в мене грошей?»',
  help: () =>
    'Я можу надіслати гроші вашим отримувачам, додати нового отримувача, сказати ваш баланс, перевірити, чи дійшли гроші, ' +
    'і відповісти на запитання з довідкового центру Wise. Просто скажіть своїми словами.',
  pinLocked: () => 'Код було введено неправильно тричі, тому переказ скасовано. Нічого не надіслано.',
  amountInvalid: () => 'Назвіть суму, наприклад 50 євро.',
  nothingToConfirm: () => 'Поки що нічого підтверджувати. Скажіть, кому і скільки надіслати.',
  paused: () => 'Я почув інший голос, тому зробив паузу. Нічого не надіслано. Коли будете готові, скажіть «Хей Вайз».',
  welcomeBack: (p) => `З поверненням, ${p.name}.`,
  voiceRequired: () => 'Спершу мені потрібно почути ваш голос. Будь ласка, скажіть «Хей Вайз».',
  enrollIntro: (p) =>
    `Перш ніж почати, дозвольте мені запам’ятати ваш голос, щоб лише ви могли надсилати гроші. Повторіть за мною: ${p.phrase}`,
  enrollNext: (p) => `Дякую. Тепер скажіть: ${p.phrase}`,
  enrollRetry: (p) => `Я не розчув. Будь ласка, скажіть ще раз: ${p.phrase}`,
  enrollDone: () => 'Дякую. Тепер я знаю ваш голос і слухатиму лише вас. Що вам потрібно?',
  goodbye: (p) => `До побачення, ${p.name}. Коли знадоблюся, скажіть «Хей Вайз».`,
  standby: () => 'Я зачекаю. Коли знадоблюся, скажіть «Хей Вайз».',
  goneBack: () => 'Добре, перевіримо ще раз.',
  addAskName: () => 'Додамо нового отримувача. Яке його повне ім’я?',
  addAskRelation: (p) => `Ким вам доводиться ${p.name}? Наприклад: онук, сусід чи друг.`,
  addAskCountry: (p) => `У якій країні банк отримувача ${p.first}?`,
  addCountryUnknown: (p) => `Я можу додати банки в цих країнах: ${p.countries}. Яка з них?`,
  addAskAccount: (p) => `Будь ласка, повільно назвіть номер рахунку отримувача ${p.first}, по кілька знаків.`,
  addAccountInvalid: () => 'Я не розчув номер рахунку повністю. Будь ласка, назвіть його ще раз, повільно.',
  addConfirm: (p) =>
    `Перевірте, будь ласка. Ім’я: ${p.name}. ${p.relation}. Банк у країні: ${p.country}. Номер рахунку: ${p.spelled}. ` +
    'Додати цього отримувача? Скажіть «так» або «ні».',
  addDone: (p) => `Готово. ${p.name} тепер серед ваших отримувачів. Ваш помічник, ${p.helper}, отримає сповіщення. Щоб надіслати гроші, просто назвіть суму.`,
  addCancelled: () => 'Добре, я нікого не додав.',
  helpArticle: () => 'У довідковому центрі Wise є стаття про це. Я показав її на екрані.',
  helpNothing: () =>
    'Я не знайшов цього в довідковому центрі Wise. Можна запитати про комісії, строки переказу, скасування чи ліміти.',
  helpTopic_fees: () =>
    'Зазвичай комісія залежить від валют і суми. Перед надсиланням ви завжди бачите точну комісію і скільки отримає людина.',
  helpTopic_speed: () =>
    'Зазвичай багато переказів надходять за кілька секунд або того ж дня. Деякі йдуть довше, наприклад через свята чи додаткові перевірки. Перед надсиланням ви бачите орієнтовний строк.',
  helpTopic_cancel: () =>
    'Зазвичай переказ можна скасувати, поки гроші ще не виплачено. Якщо гроші вже надійшли, скасувати переказ не можна.',
  helpTopic_limits: () =>
    'Зазвичай є ліміти на суму переказу, вони залежать від вашої країни та валюти. Для великих переказів можуть знадобитися документи.',
  helpTopic_recipients: () =>
    'Щоб додати отримувача, скажіть «додати отримувача». Усіх отримувачів видно на вкладці «Отримувачі». Завжди перевіряйте реквізити перед надсиланням.',
  helpTopic_card: () => 'Якщо картку загублено чи вкрадено, одразу заморозьте її в застосунку, а потім замовте нову.',
  helpTopic_scam: () =>
    'Wise ніколи не просить переказувати гроші на «безпечний рахунок». Якщо хтось квапить вас надіслати гроші, зупиніться і поговоріть із рідними.',
  helpTopic_status: () =>
    'Усі перекази та їхній статус видно на вкладці «Платежі». Також можна запитати мене: «Гроші дійшли?»'
};

const ur = {
  voiceUnclear: () => 'میں آپ کی آواز صاف نہیں پہچان سکا۔ کوڈ دوبارہ بتائیے، تھوڑا قریب سے۔',
  notOwner: () => 'معاف کیجیے، میں صرف اکاؤنٹ کے مالک کی بات مانتا ہوں۔',
  codeByHand: () => 'میں اب بھی آپ کی آواز نہیں پہچان سکا۔ آپ کوڈ اسکرین پر لکھ سکتے ہیں۔',
  greeting: (p) => `السلام علیکم ${p.name}۔ بتائیے، کیا کرنا ہے؟ مثلاً: پوتے کو 50 یورو بھیجو۔`,
  askRecipient: () => 'پیسے کس کو بھیجنے ہیں؟',
  askAmount: (p) => `${p.first} کو کتنے پیسے بھیجنے ہیں؟`,
  askWhich: (p) => `${p.name} نام کے ایک سے زیادہ لوگ ہیں۔ کون سے والے؟ پورا نام بتائیے، یا کہیے پہلا یا دوسرا۔`,
  review: (p) =>
    `ذرا چیک کر لیجیے۔ ${p.rel ? `${p.rel} ` : ''}${p.full} کو ${p.send} بھیجے جا رہے ہیں۔ ` +
    `${p.first} کو ${p.get} ملیں گے۔ فیس ${p.fee} ہے۔ پیسے آج پہنچ جائیں گے۔ کیا یہ ٹھیک ہے؟ کہیے ہاں، یا کہیے بدلو۔`,
  readyToSend: (p) =>
    `${p.full} کو ${p.send} بھیجنے کے لیے سب تیار ہے۔ ` +
    (p.sentBefore
      ? 'آپ پہلے بھی انہیں پیسے بھیج چکے ہیں۔ '
      : 'آپ نے انہیں پہلے کبھی پیسے نہیں بھیجے۔ صرف تب آگے بڑھیے جب آپ انہیں جانتے ہوں۔ ') +
    'آگے بڑھنے کے لیے کہیے بھیج دو، یا کہیے واپس۔',
  askCode: () => 'اپنا چار ہندسوں کا کوڈ بتائیے۔ صرف نمبر۔',
  codeWrong: (p) => `یہ کوڈ ٹھیک نہیں ہے۔ باقی کوششیں: ${p.n}۔ دوبارہ بتائیے۔`,
  codeUnclear: () => 'مجھے پورے چار نمبر چاہئیں۔ کوڈ دوبارہ بتائیے، ایک ایک نمبر کر کے۔',
  changeWhat: () => 'کوئی بات نہیں۔ کچھ نہیں بھیجا گیا۔ نئی رقم یا دوسرا نام بتائیے، یا کہیے کینسل۔',
  cancelled: () => 'ٹھیک ہے، کینسل کر دیا۔ کچھ نہیں بھیجا گیا۔',
  sent: (p) =>
    `پیسے بھیج دیے گئے۔ آپ نے ${p.first} کو ${p.send} بھیجے۔ ${p.first} کو آج ${p.get} مل جائیں گے۔ ${p.helper} کو بتا دیا گیا ہے۔ ` +
    'ختم کرنے کے لیے کہیے بس، یا بتائیے اور کیا کرنا ہے۔',
  balance: (p) => `آپ کے اکاؤنٹ میں ${p.balance} ہیں۔`,
  statusNone: () => 'آپ نے ابھی تک کوئی پیسے نہیں بھیجے۔',
  statusCompleted: (p) => `آپ کا پچھلا ٹرانسفر پہنچ گیا ہے۔ ${p.full} کو ${p.get} مل گئے ہیں۔`,
  statusProcessing: (p) => `${p.full} کو بھیجے گئے ${p.send} راستے میں ہیں۔ آج پہنچ جائیں گے۔`,
  unknownNamed: (p) => `${p.name} ابھی آپ کے وصول کنندگان میں نہیں ہیں۔ کیا انہیں شامل کرنا ہے؟ کہیے نیا وصول کنندہ، یا کہیے کینسل۔`,
  unknownUnnamed: () => 'یہ نام آپ کے وصول کنندگان میں نہیں ملا۔ ان لوگوں کو پیسے بھیجے جا سکتے ہیں۔',
  overLimit: (p) => `یہ رقم آواز سے ایک بار میں بھیجنے کی حد ${p.limit} سے زیادہ ہے۔ کم رقم بتائیے۔`,
  insufficient: (p) => `اتنے پیسے اکاؤنٹ میں نہیں ہیں۔ آپ کے پاس ${p.balance} ہیں۔ کم رقم بتائیے۔`,
  currencyUnsupported: () => 'پیسے آپ کے یورو اکاؤنٹ سے جاتے ہیں۔ رقم یورو میں بتائیے۔',
  scam: (p) =>
    'رک جائیے۔ یہ دھوکا لگ رہا ہے۔ اصلی بینک یا پولیس کبھی پیسے بھیجنے کو نہیں کہتے۔ ' +
    `کچھ نہیں بھیجا گیا، اور ${p.helper} کو بتا دیا گیا ہے۔ پہلے ${p.helper} سے بات کیجیے۔`,
  notUnderstood: () => 'معاف کیجیے، سمجھ نہیں آیا۔ آپ کہہ سکتے ہیں: پوتے کو 50 یورو بھیجو۔ یا پوچھیے: میرے پاس کتنے پیسے ہیں؟',
  help: () =>
    'میں آپ کے وصول کنندگان کو پیسے بھیج سکتا ہوں، نیا وصول کنندہ شامل کر سکتا ہوں، بیلنس بتا سکتا ہوں، یہ بتا سکتا ہوں کہ پیسے پہنچے یا نہیں، ' +
    'اور وائز ہیلپ سینٹر سے سوالوں کے جواب دے سکتا ہوں۔ بس اپنے الفاظ میں بولیے۔',
  pinLocked: () => 'کوڈ تین بار غلط بتایا گیا، اس لیے یہ ٹرانسفر کینسل کر دیا گیا۔ کچھ نہیں بھیجا گیا۔',
  amountInvalid: () => 'رقم بتائیے، مثلاً 50 یورو۔',
  nothingToConfirm: () => 'ابھی بھیجنے کے لیے کچھ تیار نہیں ہے۔ بتائیے کس کو اور کتنے پیسے بھیجنے ہیں۔',
  paused: () => 'میں نے کوئی اور آواز سنی، اس لیے رک گیا ہوں۔ کچھ نہیں بھیجا گیا۔ جب تیار ہوں تو کہیے ہے وائز۔',
  welcomeBack: (p) => `خوش آمدید ${p.name}۔`,
  voiceRequired: () => 'پہلے مجھے آپ کی آواز سننی ہے۔ کہیے ہے وائز۔',
  enrollIntro: (p) => `شروع کرنے سے پہلے مجھے آپ کی آواز پہچاننے دیجیے، تاکہ صرف آپ پیسے بھیج سکیں۔ میرے بعد دہرائیے: ${p.phrase}`,
  enrollNext: (p) => `شکریہ۔ اب کہیے: ${p.phrase}`,
  enrollRetry: (p) => `صاف سنائی نہیں دیا۔ دوبارہ کہیے: ${p.phrase}`,
  enrollDone: () => 'شکریہ۔ اب میں آپ کی آواز پہچانتا ہوں اور صرف آپ کی بات سنوں گا۔ بتائیے کیا کرنا ہے؟',
  goodbye: (p) => `خدا حافظ ${p.name}۔ جب ضرورت ہو، کہیے ہے وائز۔`,
  standby: () => 'میں انتظار کرتا ہوں۔ جب ضرورت ہو، کہیے ہے وائز۔',
  goneBack: () => 'ٹھیک ہے، دوبارہ چیک کر لیتے ہیں۔',
  addAskName: () => 'نیا وصول کنندہ شامل کرتے ہیں۔ ان کا پورا نام کیا ہے؟',
  addAskRelation: (p) => `${p.name} آپ کے کیا لگتے ہیں؟ مثلاً پوتا، پڑوسی یا دوست۔`,
  addAskCountry: (p) => `${p.first} کا بینک کس ملک میں ہے؟`,
  addCountryUnknown: (p) => `میں ان ملکوں کے بینک شامل کر سکتا ہوں: ${p.countries}۔ کون سا ملک ہے؟`,
  addAskAccount: (p) => `${p.first} کا اکاؤنٹ نمبر آہستہ آہستہ بتائیے، تھوڑا تھوڑا کر کے۔`,
  addAccountInvalid: () => 'پورا اکاؤنٹ نمبر سمجھ نہیں آیا۔ دوبارہ آہستہ بتائیے۔',
  addConfirm: (p) =>
    `ذرا چیک کر لیجیے۔ نام: ${p.name}۔ ${p.relation}۔ بینک: ${p.country}۔ اکاؤنٹ نمبر: ${p.spelled}۔ ` +
    'کیا انہیں شامل کر دوں؟ کہیے ہاں، یا کہیے نہیں۔',
  addDone: (p) => `ہو گیا۔ ${p.name} اب آپ کے وصول کنندگان میں ہیں، اور ${p.helper} کو بتا دیا گیا ہے۔ پیسے بھیجنے کے لیے بس رقم بتائیے۔`,
  addCancelled: () => 'ٹھیک ہے، کسی کو شامل نہیں کیا۔',
  helpArticle: () => 'وائز ہیلپ سینٹر میں اس بارے میں ایک مضمون ہے۔ میں نے اسے اسکرین پر دکھا دیا ہے۔',
  helpNothing: () => 'یہ وائز ہیلپ سینٹر میں نہیں ملا۔ آپ فیس، ٹرانسفر کے وقت، کینسل کرنے یا حد کے بارے میں پوچھ سکتے ہیں۔',
  helpTopic_fees: () => 'عام طور پر فیس کرنسی اور رقم پر منحصر ہوتی ہے۔ بھیجنے سے پہلے آپ کو ہمیشہ صحیح فیس اور یہ کہ دوسرے کو کتنا ملے گا، دکھایا جاتا ہے۔',
  helpTopic_speed: () =>
    'عام طور پر بہت سے ٹرانسفر چند سیکنڈ میں یا اسی دن پہنچ جاتے ہیں۔ کچھ میں زیادہ وقت لگتا ہے، مثلاً چھٹیوں یا اضافی جانچ کی وجہ سے۔ بھیجنے سے پہلے اندازہ دکھایا جاتا ہے۔',
  helpTopic_cancel: () => 'عام طور پر ٹرانسفر تب تک کینسل ہو سکتا ہے جب تک پیسے ادا نہ ہوئے ہوں۔ پیسے پہنچ جائیں تو کینسل نہیں ہو سکتا۔',
  helpTopic_limits: () => 'عام طور پر بھیجنے کی رقم کی حد ہوتی ہے جو آپ کے ملک اور کرنسی پر منحصر ہے۔ بڑی رقم کے لیے اضافی کاغذات چاہیے ہو سکتے ہیں۔',
  helpTopic_recipients: () => 'نیا وصول کنندہ شامل کرنے کے لیے کہیے نیا وصول کنندہ۔ سب وصول کنندگان ریسیپینٹس ٹیب میں ہیں۔ بھیجنے سے پہلے بینک کی تفصیل ضرور چیک کیجیے۔',
  helpTopic_card: () => 'اگر کارڈ گم یا چوری ہو جائے تو فوراً ایپ میں اسے فریز کیجیے، پھر نیا کارڈ منگوائیے۔',
  helpTopic_scam: () => 'وائز کبھی پیسے کسی محفوظ اکاؤنٹ میں بھیجنے کو نہیں کہتا۔ اگر کوئی آپ پر دباؤ ڈالے تو رک جائیے اور کسی بھروسے والے سے بات کیجیے۔',
  helpTopic_status: () => 'سب ٹرانسفر اور ان کی صورتحال پیمنٹس ٹیب میں ہیں۔ آپ مجھ سے بھی پوچھ سکتے ہیں: کیا پیسے پہنچ گئے؟'
};

const hi = {
  voiceUnclear: () => 'मैं आपकी आवाज़ साफ़ नहीं पहचान सका। कोड दोबारा बताइए, थोड़ा पास से।',
  notOwner: () => 'माफ़ कीजिए, मैं सिर्फ़ अकाउंट के मालिक की बात मानता हूँ।',
  codeByHand: () => 'मैं अब भी आपकी आवाज़ नहीं पहचान सका। आप कोड स्क्रीन पर लिख सकते हैं।',
  greeting: (p) => `नमस्ते ${p.name}। बताइए, क्या करना है? जैसे: पोते को 50 यूरो भेजो।`,
  askRecipient: () => 'पैसे किसको भेजने हैं?',
  askAmount: (p) => `${p.first} को कितने पैसे भेजने हैं?`,
  askWhich: (p) => `${p.name} नाम के एक से ज़्यादा लोग हैं। कौन से वाले? पूरा नाम बताइए, या कहिए पहला या दूसरा।`,
  review: (p) =>
    `ज़रा चेक कर लीजिए। ${p.rel ? `${p.rel} ` : ''}${p.full} को ${p.send} भेजे जा रहे हैं। ` +
    `${p.first} को ${p.get} मिलेंगे। फ़ीस ${p.fee} है। पैसे आज पहुँच जाएँगे। क्या यह ठीक है? कहिए हाँ, या कहिए बदलो।`,
  readyToSend: (p) =>
    `${p.full} को ${p.send} भेजने के लिए सब तैयार है। ` +
    (p.sentBefore
      ? 'आप पहले भी इन्हें पैसे भेज चुके हैं। '
      : 'आपने इन्हें पहले कभी पैसे नहीं भेजे। आगे तभी बढ़िए जब आप इन्हें जानते हों। ') +
    'आगे बढ़ने के लिए कहिए भेज दो, या कहिए वापस।',
  askCode: () => 'अपना चार अंकों का कोड बताइए। सिर्फ़ नंबर।',
  codeWrong: (p) => `यह कोड सही नहीं है। बाक़ी कोशिशें: ${p.n}। दोबारा बताइए।`,
  codeUnclear: () => 'मुझे पूरे चार नंबर चाहिए। कोड दोबारा बताइए, एक-एक नंबर करके।',
  changeWhat: () => 'कोई बात नहीं। कुछ नहीं भेजा गया। नई रक़म या दूसरा नाम बताइए, या कहिए कैंसल।',
  cancelled: () => 'ठीक है, कैंसल कर दिया। कुछ नहीं भेजा गया।',
  sent: (p) =>
    `पैसे भेज दिए गए। आपने ${p.first} को ${p.send} भेजे। ${p.first} को आज ${p.get} मिल जाएँगे। ${p.helper} को बता दिया गया है। ` +
    'ख़त्म करने के लिए कहिए बस, या बताइए और क्या करना है।',
  balance: (p) => `आपके अकाउंट में ${p.balance} हैं।`,
  statusNone: () => 'आपने अभी तक कोई पैसे नहीं भेजे।',
  statusCompleted: (p) => `आपका पिछला ट्रांसफ़र पहुँच गया है। ${p.full} को ${p.get} मिल गए हैं।`,
  statusProcessing: (p) => `${p.full} को भेजे गए ${p.send} रास्ते में हैं। आज पहुँच जाएँगे।`,
  unknownNamed: (p) => `${p.name} अभी आपके रिसीवर्स में नहीं हैं। क्या इन्हें जोड़ना है? कहिए नया रिसीवर, या कहिए कैंसल।`,
  unknownUnnamed: () => 'यह नाम आपके रिसीवर्स में नहीं मिला। इन लोगों को पैसे भेजे जा सकते हैं।',
  overLimit: (p) => `यह रक़म आवाज़ से एक बार में भेजने की हद ${p.limit} से ज़्यादा है। कम रक़म बताइए।`,
  insufficient: (p) => `इतने पैसे अकाउंट में नहीं हैं। आपके पास ${p.balance} हैं। कम रक़म बताइए।`,
  currencyUnsupported: () => 'पैसे आपके यूरो अकाउंट से जाते हैं। रक़म यूरो में बताइए।',
  scam: (p) =>
    'रुकिए। यह धोखा लग रहा है। असली बैंक या पुलिस कभी पैसे भेजने को नहीं कहते। ' +
    `कुछ नहीं भेजा गया है, और ${p.helper} को बता दिया गया है। पहले ${p.helper} से बात कीजिए।`,
  notUnderstood: () => 'माफ़ कीजिए, समझ नहीं आया। आप कह सकते हैं: पोते को 50 यूरो भेजो। या पूछिए: मेरे पास कितने पैसे हैं?',
  help: () =>
    'मैं आपके रिसीवर्स को पैसे भेज सकता हूँ, नया रिसीवर जोड़ सकता हूँ, बैलेंस बता सकता हूँ, यह बता सकता हूँ कि पैसे पहुँचे या नहीं, ' +
    'और वाइज़ हेल्प सेंटर से सवालों के जवाब दे सकता हूँ। बस अपने शब्दों में बोलिए।',
  pinLocked: () => 'कोड तीन बार ग़लत बताया गया, इसलिए यह ट्रांसफ़र कैंसल कर दिया गया। कुछ नहीं भेजा गया।',
  amountInvalid: () => 'रक़म बताइए, जैसे 50 यूरो।',
  nothingToConfirm: () => 'अभी भेजने के लिए कुछ तैयार नहीं है। बताइए किसको और कितने पैसे भेजने हैं।',
  paused: () => 'मैंने कोई और आवाज़ सुनी, इसलिए रुक गया हूँ। कुछ नहीं भेजा गया। जब तैयार हों तो कहिए हे वाइज़।',
  welcomeBack: (p) => `फिर से स्वागत है, ${p.name}।`,
  voiceRequired: () => 'पहले मुझे आपकी आवाज़ सुननी है। कहिए हे वाइज़।',
  enrollIntro: (p) => `शुरू करने से पहले मुझे आपकी आवाज़ पहचानने दीजिए, ताकि सिर्फ़ आप पैसे भेज सकें। मेरे बाद दोहराइए: ${p.phrase}`,
  enrollNext: (p) => `धन्यवाद। अब कहिए: ${p.phrase}`,
  enrollRetry: (p) => `साफ़ सुनाई नहीं दिया। दोबारा कहिए: ${p.phrase}`,
  enrollDone: () => 'धन्यवाद। अब मैं आपकी आवाज़ पहचानता हूँ और सिर्फ़ आपकी बात सुनूँगा। बताइए क्या करना है?',
  goodbye: (p) => `अलविदा ${p.name}। जब ज़रूरत हो, कहिए हे वाइज़।`,
  standby: () => 'मैं इंतज़ार करता हूँ। जब ज़रूरत हो, कहिए हे वाइज़।',
  goneBack: () => 'ठीक है, फिर से चेक कर लेते हैं।',
  addAskName: () => 'नया रिसीवर जोड़ते हैं। उनका पूरा नाम क्या है?',
  addAskRelation: (p) => `${p.name} आपके क्या लगते हैं? जैसे पोता, पड़ोसी या दोस्त।`,
  addAskCountry: (p) => `${p.first} का बैंक किस देश में है?`,
  addCountryUnknown: (p) => `मैं इन देशों के बैंक जोड़ सकता हूँ: ${p.countries}। कौन सा देश है?`,
  addAskAccount: (p) => `${p.first} का अकाउंट नंबर धीरे-धीरे बताइए, थोड़ा-थोड़ा करके।`,
  addAccountInvalid: () => 'पूरा अकाउंट नंबर समझ नहीं आया। दोबारा धीरे-धीरे बताइए।',
  addConfirm: (p) =>
    `ज़रा चेक कर लीजिए। नाम: ${p.name}। ${p.relation}। बैंक: ${p.country}। अकाउंट नंबर: ${p.spelled}। ` +
    'क्या इन्हें जोड़ दूँ? कहिए हाँ, या कहिए नहीं।',
  addDone: (p) => `हो गया। ${p.name} अब आपके रिसीवर्स में हैं, और ${p.helper} को बता दिया गया है। पैसे भेजने के लिए बस रक़म बताइए।`,
  addCancelled: () => 'ठीक है, किसी को नहीं जोड़ा।',
  helpArticle: () => 'वाइज़ हेल्प सेंटर में इस बारे में एक लेख है। मैंने इसे स्क्रीन पर दिखा दिया है।',
  helpNothing: () => 'यह वाइज़ हेल्प सेंटर में नहीं मिला। आप फ़ीस, ट्रांसफ़र के समय, कैंसल करने या लिमिट के बारे में पूछ सकते हैं।',
  helpTopic_fees: () => 'आम तौर पर फ़ीस करेंसी और रक़म पर निर्भर करती है। भेजने से पहले आपको हमेशा सही फ़ीस और यह कि दूसरे को कितना मिलेगा, दिखाया जाता है।',
  helpTopic_speed: () =>
    'आम तौर पर कई ट्रांसफ़र कुछ सेकंड में या उसी दिन पहुँच जाते हैं। कुछ में ज़्यादा समय लगता है, जैसे छुट्टियों या अतिरिक्त जाँच की वजह से। भेजने से पहले अंदाज़ा दिखाया जाता है।',
  helpTopic_cancel: () => 'आम तौर पर ट्रांसफ़र तब तक कैंसल हो सकता है जब तक पैसे भुगतान न हुए हों। पैसे पहुँच जाएँ तो कैंसल नहीं हो सकता।',
  helpTopic_limits: () => 'आम तौर पर भेजने की रक़म की सीमा होती है जो आपके देश और करेंसी पर निर्भर है। बड़ी रक़म के लिए अतिरिक्त काग़ज़ात चाहिए हो सकते हैं।',
  helpTopic_recipients: () => 'नया रिसीवर जोड़ने के लिए कहिए नया रिसीवर। सभी रिसीवर्स रिसीपिएंट्स टैब में हैं। भेजने से पहले बैंक की जानकारी ज़रूर जाँचिए।',
  helpTopic_card: () => 'अगर कार्ड खो जाए या चोरी हो जाए तो तुरंत ऐप में उसे फ़्रीज़ कीजिए, फिर नया कार्ड मँगाइए।',
  helpTopic_scam: () => 'वाइज़ कभी पैसे किसी सुरक्षित अकाउंट में भेजने को नहीं कहता। अगर कोई आप पर दबाव डाले तो रुकिए और किसी भरोसेमंद से बात कीजिए।',
  helpTopic_status: () => 'सभी ट्रांसफ़र और उनकी स्थिति पेमेंट्स टैब में है। आप मुझसे भी पूछ सकते हैं: क्या पैसे पहुँच गए?'
};

export const MESSAGES = { en, et, ru, uk, ur, hi };

export const HELP_TOPICS = ['fees', 'speed', 'cancel', 'limits', 'recipients', 'card', 'scam', 'status'];

export function render(key, lang, params = {}) {
  const table = MESSAGES[lang] || MESSAGES.en;
  const template = table[key] || MESSAGES.en[key];
  if (!template) throw new Error(`Unknown message key: ${key}`);
  return template(params);
}
