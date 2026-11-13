import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api } from './api.js';
import { engine } from './voice/engine.js';
import Home from './components/home/Home.jsx';
import { Recipients, Payments, Cards } from './components/home/OtherTabs.jsx';
import BottomNav from './components/home/BottomNav.jsx';
import AskFab from './components/home/AskFab.jsx';
import AskWise from './components/ask/AskWise.jsx';
import PresenterPanel from './components/presenter/PresenterPanel.jsx';
import { Close } from './components/Icons.jsx';

const params = new URLSearchParams(window.location.search);
const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* fine without storage */
  }
};

export default function App() {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const [tab, setTab] = useState('home');
  const [lang, setLang] = useState(() => params.get('lang') || read('wv.lang', 'en'));
  const [ask, setAsk] = useState(null); // null = closed, otherwise { opening }
  const [handsFree, setHandsFree] = useState(() => (params.get('handsfree') === '0' ? false : read('wv.handsFree', true)));
  const [firstVisit, setFirstVisit] = useState(() => params.get('tip') !== '0' && read('wv.firstVisit', true));
  const [panelOpen, setPanelOpen] = useState(false);
  const voice = useSyncExternalStore(engine.subscribe, engine.getState);
  const openingKey = useRef(0);

  const load = useCallback(async () => {
    try {
      setData(await api.bootstrap());
      setProblem('');
    } catch {
      setProblem('The server is not answering. Start it with "npm start" and reload this page.');
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const live = await api.state();
      setData((current) => (current ? { ...current, ...live } : current));
    } catch {
      /* keep the last state */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, [load, refresh]);

  const changeLanguage = useCallback((code) => {
    setLang(code);
    write('wv.lang', code);
  }, []);

  // Opening Ask Wise is the tap that lets the browser use the microphone and speak.
  const openAsk = useCallback((opening = {}) => {
    engine.enable();
    setFirstVisit(false);
    write('wv.firstVisit', false);
    setPanelOpen(false);
    openingKey.current += 1;
    setAsk({ opening: { ...opening, key: openingKey.current } });
  }, []);

  const closeAsk = useCallback(() => {
    setAsk(null);
    refresh();
  }, [refresh]);

  // Hands-free on the home screen: wait for "Hey Wise", then open Ask Wise.
  useEffect(() => {
    if (ask || !handsFree || !voice.enabled || !voice.canListen) return undefined;
    let cancelled = false;
    engine.waitForWake({ locale: 'en-US' }).then((heard) => {
      if (!cancelled && heard) openAsk({ wake: heard });
    });
    return () => {
      cancelled = true;
      engine.cancelWake();
    };
  }, [ask, handsFree, voice.enabled, voice.canListen, openAsk]);

  const changed = useCallback((info) => {
    if (info?.reset) {
      setAsk(null);
      load();
    } else {
      refresh();
    }
  }, [load, refresh]);

  const setHands = (value) => {
    setHandsFree(value);
    write('wv.handsFree', value);
    if (value) engine.enable();
    else engine.stopAll();
  };

  if (!data) {
    return (
      <div className="stage">
        <div className="phone phone-loading"><p>{problem || 'Opening…'}</p></div>
      </div>
    );
  }

  const language = data.languages.some((item) => item.code === lang) ? lang : 'en';
  const panel = (
    <PresenterPanel
      data={data}
      lang={language}
      onLang={changeLanguage}
      handsFree={handsFree}
      onHandsFree={setHands}
      onAsk={openAsk}
      onChanged={changed}
      onEnable={() => engine.enable()}
    />
  );

  return (
    <div className="stage" onPointerDown={() => voice.ttsBlocked && engine.enable()}>
      <div className="phone">
        <div className="screen" inert={ask ? true : undefined}>
          {tab === 'home' && <Home data={data} onAsk={openAsk} onSeeAll={() => setTab('payments')} onProfile={() => setPanelOpen(true)} />}
          {tab === 'cards' && <Cards data={data} />}
          {tab === 'recipients' && <Recipients data={data} onAsk={openAsk} />}
          {tab === 'payments' && <Payments data={data} />}
        </div>
        {!ask && (
          <AskFab
            firstVisit={firstVisit}
            onOpen={() => openAsk({ event: { type: 'start' } })}
            onLater={() => { setFirstVisit(false); write('wv.firstVisit', false); }}
            wakeListening={voice.mode === 'wake'}
          />
        )}
        <BottomNav tab={tab} onChange={setTab} />
        <span className="proto-tag">Prototype · demo data</span>
        {ask && (
          <AskWise data={data} lang={language} onLang={changeLanguage} opening={ask.opening} handsFree={handsFree} onClose={closeAsk} onChanged={changed} />
        )}
        {panelOpen && (
          <div className="panel-sheet">
            <button type="button" className="close-btn panel-close" aria-label="Close" onClick={() => setPanelOpen(false)}><Close size={20} color="#0E0F0C" /></button>
            {panel}
          </div>
        )}
      </div>
      <div className="presenter-wrap">{panel}</div>
    </div>
  );
}
