// @ts-ignore: Next.js types
// eslint-disable-next-line import/no-unresolved
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Stub webpack module loader to prevent HMR crashes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // No-op webpack require function to satisfy HMR runtime
              window.__webpack_require__ = function() {};
              // Dummy require to avoid errors
              window.require = function(moduleId) { return {}; };
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Ensure Symbol exists and iterator
              if (typeof Symbol === 'undefined') {
                window.Symbol = function Symbol(description) { return 'Symbol(' + description + ')'; };
              }
              if (!Symbol.iterator) {
                Object.defineProperty(Symbol, 'iterator', {
                  value: Symbol('iterator'),
                  writable: false,
                  enumerable: false,
                  configurable: false
                });
              }
              // Polyfill global and process for HMR
              window.global = window;
              window.process = window.process || { env: { NODE_ENV: (window.process && window.process.env && window.process.env.NODE_ENV) || 'development', ELECTRON_HMR: true }, browser: true };
              // Stub HMR update hook
              Object.defineProperty(window, 'webpackHotUpdate_N_E', {
                configurable: true,
                writable: true,
                value: undefined
              });
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}