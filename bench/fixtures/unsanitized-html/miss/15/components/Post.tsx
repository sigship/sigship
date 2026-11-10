export const Env = ({ env }) => <script dangerouslySetInnerHTML={{ __html: `window.__ENV__ = ${JSON.stringify(env)}` }} />;
