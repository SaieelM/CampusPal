// CampusPal admins: can load demo data, delete any class and review reported notes.
//
// To add an admin:
//   1. Add their college email below (lowercase, with the @).
//   2. Add the SAME email to the `adminEmails()` list in firestore.rules
//      (separate entries with commas, no comma after the last one) and
//      re-publish the rules (Firebase console → Firestore Database → Rules → Publish).
//   3. They sign up / log in normally — the Admin section appears in their Profile.
export const ADMIN_EMAILS = [
  // 'mca24.0000.name@unigoa.ac.in',
  'mca2025.2536.saieel@unigoa.ac.in'
];

export function isAdminEmail(email) {
  const e = (email || '').trim().toLowerCase();
  return Boolean(e) && ADMIN_EMAILS.map((a) => a.trim().toLowerCase()).includes(e);
}
