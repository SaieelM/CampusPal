# CampusPal

Attendance & Skip Planner + Notes & PYQ Exchange for Goa University students.
Built with Expo (React Native), Firebase (Auth + Firestore) and Cloudinary (PDF storage).

## 1. One-time setup

1. Install Node.js (LTS) and, on your Android phone, **Expo Go** from the Play Store.
2. In this folder run:
   ```bash
   npm install
   ```
3. Copy **`.env.example`** to **`.env`** and fill in the values (get the team's `.env` privately — it is not in the repo).
4. Firebase console → **Firestore Database → Rules** → paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.

## 2. Run it on your phone

```bash
npx expo start --clear
```

Scan the QR code with Expo Go (phone and laptop on the same Wi-Fi; if college Wi-Fi blocks it, use `npx expo start --tunnel` or a hotspot).

## 3. First run / demo flow

1. Sign up with a `@unigoa.ac.in` email → click the link in the verification email → set course & semester.
2. Admin: **Profile → Admin tools → Load demo data** (demo classes, attendance history, notes). Or a CR: **Attendance → Create class timetable**.
3. Join the class with that code → pick batch + electives → catch up on past lectures.
4. Other students: **Join with class code**.
5. **Notes tab → Upload** → scan pages with the camera → fill details → upload. Open, upvote, rate, download for offline.

## Admins

Admins can load demo data, delete any class, review reported notes and read feedback.

1. Add the email to `ADMIN_EMAILS` in [`src/lib/admins.js`](src/lib/admins.js).
2. Add the same email to `adminEmails()` in [`firestore.rules`](firestore.rules), then re-publish the rules in the Firebase console.
3. Log in with that account → **Profile → Admin tools**.

## 4. Build the APK (for submission)

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build -p android --profile preview
```

In `eas.json`, make sure the `preview` profile has `"android": { "buildType": "apk" }`.
The free build queue can take a while — build a few days before the deadline.

## Project structure

```
src/app/            Screens (Expo Router: one file = one screen)
  (auth)/           login, signup
  (tabs)/           Home, Attendance, Notes, Profile
  class/            join, edit (CR timetable editor), catchup, extra, settings
  notes/            upload, [id] (details), mine
  subject/[id].js   subject history & warnings
src/lib/            Logic: attendance maths, timetable, Firebase, notes, notifications, SQLite
src/components/     Reusable UI
firestore.rules     Database security rules
```

## Attendance rules used

- Minimum **50% in every course** (theory and lab counted separately) and **75% overall**.
- Skip prediction = the smaller of what's safe for the course and what's safe overall.
- A slot can "count as N" lectures; cancelled lectures and holidays don't count.
