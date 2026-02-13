(function () {
  'use strict';

  var AVA_URL = document.currentScript
    ? document.currentScript.src.replace('/embed.js', '')
    : 'https://ava.uchooseweprint.com';

  var BUTTON_SIZE = 56;
  var WIDGET_WIDTH = 400;
  var WIDGET_HEIGHT = 650;
  var isOpen = false;

  // Create floating button
  var button = document.createElement('button');
  button.id = 'ava-trigger';
  button.setAttribute('aria-label', 'Chat with Ava');
  button.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '99999',
    width: BUTTON_SIZE + 'px',
    height: BUTTON_SIZE + 'px',
    borderRadius: '50%',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(139,92,246,0.3)',
    transition: 'transform 0.2s, background-color 0.2s',
  });

  // Online indicator
  var dot = document.createElement('span');
  Object.assign(dot.style, {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#34d399',
    border: '2px solid #0a0a0f',
  });
  button.appendChild(dot);

  button.onmouseenter = function () {
    button.style.transform = 'scale(1.05)';
  };
  button.onmouseleave = function () {
    button.style.transform = 'scale(1)';
  };

  // Create iframe container
  var container = document.createElement('div');
  container.id = 'ava-widget';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '90px',
    right: '24px',
    zIndex: '99998',
    width: WIDGET_WIDTH + 'px',
    height: WIDGET_HEIGHT + 'px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    display: 'none',
    transition: 'opacity 0.2s, transform 0.2s',
    opacity: '0',
    transform: 'translateY(10px) scale(0.98)',
  });

  var iframe = document.createElement('iframe');
  iframe.src = AVA_URL + '/embed';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.setAttribute('title', 'Ava AI Assistant');
  iframe.setAttribute('loading', 'lazy');
  container.appendChild(iframe);

  // Toggle logic
  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      container.style.display = 'block';
      // Force reflow for transition
      void container.offsetHeight;
      container.style.opacity = '1';
      container.style.transform = 'translateY(0) scale(1)';
      button.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    } else {
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px) scale(0.98)';
      setTimeout(function () {
        container.style.display = 'none';
      }, 200);
      button.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
      button.appendChild(dot);
    }
  }

  button.onclick = toggle;

  // Inject into page
  document.body.appendChild(container);
  document.body.appendChild(button);
})();
