# Manual ADA / WCAG Testing Checklist

Automated scans should be supplemented with manual checks.

## Keyboard

- Can every interactive element be reached with Tab?
- Is focus visible at all times?
- Can menus open and close with keyboard?
- Can users skip repeated navigation?
- Is focus order logical?

## Screen reader

Test with NVDA on Windows and VoiceOver on macOS/iOS.

- Page title is accurate.
- Headings are meaningful and ordered.
- Landmarks identify header, navigation, main, and footer.
- Links make sense out of context.
- Buttons have clear names.
- Form fields announce labels, required state, and errors.

## PDFs

- PDF has title and language.
- Reading order is logical.
- Headings are tagged.
- Tables have headers.
- Images have alt text.
- Form fields are tagged and labeled.

## Images and flyers

- Flyers are not image-only.
- Supply lists, calendars, lunch menus, announcements, and registration details are available as HTML text.
- Complex images have equivalent text nearby.

## Video and audio

- Captions are present.
- Transcripts are available.
- Audio descriptions are considered when visual-only information matters.

## Forms

- Required fields are identified.
- Errors are clear and programmatically associated.
- Instructions are available before submission.
- No inaccessible CAPTCHA or sign-in barrier blocks public access.
