function Error({ statusCode }) { return <p>{statusCode ? `Error ${statusCode}` : 'Client error'}</p>; }
Error.getInitialProps = ({ res, err }) => ({ statusCode: res?.statusCode ?? err?.statusCode ?? 404 });
export default Error;
