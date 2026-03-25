/**
 * WebView injection script generator.
 *
 * Produces a JavaScript string that, when injected into a WebView
 * (via injectedJavaScript on React Native WebView), creates a
 * bridge provider available as window.ethereum and window.goodWidget.provider.
 *
 * The injected provider communicates with the native side via
 * window.ReactNativeWebView.postMessage().
 */

import { GW_BRIDGE_NS, GW_BRIDGE_VERSION } from './protocol'

export interface WebViewInjectionOptions {
  /** Whether to also set window.ethereum (default true) */
  injectEthereum?: boolean
  /** Whether to also set window.goodWidget.provider (default true) */
  injectGoodWidgetAlias?: boolean
  /** Whether to announce via EIP-6963 (default true) */
  eip6963?: boolean
  /** EIP-6963 rdns (default 'org.gooddollar.goodwidget.bridge') */
  rdns?: string
  /** EIP-6963 display name */
  providerName?: string
}

/**
 * Generate the JavaScript source to inject into a WebView.
 *
 * Host should handle incoming messages from the WebView and route them
 * to the real provider using HostRouter or a custom handler.
 */
export function createWebViewBridgeScript(options: WebViewInjectionOptions = {}): string {
  const {
    injectEthereum = true,
    injectGoodWidgetAlias = true,
    eip6963 = true,
    rdns = 'org.gooddollar.goodwidget.bridge',
    providerName = 'GoodWidget Bridge',
  } = options

  // The script is a self-contained IIFE that creates the bridge provider.
  // It uses ReactNativeWebView.postMessage for RN and falls back to
  // window.parent.postMessage for web-based WebView containers.
  return `(function() {
  'use strict';
  var NS = '${GW_BRIDGE_NS}';
  var VERSION = '${GW_BRIDGE_VERSION}';
  var counter = 0;

  function genId() { return 'gw-' + Date.now() + '-' + (++counter); }

  var pending = {};
  var listeners = {};
  var sessionId = null;
  var readyResolve;
  var ready = new Promise(function(r) { readyResolve = r; });

  function postNative(msg) {
    var json = JSON.stringify(msg);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(json);
    } else if (window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }

  var provider = {
    isGoodWidgetBridge: true,

    request: function(args) {
      return ready.then(function() {
        return new Promise(function(resolve, reject) {
          var id = genId();
          var timer = setTimeout(function() {
            delete pending[id];
            reject(new Error('Bridge timeout: ' + args.method));
          }, 30000);
          pending[id] = { resolve: resolve, reject: reject, timer: timer };
          postNative({
            ns: NS, version: VERSION, type: 'request',
            id: id, sessionId: sessionId,
            method: args.method, params: args.params
          });
        });
      });
    },

    on: function(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },

    removeListener: function(event, fn) {
      var arr = listeners[event];
      if (!arr) return;
      listeners[event] = arr.filter(function(f) { return f !== fn; });
    }
  };

  function handleNativeMessage(raw) {
    var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.ns !== NS) return;

    if (data.type === 'init-ack') {
      sessionId = data.sessionId;
      readyResolve();
    } else if (data.type === 'response') {
      var p = pending[data.requestId];
      if (!p) return;
      delete pending[data.requestId];
      clearTimeout(p.timer);
      if (data.error) {
        var err = new Error(data.error.message);
        err.code = data.error.code;
        err.data = data.error.data;
        p.reject(err);
      } else {
        p.resolve(data.result);
      }
    } else if (data.type === 'event') {
      var arr = listeners[data.event];
      if (arr) arr.forEach(function(fn) { try { fn(data.data); } catch(e) {} });
    }
  }

  // Listen for messages from native side
  document.addEventListener('message', function(e) { handleNativeMessage(e.data); });
  window.addEventListener('message', function(e) { handleNativeMessage(e.data); });

  // Inject as window.ethereum
  ${injectEthereum ? 'window.ethereum = provider;' : ''}

  // Inject as window.goodWidget.provider
  ${injectGoodWidgetAlias ? `
  if (!window.goodWidget) window.goodWidget = {};
  window.goodWidget.provider = provider;
  ` : ''}

  // EIP-6963 announcement
  ${eip6963 ? `
  var detail = Object.freeze({
    info: Object.freeze({
      uuid: genId(),
      name: '${providerName}',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%2300AEFF"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="white">G</text></svg>',
      rdns: '${rdns}'
    }),
    provider: provider
  });
  function announce() {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: detail }));
  }
  announce();
  window.addEventListener('eip6963:requestProvider', announce);
  ` : ''}

  // Initiate handshake
  postNative({ ns: NS, version: VERSION, type: 'init', id: genId() });

  true; // Required for RN WebView injectedJavaScript
})();`
}
