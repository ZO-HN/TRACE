# TRACE UI navigation and control map

**Purpose:** source-verified map of the current coach web app and trainee mobile app. This describes controls rendered by the checked-out source; it is not a product proposal or an interaction acceptance report.

**Inspected 2026-11-05 (Asia/Singapore).** TRACE revision b11fcab2d9282595c073b67ef5ce5bee5d87e668, 31 paths dirty at inspection. TRACE-client revision 9b123120bb8564e2522c1c15bc4acf4d78987449, 12 paths dirty at inspection. The dirty files include web workout authoring, media/backend changes, mobile workout recovery/assignment, generated types, and unrelated thesis drafts. This map reflects on-disk source, not HEAD alone. No source files were changed.

**Coverage:** 20 declared web routes, including the dynamic public coach route; 17 signed-in coach pages under the shared shell; and 35 mobile screens/routes (37 Expo route files including two layouts). Tables group repeated per-row actions and describe shared controls once. Source links are relative to this document and assume sibling TRACE and TRACE-client checkouts.

## How to read this map

Source update 2026-11-06: Training now includes account-scoped `Resume <workout name>` actions from persisted drafts with loading/read-error/retry states; each opens the exact stored template ID even when the online library is unavailable. Finishing clears the resumable draft. Quick Add also disables saving for canonical description/numeric/meal-slot limits and retains invalid input. See [training](../features/training.md) and [nutrition](../features/nutrition.md). The rest of this map retains its 5 November inspection boundary.

- A visible label is quoted where source supplies one. Icon-only controls are identified by icon/meaning and accessible label/title where present.
- A repeated row action appears for each rendered data row. It is not a separate route.
- “No action wired” means the source renders a control-shaped element without a handler. A disabled placeholder is not active.
- Loading, empty, error, retry, and disabled behavior below is source behavior. Route declaration alone does not prove runtime reachability.
- Inputs, selectors, switches, chips, tabs, and clickable cards are included alongside buttons. Decorative icons are omitted unless needed to explain an action.

## TRACE coach web

### Route and shell flow

~~~mermaid
flowchart TD
  Start[Browser entry] --> Config{Supabase configured?}
  Config -->|No| Setup[Not configured screen]
  Config -->|Yes| Public{Route}
  Public -->|/login| Login[Coach login]
  Public -->|/onboarding| Onboarding[Coach onboarding wizard]
  Public -->|/:slug| PublicCoach[Public coach landing or not found]
  Public -->|Protected routes| Session[Profile/session gate]
  Session -->|Loading| ProfileLoading[Loading profile]
  Session -->|Session error| SessionError[Go to Login]
  Session -->|No profile| Login
  Session -->|Wrong role| WrongRole[Switch Google account]
  Session -->|Coach| Shell[Header + Dock + Copilot FAB]
  Shell --> Pages[17 coach pages]
  Header[Header menus] --> Settings[Settings]
  Dock[Dock navigation] --> Pages
  FAB[Copilot button] --> Drawer[Copilot drawer/chat]
~~~

Declared routes are /login, /onboarding, / (Dashboard), /clients, /messages, /calendar, /check-ins, /form-checks, /roadmaps, /training-groups, /vault, /programs, /workouts, /exercises, /equipment, /foods, /meals, /meal-plans, /settings, and /:slug. Protected routes share AppShell. The root route redirects a missing profile to login and blocks non-coach roles. Unknown public slugs show not found. Sources: [router](../../src/router.tsx), [root gate](../../src/App.tsx), [shell](../../src/components/layout/AppShell.tsx), [navigation registry](../../src/config/nav.ts), [dock](../../src/components/layout/Dock.tsx), [header](../../src/components/layout/Header.tsx).

### Cross-page web controls

| Location / control | Action / destination | Conditions and behavior |
| --- | --- | --- |
| Dock icons: Dashboard, Clients, Messages, Calendar; Coaching: Check-ins, Form Checks, Roadmaps, Training Groups, Vault; Training: Programs, Workouts, Exercises, Equipment; Nutrition: Foods, Meals, Meal Plans; Account: Settings | Navigate to the matching route from nav registry. Hover tooltip names each icon. | Active route styling. Training Groups and Equipment show Beta badges. |
| Header Search… with ⌘K | Display-only; no handler or search overlay in Header source. | Only rendered at large breakpoints. |
| Feedback icon/link | Opens TRACE GitHub repository in new tab. | Hidden at narrow breakpoints; not an in-app feedback form. |
| Bell Notifications | Opens dropdown. Click unread item marks it read; Mark all read appears when unread count > 0. | Loading, no-notifications, data states. Badge caps at 9+. No explicit fetch-error action here. |
| Avatar Account menu | Settings navigates to /settings; Support item has no click handler; Logout calls Supabase sign-out. | Avatar image or initials, else ?. Sign-out errors are not handled in this component. |
| Copilot FAB | Opens drawer; New conversation, suggested prompts, send, close operate the chat. | Provider/configuration, conversation, and message states come from Copilot components. No live provider checked. |

### Web pages and controls

| Route / source | Controls, triggers, and outcomes | Conditions, validation, or gaps |
| --- | --- | --- |
| / Dashboard — [page](../../src/components/pages/DashboardPage.tsx), [dashboard](../../src/components/dashboard/CoachDashboard.tsx) | Refresh analytics updates dashboard stats. Wins, attention, steps, nutrition and cardio panels are read-only. | Loading/updating/last-updated/unavailable and refresh error; previous stats may remain after refresh failure. EmptyPanel Invite a client CTA is rendered without an action ([EmptyPanel](../../src/components/dashboard/EmptyPanel.tsx)). |
| /clients — [ClientsPage](../../src/components/pages/ClientsPage.tsx) | Filter clients text field; Status popover search and Active/Trial/Archived/Deactivated checkboxes; Tags opens manager; Export downloads filtered CSV; Invite Client opens invite dialog; View toggles Status/Tags/Attention/Last Activity/Created At/Monthly Value columns. Each row: status icon marks active/churned; plus-tag popover assigns/unassigns. Invite tabs Share Link/Code/Find; copy link/code; Find search field. Tags dialog has name, color swatches, Create, per-tag trash, Done. | Export disabled when no filtered rows. Copy falls back to browser prompt. Tag/create rows disable while pending. Loading/error/no-clients/no-match states. Status checkbox state is not applied to displayed roster (filtered expression searches name/email only). Find tab has a search field but no results content. Rows-per-page selector, page count and sort-looking headers are not connected to pagination/sorting; footer stays on page 1. Monthly Value is always —. |
| /messages — [MessagesPage](../../src/components/pages/MessagesPage.tsx), [ChatPanel](../../src/components/chat/ChatPanel.tsx) | Search clients; choose client row; ChatPanel composer/send and its available chat/research controls. Empty-roster Invite a client navigates to Settings. | Loading/no-conversations/selection states. The invite shortcut does not open Clients invite dialog. Send disabled for blank/pending; chat errors are shown by panel. |
| /calendar — [CalendarPage](../../src/components/pages/CalendarPage.tsx) | Today, previous/next chevrons change month. Plus on current/future in-month date opens picker. Picker search, All/category chips, workout rows select a preview, Add to date assigns, X closes. | Past and adjacent-month cells have no add control. No-match/no-workouts states. Assignments are held in component state; no persistence hook. |
| /check-ins — [CheckInsPage](../../src/components/pages/CheckInsPage.tsx) | Tabs for review, scheduled, templates/submissions; row opens review; feedback and submit mark reviewed. Create Recurring Check-in opens starter picker: choose starter, Start from scratch, or close. Builder back, name/description/schedule fields, weekday chips, add/remove question, question type/options/required fields, cancel, Create/Save. Template row opens edit; trash deletes. | Submit pending/errors; name/question validation disables save. Fetch states vary by subview; not every error has retry. Controls are conditional on question type. |
| /form-checks — [FormChecksPage](../../src/components/pages/FormChecksPage.tsx) | Status selector Unreviewed/Reviewed/All; All clients/All exercises and date range inputs; card video, feedback textarea, Mark reviewed. | Client/exercise/date controls are explicitly disabled. Loading/error/empty states. Review error/success via toast; no page retry. |
| /roadmaps — [RoadmapsPage](../../src/components/pages/RoadmapsPage.tsx) | New roadmap opens title/description/client/date dialog; save creates, cancel closes; each roadmap trash deletes. | Required title, pending/error and list loading/error/empty. No row edit/detail action. |
| /training-groups — [TrainingGroupsPage](../../src/components/pages/TrainingGroupsPage.tsx) | New Training Group opens name/description/program form and Create Group. Each group Manage Members and trash. Member dialog rows toggle Add/Remove. | Beta. Create requires name; pending/errors and list loading/error/empty. Member loading/empty; row pending disabled. Delete has no confirmation here. |
| /vault — [VaultPage](../../src/components/pages/VaultPage.tsx) | New folder opens name/description and visibility choice All clients/Specific clients; specific mode shows client selector; Cancel/Create; each folder trash. | Create disabled without name or required client; errors/loading/empty. Cards show metadata only: folder/file/link creation/opening controls are absent despite copy. Delete has no confirmation. |
| /programs — [ProgramsPage](../../src/components/pages/ProgramsPage.tsx) | New Program and empty-state Create program open name/description/category dialog; Save Program; each row trash. | Save disabled until name/while saving; inline error/toast success. Loading/error/empty. Arrows are decorative; no sort. No delete confirmation. |
| /workouts — [WorkoutsPage](../../src/components/pages/WorkoutsPage.tsx), [TemplateBuilder](../../src/components/coach/TemplateBuilder.tsx), [assignment dialog](../../src/components/coach/WorkoutAssignmentDialog.tsx) | Reload workouts; Create workout opens builder. Builder exercise search/catalog selection, add exercise, move up/down, remove, sets/reps/RPE/rest inputs; X; Save & Close; Close and keep draft. Saved workout details expand; Assign… chooses linked trainee and Assign fixed copy/Retry assignment/Close. | Coach gate; loading/error/retry/empty. Builder save disabled on invalid draft, catalog loading/error, pending; catalog Retry exercises. Assignment requires selected trainee and loaded nonempty roster; errors have Retry trainees. Saved prescription read-only; no edit/delete in route. |
| /exercises — [ExercisesPage](../../src/components/pages/ExercisesPage.tsx), [dialog](../../src/components/exercises/NewExerciseDialog.tsx) | New Exercise opens form: exercise fields, tags/muscle selectors, Form/Model tabs, model front/back toggle, remove/clear controls, cancel/save. View toggles Category/Primary muscles/Equipment. | Loading/error/empty; validation/pending/error in dialog. No row edit/delete. Sort arrows decorative. |
| /equipment — [EquipmentPage](../../src/components/pages/EquipmentPage.tsx) | New Equipment form name/category, Save Equipment; each row trash. | Name/category validation, pending/error; list loading/error/empty. No delete confirmation. |
| /foods — [FoodsPage](../../src/components/pages/FoodsPage.tsx) | Search/filter; Export CSV; Add Food dialog (name, serving size, calories, protein, carbs, fat, recipe; save/cancel); View column toggles; per-row trash. | Export disabled with no foods. Validation/pending/error, loading/empty/error. No edit. Sort arrows decorative. |
| /meals — [MealsPage](../../src/components/pages/MealsPage.tsx) | Create New Meal: label, notes, food selectors, Add food, per-item remove, Save meal, Cancel. View toggles columns; Export CSV. | Label may be generated from foods. Validation/pending/error and empty state. Saved rows have no edit/delete; headers do not sort. |
| /meal-plans — [MealPlansPage](../../src/components/pages/MealPlansPage.tsx) | New meal plan switches to builder. Client select; expand Estimate maintenance calories (TDEE); sex/age/height/weight; goal chips Maintain/Cut/Surplus/Manual; TDEE formula or kcal/kg method and conditional inputs; Save meal plan. Day chips select; X removes day when >1; plus adds day. Editable day/meal names; meal trash when >1; food search/dropdown, serving fields, per-food remove, Add food, Add meal; X exits. Saved plan rows trash delete. | Pending/list loading/error/empty; food search no-match. Nutrition totals computed in builder. Delete has no confirmation. |
| /settings — [SettingsPage](../../src/components/pages/SettingsPage.tsx) | Tabs/sections for personal attributes, profile/about, contact, username; account-delete dialog; invite link generate/copy/preview/revoke; onboarding screen setup/reset; coach allowlist email/note add/remove; settings tabs. Individual section saves plus global discard/save-all. | Dirty/pending/validation/errors by section; delete dialog cancel/confirm; allowlist requires email. Several section buttons only show a success toast and do not persist values. Save onboarding screens likewise only toasts; current source keeps edits in component state. |
| /login — [LoginPage](../../src/components/pages/LoginPage.tsx), [AuthCard](../../src/components/auth/AuthCard.tsx) | Email and submit sends sign-in link; sent-state Back; OAuth provider buttons; legal/footer anchors. | Email required, pending/loading/error/sent state. Placeholder # links do not navigate to substantive terms/privacy pages. |
| /onboarding — [wizard](../../src/components/pages/OnboardingWizardPage.tsx), [screen registry](../../src/config/onboardingScreens.ts) | Coach invite flow: Get started; unauthenticated email-link sign-in, sent-state Back, login link; text/choice/multi-select (max 3)/exclusive/other/date/height/weight controls; category jump; Back/Continue; review edit jumps; Submit/complete. Successful submission writes the trainee's submitted name to their profile, claims the invited coach, stores all answers, then shows Client setup complete. Preview Restart preview. Confirmation copy-link. | Auth gate, per-step validation, submit errors/loading. Questions and count are registry-driven. Name is copied into profile only when the name answer is nonblank. A review href # link prevents default. |
| /:slug — [CoachPage](../../src/components/pages/CoachPage.tsx), [landing parser](../../src/lib/pages/parseLandingConfig.ts) | Parsed coach landing may render configured external CTA links. | Missing/invalid config shows not-found/unavailable. Copy, CTA and URLs depend on persisted coach-page config; no browser check. |

## TRACE trainee mobile

### Route and shell flow

~~~mermaid
flowchart TD
  Start[Expo launch] --> Config{Supabase configured?}
  Config -->|No, not preview| ConfigError[Configuration error]
  Config -->|Configured or dev preview| Auth{Session/profile}
  Auth -->|Loading| Loading[Activity indicator]
  Auth -->|Signed out| SignIn[AuthScreen]
  Auth -->|Profile error| ProfileError[Sign out and try again]
  Auth -->|No coach linked| Coach[ChooseCoachScreen]
  Coach -->|Link coach| Tabs[Root stack / profile context]
  Coach -->|Sign out| SignIn
  Auth -->|Coach linked| Tabs
  Tabs --> Sync[Outbox banner when pending/error]
  Tabs --> Main[Top bar + screen + bottom tabs]
  Main --> Home[Home]
  Main --> Nutrition[Nutrition]
  Main --> Training[Training]
  Main --> Leaderboards[Leaderboards]
  Main --> Social[Social]
  Top[Menu / notifications / messages] --> Other[Other routes]
  Home --> Session[Workout logger]
  Nutrition --> AddFood[Add-food modal]
  Training --> Session
~~~

Bottom tabs: Home, Nutrition, Training, Leaderboards, Social. Messages is a stack screen opened by top-bar chat, not a tab. Menu destinations: Account, Notifications, Training expand/collapse with My Workouts/Programs/History/Form Checks/Check-ins, AI Copilot, Calculators, Gyms placeholder, Physique expand/collapse with Bodyweight/Photos/Measurements placeholder/Leaderboards/Messages, Sign out. Root gate wraps every route; unlinked users cannot enter app screens. Sources: [root layout](../../../TRACE-client/app/_layout.tsx), [tabs](../../../TRACE-client/app/%28tabs%29/_layout.tsx), [top bar](../../../TRACE-client/src/components/ui/TopBar.tsx), [menu](../../../TRACE-client/src/components/ui/AppMenu.tsx), [tab bar](../../../TRACE-client/src/components/ui/TabBar.tsx), [auth](../../../TRACE-client/src/components/auth/AuthScreen.tsx), [coach picker](../../../TRACE-client/src/components/auth/ChooseCoachScreen.tsx).

### Shared mobile controls

| Location / control | Action | Conditions and behavior |
| --- | --- | --- |
| Root profile error | Sign out and try again invokes Supabase sign-out. | Loading spinner; signed-out AuthScreen; error/missing profile screen; config error if URL/key missing outside preview. |
| Coach selection | Browse/code tabs; choose coach row or enter code and submit; sign out. | No coach blocks all underlying routes. Loading/error/empty/refetch in ChooseCoachScreen. |
| Sync banner | Retry sync invokes outbox retry. | Appears with pending count/error; shows syncing/waiting/failed-retained text; retry disabled while syncing. |
| Top bar | Hamburger opens drawer; bell → Notifications; chat bubble → Messages. Logo/paw decorative. | Bell/chat have no explicit accessibility labels in source. |
| Drawer | Account; Notifications; Training group expand/collapse and five links; AI Copilot; Calculators; Gyms; Physique group expand/collapse and five links; Sign out. Outside/back closes. | Gyms/Measurements show Coming soon alert. Sign-out pending/error/disabled. Both groups initially expanded. |
| Bottom tabs | Home, Nutrition, Training, Leaderboards, Social. | Tab role and selected state. Session highlights Home; non-tab stack screens leave tabs unselected. |
| /account — [account](../../../TRACE-client/app/account.tsx) | First/last name, goal, injury notes; Beginner/Intermediate/Advanced; Save account; Measurement settings. | Pending/error/success; experience disabled while pending. |
| /notifications — [notifications](../../../TRACE-client/app/notifications.tsx) | Quiet-hours switch; Mute personal chat and Mute coaching alerts switches. | Settings loading/pending disables switches; errors shown. The current inbox area is a fixed “No notifications” placeholder; there are no notification rows/time pickers in this screen. OS delivery not established. |

### Mobile routes and controls

| Route / source | Controls, triggers, and outcomes | Conditions, validation, or gaps |
| --- | --- | --- |
| /(tabs) Home — [route](../../../TRACE-client/app/%28tabs%29/index.tsx), [Dashboard](../../../TRACE-client/src/components/Dashboard.tsx) | Week previous/next, today, date chips; historical selection opens day history and retry entries. Training → session; Calories/Macros → Nutrition; Bodyweight history and Log Weight; Log Steps; Cardio; Sleep history/Log Sleep; Log Water, +250 mL cup, Done; Photos camera icon. Customize dashboard opens section-switch modal with close and Restore defaults. Inline weight/steps forms Cancel/Save; sleep sheet time, AM/PM, quality, save/close. | No-log badges; numeric validation/write errors; water disabled during load/error; switches disabled until layout loads and while saving. Water increment is fixed. History uses DayHistory. |
| /(tabs)/nutrition — [route](../../../TRACE-client/app/%28tabs%29/nutrition.tsx), [logger](../../../TRACE-client/src/components/NutritionLogger.tsx), [meal card](../../../TRACE-client/src/components/nutrition/MealSlotCard.tsx) | Add food → modal; nonempty meal has expand/collapse; each meal has icon plus Add food to meal N; Add another meal section. Read-only daily calories/macros, week comparison and training correlation. | Skeleton, partial-data warning/retry, empty state, pending/failed sync text. No daily targets configured. Entries have no edit/delete action. Persisted meal_slot contributes to displayed slots. |
| /nutrition/add-meal — [modal](../../../TRACE-client/app/nutrition/add-meal.tsx) | Header close/back and Done; tabs Quick Add/Favorites/My foods/Supplements/Saved meals. After successful log: template name input; Save these as a meal template then Save “name”. | KeyboardAvoidingView uses iOS padding/Android height. Food logs immediately through local outbox; Done only closes. Template validation/pending/errors; entry count and sync note. |
| Quick Add — [QuickAddTab](../../../TRACE-client/src/components/nutrition/QuickAddTab.tsx) | Multiline Food and nutrition input; voice microphone; Save entry; camera Scan photo with AI or Set up AI Copilot to scan photos. | Save disabled without valid nonnegative macro/calorie and while scanning. Input disabled during scan/log; parser chips preview values. Offline save; errors retain input. Photo needs AI config, permission, connection; absent config opens AI settings; values are editable/reviewed before saving. |
| Favorites — [tab](../../../TRACE-client/src/components/nutrition/FavoritesTab.tsx), [food row](../../../TRACE-client/src/components/nutrition/FoodMacroRow.tsx) | Food row Add; long-press removes from favorites. | Catalog loading/error with Retry, empty, pending/action errors. |
| My foods — [tab](../../../TRACE-client/src/components/nutrition/CustomFoodTab.tsx), [form](../../../TRACE-client/src/components/nutrition/CreateFoodForm.tsx) | Create food form has name/serving/calories/macros, save/cancel; each row logs; long-press adds to favorites. | Validation, pending/errors, catalog retry/empty. No delete control on custom-food rows in current source. |
| Supplements — [tab](../../../TRACE-client/src/components/nutrition/SupplementsTab.tsx) | Coach-provided supplement reference rows can be logged. | Catalog loading/error/empty; no create, edit, or delete control in this screen. Nutrition writes use local outbox. |
| Saved meals — [tab](../../../TRACE-client/src/components/nutrition/MealTemplatesTab.tsx) | Each template Log all. | Disabled if empty or pending; logs items in sequence and tracks partial progress in component ref. Loading/error retry/empty. |
| /(tabs)/training — [route](../../../TRACE-client/app/%28tabs%29/training.tsx), [TrainingScreen](../../../TRACE-client/src/components/TrainingScreen.tsx), [generator](../../../TRACE-client/src/components/WorkoutGenerator.tsx) | New folder icon; Search workouts; folder collapse/expand, rename pencil, trash with inline Cancel/Delete folder; workout folder selector; Start Workout. Generator Generate 3-day split/Regenerate and Save as my next workout. PR rows expand; Body/List muscle analytics toggle; body-map selectors. | Retry load; loading/no-match/no-workout; action errors. Generator loading/error/suggestion. PR/analytics loading/empty/error. Delete folder moves workouts to Unfoldered. |
| /(tabs)/session — [route](../../../TRACE-client/app/%28tabs%29/session.tsx), [GymLogger](../../../TRACE-client/src/components/GymLogger.tsx) | Folder icon returns Training; Reps/Hold(sec); weight/reps fields; suggestion thumbs up/down; per-set Done; RPE 1–10 chips; Warm-up/To failure; camera Form clip then View clip/Hide clip; Finish workout; rest +30 and X. | Loading/unassigned/cached offline and retry. Completed-set fields/tags disabled; Done disabled after completion/while finishing. Save awaits local draft/session/set queue; error preserves input. Pending count; camera/upload errors. Finish only after a completed set; errors retain sets. Rest from assigned prescription or 90s. |
| /(tabs)/leaderboards — [list](../../../TRACE-client/app/%28tabs%29/leaderboards.tsx) | Exercise row opens detail; Retry loading exercises. | Loading/error/empty catalog. |
| /leaderboards/:exerciseId — [detail](../../../TRACE-client/app/leaderboards/[exerciseId].tsx) | Back chevron; rank list is read-only. | Loading; not-live capability; empty entries. |
| /(tabs)/messages — [route](../../../TRACE-client/app/%28tabs%29/messages.tsx), [ChatScreen](../../../TRACE-client/src/components/ChatScreen.tsx) | Composer/send and voice control where rendered. | No coach shows no-one-to-message state; loading/error and blank/pending send handling. Opened from top bar/menu, no active tab. |
| /(tabs)/social — [social](../../../TRACE-client/app/%28tabs%29/social.tsx) | Feed/Connected/Discover tabs. Connected rows Unfollow; Discover rows Follow/Following toggles. | Feed is static No workouts yet placeholder. Unavailable backend shows not-live state. Empty roster, pending disabled, action errors. |
| /history — [history](../../../TRACE-client/app/history.tsx) | Generate with AI → Training; filter toggle, search, date-range chips; session rows read-only. | Loading/error/Retry loading history; empty/no-match. Generate shortcut opens Training rather than AI directly. |
| /programs — [list](../../../TRACE-client/app/programs/index.tsx) | Join a program; Create program; rows open detail. | Backend not-live, empty/loading states. |
| /programs/new — [create](../../../TRACE-client/app/programs/new.tsx) | Name, description, category, split, length, weekly day/rest selectors; Create program. | Validation/pending/error; success opens created detail. |
| /programs/join — [join](../../../TRACE-client/app/programs/join.tsx) | Invite token field; Join program. | Disabled while blank; pending/error; success opens detail. |
| /programs/:id — [detail](../../../TRACE-client/app/programs/[id].tsx) | Share icon; enrolled Advance week; otherwise Enroll; Delete opens native cancel/delete confirmation. | Missing program/share alerts; enrollment/progress states. Ownership/role affects delete availability. |
| /checkins — [list](../../../TRACE-client/app/checkins/index.tsx) | Assigned template opens form; history rows expand coach notes. | Loading/error/empty. |
| /checkins/:templateId — [form](../../../TRACE-client/app/checkins/[templateId].tsx), [question fields](../../../TRACE-client/src/components/checkins/QuestionField.tsx) | Configured text/rating/choice/multiselect/date/number fields; Submit check-in. | Loading/unavailable template, required validation disables submit, pending/error; success returns list. |
| /form-checks — [list](../../../TRACE-client/app/form-checks/index.tsx) | Submit form check opens new form; history rows expand coach notes and view clip. | Loading/error/empty/media status. |
| /form-checks/new — [new form](../../../TRACE-client/app/form-checks/new.tsx) | Optional exercise selector; video picker; Submit form check; close/back. | Permission/media/upload/submit error and pending; success returns list. |
| /bodyweight/history — [history](../../../TRACE-client/app/bodyweight/history.tsx) | Chart/list icon toggle; settings gear; add weigh-in. | Error/loading/empty; dated readings/trend. |
| /bodyweight/entry — [entry](../../../TRACE-client/app/bodyweight/entry.tsx) | Date, weight in chosen unit, note; save/back. | Waits for load; duplicate date warning, validation and errors; success history. |
| /bodyweight/settings — [settings](../../../TRACE-client/app/bodyweight/settings.tsx) | kg/lbs; Sync Recent Data; Add a past weigh-in; reminder switch/time; period selector; Go to roadmaps. | Health Connect shows Coming soon alert. Save/reminder errors; permission needed for reminder. |
| /bodyweight/roadmap — [roadmap](../../../TRACE-client/app/bodyweight/roadmap.tsx) | Add phase reveals name/date/target fields, Cancel/Create; phase trash; Add phase. | Date/input validation/errors; unsupported capability can show warning. |
| /cardio — [summary](../../../TRACE-client/app/cardio/index.tsx) | Add/log cardio → selector; history/analytics read-only. | Loading/error/Retry, not-live backend, empty. |
| /cardio/select — [selector](../../../TRACE-client/app/cardio/select.tsx) | Back; plus create exercise; date nav; search; exercise row opens dated entry. | Empty catalog; selected date carried to entry. |
| /cardio/new — [create](../../../TRACE-client/app/cardio/new.tsx) | Exercise name; Create exercise. | Blank disabled; pending/error; success opens detail. |
| /cardio/:exerciseId — [detail](../../../TRACE-client/app/cardio/[exerciseId].tsx), [date nav](../../../TRACE-client/src/components/cardio/DateNav.tsx) | Date previous/next; add opens minutes/seconds form; Cancel/Save; per-entry trash. | Weekly retry, empty, save/delete pending/errors. |
| /sleep — [sleep](../../../TRACE-client/app/sleep/index.tsx), [sheet](../../../TRACE-client/src/components/sleep/LogSleepSheet.tsx) | Log sleep opens sheet; bedtime/wake controls, AM/PM, quality 1–5, Save. | Loading/not-live/empty; sheet validation/pending/errors. History is read-only. |
| /progress-photos — [photos](../../../TRACE-client/app/progress-photos/index.tsx) | Capture photo; tap image compares; X clears comparison. | Camera/media permission/upload errors; empty/loading; no viewer action if URL unresolved. |
| /ai-copilot — [chat](../../../TRACE-client/app/ai-copilot/index.tsx), [voice](../../../TRACE-client/src/components/ai/VoiceInputButton.tsx) | Settings gear; composer/send; voice recording toggle. | Unconfigured redirects settings; provider error/loading/empty; send requires input. Voice permission/errors; transcript fills composer. |
| /ai-copilot/settings — [settings](../../../TRACE-client/app/ai-copilot/settings.tsx) | Provider selector; base URL/API key/model; Test connection; Save; Clear saved key; back. | Provider-specific fields; pending/error/result. UI does not establish provider availability/billing. |
| /tools — [catalog](../../../TRACE-client/app/tools/index.tsx) | Calculator rows open dynamic calculator. | Catalog from registry. |
| /tools/:slug — [calculator](../../../TRACE-client/app/tools/[slug].tsx), [calculators](../../../TRACE-client/src/components/tools/calculators.tsx), [field](../../../TRACE-client/src/components/tools/ToolField.tsx) | Per-calculator selectors/chips/number inputs; local recomputed result. | Unknown slug says it does not exist; validation varies. No cloud save. |
| /workouts/folders/new modal — [folder form](../../../TRACE-client/app/workouts/folders/new.tsx) | Name; Cancel; Create folder or Rename Folder depending on id param. | Blank disables submit; pending/error; success/back. Opened from Training folder plus/pencil. |
| /nutrition/add-meal — covered above; declared as modal screen. | No additional separate route. | Modal presentation configured in root Stack. |

## Gaps and acceptance boundary

- “Every page” means every route in the current React Router/Expo filesystem route trees plus major inline dialogs, tabs, sheets, and repeated row actions identified in source. Runtime-generated provider widgets, OS permission dialogs, backend-defined question schemas, dynamic notification destinations, and dependency-internal controls cannot be fully enumerated from these repositories alone.
- No browser, web preview, keyboard-only session, screen reader, native simulator/device, or live account was used. Visibility with real data, hit targets, accessibility announcements, and platform back behavior remain unverified.
- Web calendar assignments are component state. Client status checkboxes do not filter rows; row/page size/sort controls are inert. Header Search, Support, some empty-panel CTAs are not wired. Several Settings save buttons only toast. Form-check client/exercise/date filters are disabled. Public coach CTAs depend on stored config.
- Mobile Feed is a placeholder; leaderboards can be unavailable; Gyms, Measurements and Health Connect are explicit not-live controls. Program/cardio/sleep can depend on backend capability. Push, uploads, sync delivery and account/back-stack behavior need device/backend acceptance.
- Mobile camera, microphone, keyboard, SQLite kill/reopen, account-switch flows and offline UI were not exercised. Source inspection is not proof of persistence or delivery.
- Both worktrees were dirty; concurrent implementation and generated schema/type edits can change route behavior. This map should be refreshed when those changes settle.
