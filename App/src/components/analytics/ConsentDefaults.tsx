import Script from 'next/script'

/**
 * Injects Google Consent Mode v2 default state as early as possible.
 * Defaults deny for all categories with a short wait_for_update window so
 * the banner can update consent before analytics/ad tags initialize.
 */
export default function ConsentDefaults() {
  return (
    <>
      <Script id="consent-defaults" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 

          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'analytics_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });

          // Optional: enable ads data redaction until consent granted
          gtag('set', 'ads_data_redaction', true);
        `}
      </Script>
    </>
  )
}


