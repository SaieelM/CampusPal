# CampusPal

Attendance & Skip Planner + Notes & PYQ Exchange for Goa University students.
Built with Expo (React Native), Firebase (Auth + Firestore) and Cloudinary (PDF storage).

## 1. One-time setup

1. Install Node.js (LTS).
2. In this folder run:
   ```bash
   npm install
   ```
3. Copy **`.env.example`** to **`.env`** and fill in the values (get the team's `.env` privately — it is not in the repo).
4. Firebase console → **Firestore Database → Rules** → paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.

## 2. Run it on your phone

### Option A: Expo Go (quickest)

Install **Expo Go** (SDK 58) from the Play Store, then:

```bash
npx expo start --go --clear
```

Scan the QR code with Expo Go (phone and laptop on the same Wi-Fi; otherwise add `--tunnel`).

Expo Go 58 on Android is missing two native modules this app uses, so in Expo Go:
- attendance is saved with AsyncStorage instead of SQLite (same behaviour, see `src/lib/db.js`);
- lecture reminders are turned off.

Profile shows which storage is in use at the bottom of the screen.

### Option B: development build (everything works, including reminders)

Our own "Expo Go" built from this project. One build is enough for the whole team:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile development
```

Install the APK from the link / QR code the build prints, then run `npx expo start` and open the **CampusPal** app.
Rebuild only after adding a new native library.

## 3. First run / demo flow

1. Sign up with a `@unigoa.ac.in` email → click the link in the verification email → set course & semester.
2. Admin: **Profile → Admin tools** → create demo classes and notes, or load an attendance test scenario. Or a CR: **Attendance → Create class timetable**.
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
npx eas-cli@latest build -p android --profile preview
```

`eas.json` builds an installable `.apk`. `.easignore` uploads `.env` to the build server
(it is not in GitHub), so the APK gets the Firebase and Cloudinary config.
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
