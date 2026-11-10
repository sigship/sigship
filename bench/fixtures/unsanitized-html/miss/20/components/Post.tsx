const GTM = `(function(w,d,s,l,i){w[l]=w[l]||[];})(window,document,'script','dataLayer','GTM-XXXX');`;
export const Gtm = () => <script dangerouslySetInnerHTML={{ __html: GTM }} />;
