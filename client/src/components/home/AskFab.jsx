import { Mic } from '../Icons.jsx';

// The round green mic button from the design. On the first visit it grows
// into "Ask Wise" with a tip, as in screen 02.
export default function AskFab({ firstVisit, onOpen, onLater, wakeListening }) {
  if (firstVisit) {
    return (
      <>
        <div className="tip wv-pop" role="dialog" aria-label="Ask Wise tip">
          <p className="tip-new">NEW</p>
          <p className="tip-title">Just say what you need</p>
          <p className="tip-body">Speak or type to send money quickly and easily. Next time, just say “Hey Wise”.</p>
          <div className="tip-actions">
            <button type="button" className="pill-btn pill-btn-green wv-btn" onClick={onOpen}>Try it</button>
            <button type="button" className="link-btn" onClick={onLater}>Later</button>
          </div>
          <span className="tip-arrow" />
        </div>
        <button type="button" className="ask-pill wv-btn wv-grow" onClick={onOpen} aria-label="Ask Wise. Speak or type to send money">
          <span className="ask-pill-dot">
            <span className="wv-ring" />
            <span className="ask-pill-icon"><Mic size={22} width={2.2} /></span>
          </span>
          <span className="ask-pill-label wv-lbl">Ask Wise</span>
        </button>
      </>
    );
  }
  return (
    <>
      {wakeListening && (
        <span className="wake-chip" aria-live="polite">
          <span className="wake-dot" /> Say “Hey Wise”
        </span>
      )}
      <button type="button" className="ask-fab wv-in" onClick={onOpen} aria-label="Ask Wise. Speak or type to send money">
        <span className="ask-fab-pulse wv-pulse" />
        <span className="ask-fab-face wv-press"><Mic size={24} width={2.2} /></span>
      </button>
    </>
  );
}
