// Demo data, matching the design: Galina in Tallinn sending money to family.
// Everything here is invented: no real people, accounts or money.
// Edit this file to change the persona, the saved people or the starting balance.

export function createSeed() {
  return {
    profile: {
      id: 'profile-1',
      fullName: 'Galina Kuznetsova',
      initials: 'GK',
      firstName: { en: 'Galina', et: 'Galina', ru: 'Галина', uk: 'Галино', ur: 'گالینا', hi: 'गलीना' },
      city: 'Tallinn',
      baseCurrency: 'EUR'
    },

    balance: { currency: 'EUR', amount: 1240.5 },

    // The trusted family member who is told about activity and warnings.
    helper: {
      id: 'helper-1',
      fullName: 'Olena Kovalenko',
      name: { en: 'Olena', et: 'Olena', ru: 'Олена', uk: 'Олена', ur: 'اولینا', hi: 'ओलेना' },
      relationship: 'Daughter',
      phone: '+372 5550 1234'
    },

    recipients: [
      {
        id: 'r-artem-kovalenko',
        name: { en: 'Artem Kovalenko', et: 'Artem Kovalenko', ru: 'Артём Коваленко', uk: 'Артем Коваленко', ur: 'آرتیم کووالینکو', hi: 'आर्तेम कोवालेंको' },
        first: { en: 'Artem', et: 'Artem', ru: 'Артём', uk: 'Артем', ur: 'آرتیم', hi: 'आर्तेम' },
        relation: { en: 'Grandson', et: 'Lapselaps', ru: 'Внук', uk: 'Онук', ur: 'پوتا', hi: 'पोता' },
        relationPhrase: { en: 'your grandson', et: 'teie lapselaps', ru: 'ваш внук', uk: 'ваш онук', ur: 'آپ کے پوتے', hi: 'आपके पोते' },
        pronoun: 'he',
        country: 'Poland',
        bank: 'Polish bank',
        currency: 'PLN',
        accountHint: '••4821',
        color: '#FFC091',
        match: {
          full: ['artem kovalenko', 'artyom kovalenko', 'артем коваленко', 'артём коваленко', 'آرتیم کووالینکو', 'आर्तेम कोवालेंको'],
          first: ['artem', 'artyom', 'artemi', 'artemile', 'артем', 'артём', 'артему', 'артёму', 'آرتیم', 'आर्तेम'],
          relation: ['grandson', 'grandchild', 'lapselaps', 'lapselapsele', 'pojapoeg', 'pojapojale', 'внук', 'внуку', 'внука', 'онук', 'онуку', 'онука', 'pota', 'pote', 'پوتا', 'پوتے', 'पोता', 'पोते']
        }
      },
      {
        id: 'r-artem-petrov',
        name: { en: 'Artem Petrov', et: 'Artem Petrov', ru: 'Артём Петров', uk: 'Артем Петров', ur: 'آرتیم پیتروف', hi: 'आर्तेम पेत्रोव' },
        first: { en: 'Artem', et: 'Artem', ru: 'Артём', uk: 'Артем', ur: 'آرتیم', hi: 'आर्तेम' },
        relation: { en: 'Neighbour', et: 'Naaber', ru: 'Сосед', uk: 'Сусід', ur: 'پڑوسی', hi: 'पड़ोसी' },
        relationPhrase: { en: 'your neighbour', et: 'teie naaber', ru: 'ваш сосед', uk: 'ваш сусід', ur: 'آپ کے پڑوسی', hi: 'आपके पड़ोसी' },
        pronoun: 'he',
        country: 'Estonia',
        bank: 'Estonian bank',
        currency: 'EUR',
        accountHint: '••7730',
        color: '#C9E7FF',
        match: {
          full: ['artem petrov', 'artyom petrov', 'артем петров', 'артём петров', 'آرتیم پیتروف', 'आर्तेम पेत्रोव'],
          first: ['artem', 'artyom', 'artemi', 'artemile', 'артем', 'артём', 'артему', 'артёму', 'آرتیم', 'आर्तेम'],
          relation: ['neighbour', 'neighbor', 'naaber', 'naabrile', 'сосед', 'соседу', 'соседа', 'сусід', 'сусіду', 'сусіда', 'padosi', 'پڑوسی', 'पड़ोसी']
        }
      },
      {
        id: 'r-olena-kovalenko',
        name: { en: 'Olena Kovalenko', et: 'Olena Kovalenko', ru: 'Олена Коваленко', uk: 'Олена Коваленко', ur: 'اولینا کووالینکو', hi: 'ओलेना कोवालेंको' },
        first: { en: 'Olena', et: 'Olena', ru: 'Олена', uk: 'Олена', ur: 'اولینا', hi: 'ओलेना' },
        relation: { en: 'Daughter', et: 'Tütar', ru: 'Дочь', uk: 'Донька', ur: 'بیٹی', hi: 'बेटी' },
        relationPhrase: { en: 'your daughter', et: 'teie tütar', ru: 'ваша дочь', uk: 'ваша донька', ur: 'آپ کی بیٹی', hi: 'आपकी बेटी' },
        pronoun: 'she',
        country: 'Ukraine',
        bank: 'Ukrainian bank',
        currency: 'UAH',
        accountHint: '••1196',
        color: '#FFD7EF',
        match: {
          full: ['olena kovalenko', 'elena kovalenko', 'олена коваленко', 'елена коваленко', 'اولینا کووالینکو', 'ओलेना कोवालेंको'],
          first: ['olena', 'elena', 'helena', 'olenale', 'олена', 'олене', 'елена', 'елене', 'اولینا', 'ओलेना'],
          relation: ['daughter', 'tütar', 'tütrele', 'дочь', 'дочери', 'дочке', 'дочка', 'донька', 'доньці', 'дочці', 'beti', 'بیٹی', 'बेटी']
        }
      },
      {
        id: 'r-dmitri-kuznetsov',
        name: { en: 'Dmitri Kuznetsov', et: 'Dmitri Kuznetsov', ru: 'Дмитрий Кузнецов', uk: 'Дмитро Кузнєцов', ur: 'دمتری کوزنیتسوف', hi: 'दमित्री कुज़्नेत्सोव' },
        first: { en: 'Dmitri', et: 'Dmitri', ru: 'Дмитрий', uk: 'Дмитро', ur: 'دمتری', hi: 'दमित्री' },
        relation: { en: 'Son', et: 'Poeg', ru: 'Сын', uk: 'Син', ur: 'بیٹا', hi: 'बेटा' },
        relationPhrase: { en: 'your son', et: 'teie poeg', ru: 'ваш сын', uk: 'ваш син', ur: 'آپ کے بیٹے', hi: 'आपके बेटे' },
        pronoun: 'he',
        country: 'Finland',
        bank: 'Finnish bank',
        currency: 'EUR',
        accountHint: '••3054',
        color: '#E2F6D5',
        match: {
          full: ['dmitri kuznetsov', 'dmitry kuznetsov', 'дмитрий кузнецов', 'дмитро кузнєцов', 'دمتری کوزنیتسوف', 'दमित्री कुज़्नेत्सोव'],
          first: ['dmitri', 'dmitry', 'dima', 'dmitrile', 'дмитрий', 'дмитрию', 'дима', 'диме', 'дмитро', 'дмитру', 'دمتری', 'दमित्री'],
          relation: ['son', 'poeg', 'pojale', 'сын', 'сыну', 'сына', 'син', 'сину', 'сина', 'beta', 'bete', 'بیٹا', 'بیٹے', 'बेटा', 'बेटे']
        }
      },
      {
        id: 'r-mart-tamm',
        name: { en: 'Mart Tamm', et: 'Mart Tamm', ru: 'Март Тамм', uk: 'Март Тамм', ur: 'مارٹ تام', hi: 'मार्ट ताम' },
        first: { en: 'Mart', et: 'Mart', ru: 'Март', uk: 'Март', ur: 'مارٹ', hi: 'मार्ट' },
        relation: { en: 'Landlord', et: 'Üürileandja', ru: 'Арендодатель', uk: 'Орендодавець', ur: 'مالک مکان', hi: 'मकान मालिक' },
        relationPhrase: { en: 'your landlord', et: 'teie üürileandja', ru: 'ваш арендодатель', uk: 'ваш орендодавець', ur: 'آپ کے مالک مکان', hi: 'आपके मकान मालिक' },
        pronoun: 'he',
        country: 'Estonia',
        bank: 'Estonian bank',
        currency: 'EUR',
        accountHint: '••6612',
        color: '#FFEB99',
        match: {
          full: ['mart tamm', 'март тамм', 'مارٹ تام', 'मार्ट ताम'],
          first: ['mart', 'mardile', 'март', 'марту', 'مارٹ', 'मार्ट'],
          relation: [
            'landlord', 'üürileandja', 'üürileandjale', 'korteriomanik', 'korteriomanikule', 'арендодатель', 'арендодателю',
            'хозяин квартиры', 'хозяину квартиры', 'орендодавець', 'орендодавцю', 'makan malik', 'مالک مکان', 'मकान मालिक'
          ]
        }
      }
    ],

    // Past activity, as in the design.
    transfers: [
      {
        id: 'tr-1003', reference: 'WV-1003', recipientId: 'r-artem-kovalenko', channel: 'app', status: 'completed',
        sourceAmount: 150, sourceCurrency: 'EUR', targetAmount: 636.12, targetCurrency: 'PLN',
        fee: 1.03, rate: 4.2701, createdAt: '2026-10-12T10:20:00.000Z', completesAt: '2026-10-12T10:24:00.000Z'
      },
      {
        id: 'tr-1001', reference: 'WV-1001', recipientId: 'r-mart-tamm', channel: 'app', status: 'completed',
        sourceAmount: 420, sourceCurrency: 'EUR', targetAmount: 419.75, targetCurrency: 'EUR',
        fee: 0.25, rate: 1, createdAt: '2026-10-01T08:00:00.000Z', completesAt: '2026-10-01T08:00:30.000Z'
      }
    ],

    // Card payments only appear in the activity list.
    cardPayments: [
      { id: 'cp-1', merchant: 'Rimi Kristiine', amount: 23.4, currency: 'EUR', createdAt: '2026-10-10T15:42:00.000Z' }
    ],

    alerts: [
      {
        id: 'al-1', type: 'transfer_sent', createdAt: '2026-10-12T10:20:00.000Z',
        title: 'Galina sent €150.00 to Artem Kovalenko',
        detail: 'Sent from the app. Artem received PLN 636.12.'
      }
    ]
  };
}
