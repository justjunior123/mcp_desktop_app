import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{
            __html: `
            if (typeof Symbol === 'undefined' || !Symbol.iterator) {
              Object.defineProperty(window, 'Symbol', {
                value: function Symbol(description) {
                  return 'Symbol(' + description + ')';
                },
                writable: true,
                enumerable: false,
                configurable: true
              });
              
              Object.defineProperty(Symbol, 'iterator', {
                value: Symbol('iterator'),
                writable: false,
                enumerable: false,
                configurable: false
              });

              if (!Object.prototype[Symbol.iterator]) {
                Object.defineProperty(Object.prototype, Symbol.iterator, {
                  value: function* () {
                    for (const key of Object.keys(this)) {
                      yield this[key];
                    }
                  },
                  writable: true,
                  enumerable: false,
                  configurable: true
                });
              }
              }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 