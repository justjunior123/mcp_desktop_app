import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.global = window;
                window.process = window.process || {
                  env: { NODE_ENV: '${process.env.NODE_ENV}' }
                };
                window.Buffer = window.Buffer || {
                  isBuffer: function(obj) { return false; },
                  from: function() { return new Uint8Array(); }
                };
              }
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