# Native setup — camera & photo permissions

Covers what iOS and Android need declared for the native photo-capture path
(`src/lib/cameraCapture.ts`, used by `BatchCaptureScreen`, `ManualAddScreen`,
`HealthCheckFlowScreen`, `GrowthCheckScreen` on native platforms — the web
build keeps using a plain `<input type="file">` and needs none of this).

## iOS — Info.plist keys

`Camera.getPhoto({ source: CameraSource.Prompt })` lets the user pick either
the camera or the photo library, so iOS requires a usage-description string
for **both**, or the app crashes the moment either path is opened:

| Key | Required because |
|---|---|
| `NSCameraUsageDescription` | `CameraSource.Prompt` can open the camera |
| `NSPhotoLibraryUsageDescription` | `CameraSource.Prompt` can open the photo library |

`ios/App/App/Info.plist` already has both (auto-added by Capacitor's iOS
template) plus a third key, `NSPhotoLibraryAddUsageDescription` — that one is
**not needed** by this feature: it only applies when `saveToGallery: true` is
passed to the Camera plugin, which `captureNativePhoto()` never does (we only
read a photo, never write one back to the library). It's harmless to leave,
but there's nothing in the app that exercises it — worth removing the next
time someone touches Info.plist, not urgent enough to do as a standalone change.

### Suggested copy (purpose-specific, not the generic Capacitor default)

**NSCameraUsageDescription**
- EN: `myJungle uses your camera to photograph your plants so it can identify the species and track their care.`
- HU: `A myJungle a kamerádat használja, hogy lefényképezd a növényeidet — így az alkalmazás felismerheti a fajukat, és nyomon követheti az ápolásukat.`

**NSPhotoLibraryUsageDescription**
- EN: `myJungle needs access to your photo library so you can choose an existing plant photo to identify and track.`
- HU: `A myJungle hozzáférést kér a fényképtáradhoz, hogy egy meglévő növényfotót választhass ki az azonosításhoz és a nyomon követéshez.`

Update the two `<string>` values in `ios/App/App/Info.plist` to the EN copy
above (that file is the base/fallback locale) before shipping.

### Localizing these strings — InfoPlist.strings

Right now the project only has `ios/App/App/Base.lproj` — there is **no**
per-language `InfoPlist.strings`, so every locale currently falls back to the
single English string in `Info.plist`, no matter what language the user has
selected in-app. To show a properly translated permission prompt in all 11
supported languages (`en`, `de`, `hu`, `es`, `fr`, `it`, `pt`, `nl`, `pl`,
`ja`, `zh` — see `src/i18n/languages.ts`), each one needs:

1. In Xcode, add the language under **Project → Info → Localizations** (this
   registers the region in `project.pbxproj`'s `knownRegions` — creating the
   folder by hand without this step means Xcode won't pick it up).
2. This creates (or you manually create) `ios/App/App/<lang>.lproj/InfoPlist.strings`
   for each language, containing:
   ```
   "NSCameraUsageDescription" = "…";
   "NSPhotoLibraryUsageDescription" = "…";
   ```
3. Translate the two EN strings above into each of the 11 languages and put
   them in that language's `InfoPlist.strings`. These are plain `.strings`
   files, not part of `src/i18n/locales/*.json` — the OS reads them directly
   based on the device's system language at permission-prompt time, not the
   app's own in-app language setting.

Until this is done, iOS shows the English text to every user regardless of
their in-app language — not a crash, just not localized.

## Android — permission audit

`AndroidManifest.xml` declared `READ_MEDIA_IMAGES`, but nothing in the app
ever requests or checks it:

- `@capacitor/camera`'s `chooseFromGallery`/`getPhoto` only requests the
  legacy `READ_EXTERNAL_STORAGE` permission, and only when
  `Build.VERSION.SDK_INT < Build.VERSION_CODES.Q` (i.e. below Android 10) —
  see `IonCameraFlow.kt` in the plugin source. On Android 10+ (every real
  device this app targets), gallery picking goes through an implicit
  `ACTION_GET_CONTENT`/`ACTION_PICK` intent to the system photo picker, which
  needs no media permission at all.
- The plugin's own bundled `AndroidManifest.xml` doesn't declare
  `READ_MEDIA_IMAGES` either — confirming it's not part of its permission
  model.

**Removed** from `android/app/src/main/AndroidManifest.xml` — see the comment
left in its place. Kept, and confirmed actually used:

| Permission | Used by |
|---|---|
| `INTERNET` | Gemini/RevenueCat/feedback network calls |
| `CAMERA` | `Camera.getPhoto()` camera capture (`requestCameraPermission()` in `src/lib/permissions.ts`) |
| `POST_NOTIFICATIONS` | Watering-reminder local notifications (`src/lib/notifications.ts`) |

If a future feature needs to read the full gallery outside of the Camera
plugin's own picker flow (e.g. browsing all photos, not just picking one),
re-add `READ_MEDIA_IMAGES` at that point — don't restore it speculatively.
