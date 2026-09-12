(() => {
  if (window.top === window.self) return;

  try {
    const hostWindow = window.parent;
    const hostDocument = hostWindow.document;
    const path = location.pathname;
    const issue = path.includes('issue3') ? 'issue3' : (path.includes('issue2') ? 'issue2' : 'issue1');

    const currentState = hostWindow.history.state || {};
    if (currentState.imamverseReader !== issue) {
      hostWindow.history.pushState(
        { ...currentState, imamverseReader: issue },
        '',
        hostWindow.location.href
      );
    }

    if (!hostWindow.__imamverseReaderHistoryHandler) {
      hostWindow.__imamverseReaderHistoryHandler = (event) => {
        const targetIssue = event.state && event.state.imamverseReader;
        const overlay = hostDocument.getElementById('readerOverlay');
        const frame = hostDocument.getElementById('readerFrame');
        const title = hostDocument.getElementById('readerOverlayTitle');

        if (targetIssue === 'issue1' || targetIssue === 'issue2' || targetIssue === 'issue3') {
          const side = hostDocument.body.dataset.side || hostWindow.localStorage.getItem('imamverse_side') || 'imam';
          const readers = {
            issue1: { path: '/issue1/', src: 'issue1/', title: 'ÏMAM · Issue One — Days Before Reincarnation' },
            issue2: { path: '/issue2/', src: 'issue2/', title: 'ÏMAM · Issue Two — The Reincarnation' },
            issue3: { path: '/issue3/', src: 'issue3/', title: 'ÏMAM · Issue Three — Beyond Reincarnation' }
          };
          const selected = readers[targetIssue];

          if (frame && !frame.src.includes(selected.path)) {
            frame.src = selected.src + '?side=' + encodeURIComponent(side);
          }

          if (title) title.textContent = selected.title;

          if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
          }
          hostDocument.body.style.overflow = 'hidden';
          return;
        }

        if (overlay) {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
        }
        if (frame) frame.src = 'about:blank';
        hostDocument.body.style.overflow = '';
      };

      hostWindow.addEventListener('popstate', hostWindow.__imamverseReaderHistoryHandler);
    }
  } catch (e) {
    // If the reader is opened directly instead of inside the site overlay,
    // normal browser history remains unchanged.
  }
})();
