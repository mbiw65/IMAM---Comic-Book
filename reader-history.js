(() => {
  if (window.top === window.self) return;

  try {
    const hostWindow = window.parent;
    const hostDocument = hostWindow.document;
    const hostFrame = window.frameElement;
    const issue = location.pathname.includes('issue2') ? 'issue2' : 'issue1';

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

        if (targetIssue === 'issue1' || targetIssue === 'issue2') {
          const one = targetIssue === 'issue1';
          const side = hostDocument.body.dataset.side || hostWindow.localStorage.getItem('imamverse_side') || 'imam';
          const expectedPath = one ? '/issue1/' : '/issue2/';

          if (frame && !frame.src.includes(expectedPath)) {
            frame.src = (one ? 'issue1/' : 'issue2/') + '?side=' + encodeURIComponent(side);
          }

          if (title) {
            title.textContent = one
              ? 'ÏMAM · Issue One — Days Before Reincarnation'
              : 'ÏMAM · Issue Two — The Reincarnation';
          }

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
