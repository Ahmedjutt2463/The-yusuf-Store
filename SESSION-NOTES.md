# The Yusuf Store — Session Handoff Notes
> Last updated: 1 Aug 2026 (after commit 3f3a795)

## Repo & Deploy
- Repo: https://github.com/Ahmedjutt2463/The-yusuf-Store.git (branch: `master`)
- Local path: `C:\Users\mahme\OneDrive\Desktop\Opencode testing`
- Hosting: Vercel — user MUST manually redeploy after each push to see changes live.
- Homepage: https://www.scentsbyyusuf.com (308-redirects to www; use `https://www.scentsbyyusuf.com` in tests/links).

## Credentials (do not share)
- SMTP host `smtpout.secureserver.net`, port 465, secure; user `info@scentsbyyusuf.com`, pass `Ahmed@8911`.
- ADMIN_EMAIL env (Vercel) = `ahmed.jutt2463@gmail.com` (receives contact-form + order notifications).

## DNS / Email (SPF)
- MX: mx1/mx2.titan.email; DMARC: `v=DMARC1; p=none;` (OK).
- **SPF was edited in GoDaddy** (goDaddy `@` TXT, single record) to:
  `v=spf1 include:spf.titan.email include:secureserver.net ~all`
- Status at last check: propagation was pending (old Titan-only SPF still cached). **Re-verify before trusting email delivery.** Gmail was rejecting mail with "sender domain does not pass spf requirements" before the edit.

## Products & Photos
- **Nutrition category** (nutrition.html) — Bio Oatmeal (N1.1–N1.5), Bio Fit Tea (N2.1–N2.5), Bio Detox Tea (N3.1–N3.5). Real photos + thumbnail galleries in place.
- **Skin care** (skincare.html): Revive Hair Gel (R1.1–R1.3), Gloied Drinkable (G1–G5), Lypospheric C (L1–L5).
- **Derma** (derma.html): Revive Hair Gel (R1.1–R1.3), Ovasetal (O1–O5), Diab Cure (D1–D5), Testim (T1–T5).
- **Perfumes** (codex.html / xocoaura.html / sweethead.html): P1/P2/P3 images + PV1/PV2/PV3 videos with video-thumbnail galleries.
- Naming fixed: "Gloid" → **Gloied**, "Hair Revive Gel" → **Revive Hair Gel** (filenames unchanged).

## Features / Recent Work
- Contact form works end-to-end (api/contact.js serverless + server.js local mirror); live endpoint tested OK.
- Instagram (`https://www.instagram.com/theyusufstore`) + WhatsApp (`0336-8877666` → wa.me/923368877666) in footers of all pages.
- Full theme restyle to indigo SaaS theme (Inter font, rounded cards, light/dark toggle).
- Thumbnail switching fixed via `switchImage()` in script.js (nutrition pages were broken).
- Touch-swipe on all product galleries (`gallerySwipe()` in script.js) + `touch-action: pan-y` to stop page shake + smooth img fade.
- Add to Cart / Buy Now buttons are equal-width and aligned on all screens.
- Cart → checkout flow works with email confirmations.

## How to start later
1. `git pull` in the project folder (if prompted by opencode).
2. Ask user to redeploy on Vercel if new commits were pushed.
3. Pending tasks from last session: none outstanding; check SPF propagation status.

## Full commit log (newest → oldest)
3f3a795 Rename Gloid→Gloied, Hair Revive Gel→Revive Hair Gel
82bf2af Align Add to Cart / Buy Now buttons equal width
9699a6d Prevent page shake on swipe + smooth image fade
e5a6521 Fix thumbnail switching (switchImage) + touch swipe galleries
bee3025 Bio Detox Tea real photos (N3.1–N3.5)
eb184a3 Bio Fit Tea real photos (N2.1–N2.5)
714b8ce Bio Oatmeal real photos (N1.1–N1.5)
92ec0e1 Add Bio Fit Tea + Bio Detox Tea product pages
e0a98ac Add Bio Oatmeal + Nutrition category
95fe1f9 Restyle store with indigo SaaS theme
77d817d Testim photos (T1–T5)
de49c62 Gloied/Ovasetal/Diab Cure real photos
b1dae2f Lypospheric C photos (L1–L5)
8b8b05f Instagram + WhatsApp footer links
ce268f6 Contact form working
