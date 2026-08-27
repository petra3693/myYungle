<!--
  Source of truth for legal.privacy.* i18n keys (src/i18n/locales/*.json) and
  public/privacy.html. Each `##` heading and paragraph below maps 1:1 to a
  key in src/legal/legalContent.ts — keep them in the same order.

  Fill in every <<KITÖLTENDŐ: ...>> placeholder with real, verified company
  data before publishing to the App Store / Play Store. Do not guess or
  invent values for these.
-->

# Privacy Policy

Last updated: August 27, 2026

myJungle (“the App”) helps you track plant watering schedules and plant care. This policy explains what data the App keeps on your device, what it sends elsewhere, who processes it, how long it is kept, and how you can delete it.

## What stays on your device

Your plant profiles (names, photos, watering schedules, care notes, health and growth history) and your app settings (language, notification preferences, subscription status cache) are stored locally on your device, in the App's local storage. This data is not uploaded to our own servers and is not visible to us.

## What we send elsewhere, and why

When you photograph a plant for identification, health diagnosis, or growth tracking, that photo is sent to our AI provider, Google (Gemini API), solely to generate the requested result (plant species, care profile, health assessment, or growth comparison). The photo and prompt are transmitted for that single request; we do not retain a copy of your photos on our own servers beyond what is needed to relay the request and return the result to your device. This processing is carried out on the legal basis of Art. 6(1)(b) GDPR (performance of a contract), because it is necessary to provide the plant-care feature you have actively requested.

If you submit feedback through the in-app feedback form, its text (and any photo you choose to attach) is delivered to us via our feedback-delivery provider so we can read and respond to it. This processing is carried out on the legal basis of Art. 6(1)(a) GDPR (your consent), given by voluntarily submitting the form.

If analytics is enabled in your app version, we use PostHog to record basic, non-identifying product-usage events (for example, which screens or features are used) so we can understand and improve the App. This processing is carried out on the legal basis of Art. 6(1)(f) GDPR (our legitimate interest in maintaining and improving the App); you can object to this processing at any time — see "Your rights" below.

## Who processes data on our behalf

- **Google (Gemini API)** — processes plant photos you submit for AI identification, health, and growth analysis. Google's own privacy policy governs how it handles that request data; we do not control Google's retention practices for API traffic.
- **RevenueCat** — manages subscriptions and purchase entitlements on our behalf. RevenueCat receives your purchase and subscription status from the App Store / Play Store so the App can unlock Pro features; it does not receive your payment card details. This processing is carried out on the legal basis of Art. 6(1)(b) GDPR (performance of your purchase/subscription contract).
- **PostHog** — if analytics is enabled, receives the usage events described above together with an anonymous device identifier. It does not receive your name, e-mail address, or plant data.
- **Vercel** — hosts the App's backend (serverless functions) that relay AI analysis requests and feedback submissions. Vercel processes this traffic on our behalf, under the same legal bases described above, as our hosting infrastructure provider.

We do not sell your personal data, and we do not use your plant photos to train our own models.

## International data transfers

Google, RevenueCat, and Vercel are based in the United States. Where your personal data is transferred to these providers outside the European Economic Area, that transfer is safeguarded by the European Commission's Standard Contractual Clauses (SCCs), which each provider has committed to as part of its data processing terms with us.

## How long we keep data

Data stored locally on your device (plants, photos, settings, history) is kept for as long as the App is installed, or until you delete it yourself. We do not keep a server-side copy of your plant data. Purchase and subscription records are retained by RevenueCat and the App Store / Play Store per their own retention policies, for as long as needed to support your subscription, provide refunds, and meet accounting/legal obligations.

## How to delete your data

You can permanently delete all locally stored plant data, photos, and settings at any time from **Settings → Reset data** inside the App. This action is immediate and cannot be undone. To also request deletion of purchase history held by Apple, Google, or RevenueCat, contact them directly, or contact us at the address below and we will forward a deletion request on your behalf where we are able to.

## Children's privacy

The App is not directed at children under 13 (or the minimum age required by your local law), and we do not knowingly collect personal data from children.

## Your rights

Under Articles 15 to 21 of the GDPR, you have the right to request access to, rectification of, or erasure of your personal data, to request that we restrict its processing, to receive a copy of it in a portable, machine-readable format, and to object to processing we carry out on the basis of our legitimate interest (see "Who processes data on our behalf" above). To exercise any of these rights, contact us using the details in the Contact section below.

You also have the right to lodge a complaint with a data protection supervisory authority, in particular the Berlin Commissioner for Data Protection and Freedom of Information (Berliner Beauftragte für Datenschutz und Informationsfreiheit), or the supervisory authority of your own country of residence.

## Contact

For privacy questions or data deletion requests, use the in-app feedback form or contact us at raving.pascal@gmail.com. Operator details are listed in the [Impressum](./impressum.md).

## Changes to this policy

We may update this Privacy Policy from time to time to reflect changes to the App or applicable law. Continued use of the App after changes take effect constitutes your acceptance of the revised policy.
