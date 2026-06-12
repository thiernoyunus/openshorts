import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Landing from './Landing.jsx'
import Legal from './Legal.jsx'
import EditorView from './components/editor/EditorView.jsx'

// Dev harness: open /?editorDev=1 to mount the clip editor against local
// fixtures (put demo-source.mp4 + demo.framing.json in
// dashboard/public/dev-fixtures/ — gitignored). Lets you work on the editor
// without processing a job first.
const EDITOR_DEV_FIXTURE = {
  framing_url: '/dev-fixtures/demo.framing.json',
  source_url: '/dev-fixtures/demo-source.mp4',
  video_title_for_youtube_short: 'Editor dev fixture',
};

function Root() {
  const resolveView = () => {
    const hash = window.location.hash;
    if (hash === '#legal') return 'legal';
    if (hash === '#app' || localStorage.getItem('openshorts_skip_landing') === '1') return 'app';
    return 'landing';
  };

  const [view, setView] = useState(resolveView);

  useEffect(() => {
    const handleHashChange = () => setView(resolveView());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLaunchApp = () => {
    localStorage.setItem('openshorts_skip_landing', '1');
    window.location.hash = '#app';
    setView('app');
  };

  if (new URLSearchParams(window.location.search).has('editorDev')) {
    return (
      <EditorView
        clip={EDITOR_DEV_FIXTURE}
        index={0}
        jobId="dev"
        onClose={() => window.location.assign(window.location.pathname)}
      />
    );
  }
  if (view === 'legal') return <Legal />;
  if (view === 'app') return <App />;
  return <Landing onLaunchApp={handleLaunchApp} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
