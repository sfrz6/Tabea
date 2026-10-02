Build a complete, production-ready private web application called **Tabea | تابع**.

Tabea is a private family and small-business task accountability platform.

The application will initially be used by a father, his sons, and potentially a small number of trusted workers or staff.

The main purpose of Tabea is to prevent forgotten tasks, unclear responsibilities, missed deadlines, and misunderstandings about who was assigned work, what progress was made, and whether work was completed on time.

This is not intended to be a generic public task management product.

It is a focused private operations and accountability system designed for a family that manages businesses, properties, field work, maintenance tasks, investments, and other daily responsibilities.

# PRODUCT NAME

The application name is:

**Tabea**

Arabic:

**تابع**

Use the brand consistently throughout the application.

The name should work naturally in both Arabic and English.

Do not translate the brand name into a different product name.

Examples:

English:
Tabea

Arabic:
تابع

# BRANDING AND LOGO

Design a professional original logo for Tabea.

The logo should communicate ideas such as:

* following up
* progress
* responsibility
* completion
* accountability
* continuity

The logo should be simple enough to work as:

* website logo
* mobile navigation logo
* favicon
* application icon
* future PWA icon
* login screen branding

Avoid an overly complex illustration.

Avoid an obvious generic checklist logo if possible.

Aim for a clean software product identity.

The logo should work at small sizes.

Create:

* primary logo
* compact logo mark
* favicon
* application icon
* light background version
* dark background version if dark mode is implemented

Use SVG wherever practical so the logo remains sharp on Retina displays.

Do not make the branding look AI-generated.

The identity should feel like a professionally designed SaaS or internal business product.

# CRITICAL WRITING RULE

Never use em dashes anywhere in the project.

Do not use the character:

—

This applies to:

* UI text
* English text
* Arabic text
* descriptions
* placeholders
* validation messages
* notifications
* documentation
* README
* seed data
* comments
* code comments
* test data
* generated examples

Use:

* commas
* periods
* colons
* parentheses
* standard hyphens

instead.

Perform a final project-wide check before completion to make sure no em dash character exists anywhere in the repository.

# LANGUAGES

Tabea must fully support:

* Arabic
* English

Do not build English first and treat Arabic as an afterthought.

Both languages should be first-class experiences.

Implement proper internationalization.

Use a clean i18n architecture rather than hardcoding translations inside components.

All user-facing system text must be translated.

This includes:

* navigation
* buttons
* status names
* priorities
* notifications
* forms
* validation messages
* authentication
* dashboard labels
* admin interface
* empty states
* error messages
* confirmation messages
* settings
* profile
* task history labels

Users should be able to change the language easily.

Store their preferred language if practical.

# ARABIC RTL SUPPORT

Arabic must use proper RTL layout.

When Arabic is selected:

* page direction becomes RTL
* sidebar direction adapts
* navigation adapts
* icons appear logically
* form alignment adapts
* task cards adapt
* timelines adapt
* tables remain readable
* breadcrumbs adapt
* modals adapt
* mobile navigation adapts

Do not simply right-align English components.

Design true RTL behavior.

Arabic typography should look polished and natural.

Use professional system-friendly Arabic fonts or high-quality web fonts suitable for interfaces.

Avoid decorative Arabic fonts.

English should use a clean standard interface font.

Typography should feel consistent between Arabic and English.

# PRIMARY DEVICE REQUIREMENT

This requirement is extremely important.

Most Tabea users will access the application from an **iPhone using Safari**.

Treat iPhone Safari as one of the primary platforms for the application.

Do not build the desktop interface first and simply shrink it for mobile.

Build Tabea **mobile-first**.

The mobile interface should feel intentionally designed for an iPhone.

# IPHONE SAFARI EXPERIENCE

Test the interface carefully for recent iPhone screen sizes.

It should work well on common widths including approximately:

* 320px
* 375px
* 390px
* 393px
* 402px
* 414px
* 430px

Pay attention to:

* iPhone notch
* Dynamic Island
* safe areas
* Safari browser bars
* bottom home indicator
* virtual keyboard
* viewport resizing
* input focus
* scrolling
* sticky navigation
* modals
* dropdowns
* date pickers

Use safe-area CSS where appropriate:

env(safe-area-inset-top)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
env(safe-area-inset-right)

Do not place important controls underneath Safari UI or the iPhone home indicator.

# MOBILE NAVIGATION

For iPhone, strongly prefer a clean mobile navigation pattern.

A bottom navigation bar is acceptable and may be preferable.

Possible navigation:

* Dashboard
* My Tasks
* Tasks
* Notifications
* More

Admin features can exist under More or a dedicated Admin area for Admin accounts.

Keep the most-used actions easy to reach with one hand.

Do not overcrowd the bottom navigation.

# MOBILE TASK EXPERIENCE

A user should be able to open Tabea on their iPhone and quickly:

1. see what they need to do
2. see overdue tasks
3. open a task
4. read the latest update
5. update status
6. write a progress note
7. mark the task complete

These actions should require very few taps.

Status changes should be particularly easy on mobile.

Do not require opening multiple unnecessary dialogs.

# TOUCH TARGETS

All interactive controls must be comfortable for touch.

Avoid tiny icons and tiny buttons.

Use suitable touch target sizes.

Forms should not feel cramped.

Provide enough spacing between interactive elements to prevent accidental taps.

# IOS FORM EXPERIENCE

Ensure forms behave properly in Safari.

Use correct HTML input types such as:

* email
* tel
* password
* date
* search

Set useful autocomplete attributes.

Avoid causing unwanted Safari zoom when focusing inputs.

Use appropriate input font sizing.

Make sure the virtual keyboard does not hide important controls.

Test long task descriptions and comments while the keyboard is visible.

# PWA READINESS

Structure the application so it can work well as a Progressive Web App.

If practical, implement PWA support.

Users should eventually be able to use:

Add to Home Screen

and launch Tabea almost like a native iPhone application.

Provide:

* web manifest
* proper icons
* theme metadata
* Apple touch icon
* mobile web app metadata

Do not let PWA implementation create unnecessary complexity or instability.

# UI DESIGN DIRECTION

The interface should look like it was designed and implemented by an experienced professional software team.

Avoid:

* AI-looking layouts
* excessive gradients
* excessive glass effects
* random neon colors
* huge rounded cards everywhere
* excessive shadows
* excessive animations
* unnecessary illustrations
* dashboard clutter
* template-like SaaS appearance

Use a restrained professional design system.

The UI should feel trustworthy and practical.

Prioritize information hierarchy.

Tasks and their status should always be the focus.

# TECH STACK

Use:

* Next.js, latest stable version
* TypeScript
* App Router
* Vercel
* Neon PostgreSQL
* Tailwind CSS
* Prisma ORM or Drizzle ORM
* choose whichever ORM creates the cleanest architecture
* secure server-side authentication
* Zod or equivalent validation
* GitHub-ready repository

A high-quality component system such as shadcn/ui may be used where useful.

Do not blindly use default component styling.

Customize components so Tabea has its own professional visual identity.

# ARCHITECTURE

Keep Tabea as one full-stack Next.js application.

Architecture:

Next.js UI
|
Next.js server-side application logic
|
Neon PostgreSQL

Use:

* Server Actions where appropriate
* Route Handlers/API routes where appropriate
* server-side authorization
* server-side validation

Do not create an unnecessary separate backend application.

The application should deploy cleanly to Vercel.

# APPLICATION PURPOSE

A father should be able to assign a task.

Example:

Title:
Renew property insurance

Details:
Optional instructions

Priority:
High

Due:
8 October 2026

Assigned to:
Mohammed

The assigned user should immediately see the task inside their account.

They can then change the task status and provide updates.

The father should be able to open Tabea at any time and see exactly what is happening without needing to call the person for an update.

# ACCOUNTABILITY

Accountability is one of the most important concepts in the application.

The system should record enough information that users can later determine:

* what was assigned
* who assigned it
* who was responsible
* when it was assigned
* what deadline was given
* whether the person started it
* what updates were provided
* whether the task became blocked
* why it became blocked
* when it was completed
* whether it was completed late

The system should prevent misunderstandings such as:

"I forgot."

"You never assigned this to me."

"I already completed it."

"I did not know the deadline."

"No one told me it changed."

Important events must have an activity record.

# USER ROLES

Implement:

* ADMIN
* MANAGER
* MEMBER

# ADMIN

Admin is the only role allowed to manage user accounts.

This rule is permanent.

Do not create a configurable permission called:

canManageUsers

Do not create a UI switch called:

Can manage users

Only ADMIN can manage users.

Admin capabilities:

* create users
* edit users
* deactivate users
* reactivate users
* reset credentials if necessary
* change roles
* configure task visibility
* configure assignment privileges
* configure editing privileges
* see all tasks
* see all users
* see complete activity logs
* manage system settings

# MANAGER

The Manager role is primarily intended for the father.

Manager capabilities may include:

* create tasks
* assign tasks
* edit tasks
* change due dates
* change priorities
* reassign tasks
* view progress
* view history
* add updates
* reopen tasks where allowed

Manager does not automatically receive Admin user-management privileges.

# MEMBER

Members can:

* see tasks permitted by their visibility settings
* update their assigned tasks
* change status
* add progress updates
* explain blockers
* mark assigned tasks completed
* view allowed task history

# PERMISSIONS

Role and permissions must be separate concepts.

For non-admin users support:

canViewAllTasks
canAssignTasks
canEditOthersTasks

Do not add:

canManageUsers

Admin automatically bypasses normal restrictions where appropriate.

# TASK VISIBILITY

Support two core visibility modes.

## OWN TASKS ONLY

A user should only see tasks related to them.

Related can include:

* assigned to them
* created by them
* explicitly included as a participant

## FULL TASK VISIBILITY

The user can see all tasks.

Important:

Full visibility does not mean the user can edit other people's tasks.

Viewing and editing are separate.

Example:

Father

Role:
Manager

Full task visibility:
Yes

Can assign:
Yes

Can edit others:
Yes

Son

Role:
Member

Full task visibility:
Yes

Can assign:
Optional

Can edit others:
No

Worker

Role:
Member

Full task visibility:
No

Can assign:
No

Can edit others:
No

# SECURITY RULE FOR VISIBILITY

Never rely only on hiding buttons or navigation links.

All visibility and permission rules must be enforced server-side.

A user with Own Tasks Only must not be able to manually enter another task URL and see it.

A user without edit permission must not be able to bypass the interface and edit using an API request.

# USER MANAGEMENT

Admin can create users with:

* full name
* username
* password
* optional email
* phone number
* role
* visibility level
* can assign tasks
* can edit others' tasks
* active status
* preferred language if appropriate

Phone number should be stored cleanly because future WhatsApp notifications will use it.

# USER DEACTIVATION

Do not permanently delete users who have historical task activity.

Use deactivation or soft deletion.

When a user is inactive:

* login is blocked
* they cannot receive new assignments
* historical tasks remain
* activity remains
* their name still displays correctly in historical records

Admin should be able to reactivate them later.

# TASK MODEL

A task should support:

Required:

* title
* assignee
* priority
* due date

Optional:

* description
* project
* category
* location
* tags
* participants

Also record automatically:

* creator
* assigned by
* creation time
* update time
* started time
* completion time

# PRIORITY

Use:

* Low
* Medium
* High
* Urgent

Arabic equivalents must be provided.

Use restrained visual indicators.

Priority should be recognizable without making the screen overly colorful.

# TASK STATUS

Statuses:

* New
* In Progress
* Waiting
* Completed
* Cancelled

Provide proper Arabic translations.

# NEW

Assigned but not started.

# IN PROGRESS

User is actively working on the task.

When the task first moves from New to In Progress, record startedAt.

# WAITING

Work cannot currently proceed.

When changing a task to Waiting, require a reason or strongly enforce entering a blocker explanation.

Examples:

Waiting for supplier quotation

Waiting for municipality approval

Waiting for payment

Waiting for worker availability

Waiting for materials

The father should immediately understand why work is stopped.

# COMPLETED

Task is finished.

Record:

completedAt

and create an activity record.

# CANCELLED

Task is no longer required.

Record who cancelled it and when.

# PROGRESS UPDATES

Users should be able to add updates independently of changing status.

Example:

"Visited the farm today. The technician inspected the pump and will send the quotation tomorrow."

Each update records:

* task
* author
* content
* timestamp

Do not allow updates to disappear when the task changes status.

# TASK HISTORY

The activity timeline is a core part of Tabea.

Record significant events such as:

* task created
* task assigned
* task reassigned
* priority changed
* due date changed
* description changed
* project changed
* status changed
* progress update added
* waiting reason added
* task completed
* task reopened
* task cancelled

Store:

* actor
* timestamp
* action type
* old value if relevant
* new value if relevant
* note if relevant

Example:

2 Oct 2026, 9:41 AM

Father created the task.

2 Oct 2026, 9:42 AM

Task assigned to Mohammed.

3 Oct 2026, 8:15 AM

Mohammed changed status from New to In Progress.

3 Oct 2026, 2:30 PM

Mohammed added an update:

"Visited the site and requested a quotation."

4 Oct 2026, 10:20 AM

Mohammed changed status to Waiting.

Reason:

"Waiting for supplier quotation."

6 Oct 2026, 4:15 PM

Mohammed completed the task.

# OVERDUE TASKS

If:

dueDate < current date/time

and status is not:

* Completed
* Cancelled

the task is overdue.

Prefer deriving overdue state dynamically instead of creating a permanent Overdue status.

Display:

Overdue by 1 day

Overdue by 3 days

Overdue by 2 weeks

Provide proper Arabic equivalents.

Overdue tasks should be highly visible without using aggressive visual design.

# DASHBOARD

Create a useful mobile-first dashboard.

For users who can see all tasks:

* Open Tasks
* In Progress
* Waiting
* Overdue
* Completed This Week

Also show:

* tasks requiring attention
* upcoming deadlines
* overdue tasks
* recently updated tasks
* recent activity

For Own Tasks Only users, calculate these metrics only from tasks they can see.

# IPHONE DASHBOARD

The iPhone dashboard should not simply show five large desktop statistic cards stacked vertically.

Design a compact mobile layout.

Prioritize:

1. tasks needing attention
2. overdue
3. today's work
4. upcoming work

Metrics can use compact cards or summary sections.

A user should not have to scroll through a large amount of statistics before reaching actual tasks.

# MY TASKS

Create a dedicated My Tasks experience.

Useful filters:

* Today
* Overdue
* Upcoming
* New
* In Progress
* Waiting
* Completed

Allow sorting by:

* due date
* priority
* newest
* oldest

On iPhone, filters should be easy to use and should not consume excessive vertical space.

# ALL TASKS

Only show All Tasks to users who have appropriate visibility.

Support filtering by:

* assignee
* status
* priority
* due date
* project
* category

# TASK CARD

Mobile task cards should clearly communicate:

* task title
* assignee when relevant
* priority
* status
* due date
* overdue state
* latest meaningful update

Do not put too much information on each card.

Make the card quickly scannable.

# TASK DETAIL PAGE

This is one of the most important screens.

Show:

* title
* status
* priority
* assignee
* creator
* description
* due date
* created date
* completion date
* latest update
* waiting reason
* project/category where applicable
* progress update area
* activity history

Provide actions based on permission.

On iPhone, consider a sticky or easily accessible action area for:

* Change Status
* Add Update
* Complete

Do not cover content or the Safari home indicator.

# QUICK STATUS UPDATE

Optimize status updating for mobile.

For example:

User opens task.

Taps current status.

Selects:

New
In Progress
Waiting
Completed

If Waiting is selected:

show a reason input.

If Completed is selected:

ask for confirmation only if necessary.

Avoid unnecessary multi-step dialogs.

# NOTIFICATIONS

Implement in-app notifications.

Examples:

* new task assigned
* task reassigned
* due date changed
* task updated
* status changed
* task completed
* task becomes overdue

Provide:

* notification icon
* unread count
* notifications page or panel
* mark as read
* mark all as read if appropriate
* direct link to task

# NOTIFICATION ARCHITECTURE

Use a modular notification service.

For example:

NotificationService

Possible future providers:

* OpenWA
* WhatsApp Cloud API
* Telegram
* email

V1 only requires in-app notifications.

Do not implement OpenWA now.

# FUTURE OPENWA SUPPORT

Tabea will potentially use OpenWA in the future.

OpenWA will run on a separate VPS.

Future architecture:

Tabea on Vercel
|
NotificationService
|
OpenWA Provider
|
OpenWA VPS
|
WhatsApp

Do not make the core task logic depend directly on OpenWA.

A future WhatsApp notification may look like:

New Task Assigned

Task: Repair farm water pump

Priority: High

Due: 6 Oct 2026

Assigned by: Father

Open Task

Structure the code so this can be added later without rewriting task logic.

# ADMIN PANEL

Build a clean Admin area.

Possible sections:

* Users
* System Overview
* Activity
* Settings

Do not make the admin panel unnecessarily complicated.

# ADMIN USER LIST

Show:

* name
* username
* role
* visibility
* active status
* last active if tracked

Actions:

* edit
* deactivate
* reactivate
* change role
* change visibility
* change canAssignTasks
* change canEditOthersTasks
* reset password

# AUTHENTICATION

Implement secure authentication.

The app is private, but private does not mean insecure.

Use:

* secure password hashing such as Argon2 or bcrypt
* server-side sessions
* HttpOnly cookies
* Secure cookies in production
* appropriate SameSite settings
* session expiry
* proper logout

Do not expose password hashes.

Never store plaintext passwords.

# AUTHORIZATION

Authorization must happen server-side.

Protect:

* Admin routes
* task detail access
* task editing
* assignment
* status modification
* user management
* activity access

Prevent IDOR.

Never trust an ID sent by the browser without checking authorization.

# LOGIN SECURITY

Implement reasonable protections such as:

* login rate limiting if practical
* generic invalid login message
* no username enumeration
* inactive account blocking

# VALIDATION

Use Zod or an equivalent validation library.

Validate data on the server even if it was already validated in the browser.

# DATABASE

Use Neon PostgreSQL.

Design a clean normalized relational schema.

Core models:

User
Task
TaskUpdate
TaskActivity
Notification

Optional models:

Project
Category
TaskParticipant

# USER FIELDS

Possible fields:

id
name
username
passwordHash
email
phoneNumber
role
canViewAllTasks
canAssignTasks
canEditOthersTasks
preferredLanguage
isActive
lastLoginAt
createdAt
updatedAt

# TASK FIELDS

Possible fields:

id
title
description
priority
status
createdById
assignedById
assignedToId
dueDate
startedAt
completedAt
projectId
categoryId
createdAt
updatedAt

# TASK UPDATE

id
taskId
authorId
content
createdAt
updatedAt if editing is allowed

If updates can be edited, preserve accountability.

Consider either:

* preventing edits after a short period
* storing edit history
* marking the update as edited

Do not silently allow rewriting historical records.

# TASK ACTIVITY

id
taskId
actorId
actionType
oldValue
newValue
note
createdAt

Activity entries should generally not be editable by normal users.

# NOTIFICATION

id
userId
type
title
message
taskId
isRead
createdAt

# INDEXES

Create useful indexes for:

* assignedToId
* createdById
* status
* priority
* dueDate
* taskId
* userId
* notification read state

Avoid premature optimization, but design properly.

# DATE AND TIME

Use reliable timestamp storage.

Default application timezone:

Asia/Muscat

Store timestamps consistently, preferably UTC where appropriate, then format for the user.

Display dates naturally.

English examples:

6 Oct 2026

6 Oct 2026, 4:15 PM

Arabic should use an appropriate clear equivalent.

Ensure date formatting respects application language.

# SEARCH

Allow task search using fields such as:

* title
* description
* assignee
* project
* category

Search must respect permissions.

A search result must never expose a task the user is not authorized to see.

# PROFILE

Users should have a Profile page.

Allow:

* view name
* view username
* change password
* change language
* optionally edit phone or email depending on rules

Users must not be able to modify:

* role
* task visibility
* assignment privileges
* editing privileges

# PROJECTS AND CATEGORIES

Allow lightweight organization.

Examples:

Projects:
Farm
Building
Shop

Categories:
Maintenance
Government
Payment
Purchase
Follow-up

Do not turn the application into a complicated project management system.

Keep these features optional and easy.

# RESPONSIVE DESKTOP EXPERIENCE

Although mobile is the priority, desktop must also look professional.

Desktop can use:

* sidebar
* header
* wider task tables
* multi-column dashboard
* detailed timeline layout

Do not stretch mobile cards awkwardly across the full desktop width.

Use responsive layouts intentionally.

# ACCESSIBILITY

Implement basic accessibility correctly.

Include:

* labels
* focus states
* keyboard navigation
* semantic HTML
* suitable contrast
* ARIA where needed
* accessible dialogs
* screen reader friendly controls

Do not rely only on color to identify status.

# EMPTY STATES

Create professional empty states.

Examples:

No tasks assigned yet.

No overdue tasks.

No notifications.

Do not use childish illustrations.

Keep them simple and useful.

# LOADING STATES

Provide polished loading experiences.

Avoid layout jumping.

Use skeletons where they improve UX.

Do not overuse them.

# ERROR STATES

Provide clear messages such as:

Task not found.

You do not have permission to view this task.

You do not have permission to edit this task.

This user is inactive.

Unable to save the task.

Never display raw database errors or stack traces in production.

# CONFIRMATIONS

Use confirmation dialogs only for meaningful actions such as:

* deactivate user
* cancel task
* reopen completed task
* sensitive Admin changes

Do not show a confirmation for every simple status update.

# ACTIVITY ACCOUNTABILITY

Important fields must not simply be overwritten without a record.

If assignee changes:

record:

* old assignee
* new assignee
* actor
* timestamp

If due date changes:

record:

* old due date
* new due date
* actor
* timestamp

If priority changes:

record:

* old priority
* new priority

If completed:

record:

* completion timestamp
* actor

If reopened:

record:

* previous completed state
* actor
* timestamp

# SEED DATA

Provide development seed users such as:

* Admin
* Father
* Son 1
* Son 2
* Worker

Provide sample tasks that demonstrate:

* New
* In Progress
* Waiting
* Completed
* Overdue

Use fake development passwords only.

Document them clearly.

Never use real user credentials.

# TESTING

Implement meaningful tests for critical business rules where practical.

At minimum test authorization behavior.

Test these scenarios:

1. Admin creates users.

2. Non-admin cannot manage users.

3. Admin creates Father as Manager.

4. Admin creates Son with full visibility.

5. Admin creates Worker with Own Tasks Only.

6. Father assigns task to Son.

7. Son can access the task.

8. Worker cannot access Son's task.

9. Son can see Worker task when Full Visibility is enabled.

10. Son cannot edit Worker task when canEditOthersTasks is false.

11. Son can update their own status.

12. Son adds progress update.

13. Father sees that update.

14. Son changes status to Waiting with a reason.

15. Task becomes overdue after due date.

16. Son completes task.

17. completedAt is recorded.

18. Activity history contains all important changes.

19. Admin deactivates Worker.

20. Worker can no longer log in.

21. Historical Worker tasks remain intact.

22. User cannot bypass permissions by calling server endpoints directly.

23. English interface works correctly.

24. Arabic RTL interface works correctly.

25. Switching language does not break layout.

26. Main workflow works correctly on iPhone-sized screens.

# IOS TESTING CHECKLIST

Specifically inspect:

* login
* dashboard
* task list
* task creation
* task details
* status selection
* Waiting reason
* comment/update form
* Admin user form
* notification panel
* navigation
* logout

Test Safari behavior with:

* keyboard open
* portrait orientation
* landscape orientation where practical
* long Arabic text
* long English text
* very long task titles
* browser bottom bar
* safe area
* scrolling inside dialogs

Do not declare the UI complete without reviewing these mobile cases.

# PERFORMANCE

Keep mobile performance strong.

Avoid unnecessarily large client-side JavaScript bundles.

Prefer server components where beneficial.

Optimize:

* fonts
* icons
* images
* queries
* rendering

Avoid unnecessary dependencies.

# LOGO PERFORMANCE

Do not use a large raster image for the primary interface logo.

Prefer lightweight SVG.

Provide correct icons for:

* browser favicon
* iPhone home screen
* PWA

# CODE QUALITY

Use:

* clean TypeScript
* strict typing
* meaningful naming
* reusable components
* reusable server services
* centralized permissions
* centralized validation
* centralized task authorization
* modular notifications

Avoid:

* massive components
* duplicated authorization logic
* duplicated queries
* duplicated status logic
* role checks scattered randomly throughout components
* hardcoded strings
* untranslated text

# PROJECT STRUCTURE

Choose a clean professional structure.

For example, organize around areas such as:

app
components
features
lib
services
db
auth
permissions
i18n
types

Do not follow this exact structure if a better one fits the chosen architecture.

The important requirement is maintainability.

# GITHUB

Prepare the project to be pushed directly to GitHub.

Include:

.gitignore

.env.example

README.md

database migrations

seed script

deployment documentation

No secrets should exist in the repository.

# README

Create a professional README.

Include:

* Tabea overview
* purpose
* screenshots section placeholder if desired
* features
* roles
* permission model
* Arabic and English support
* mobile/iPhone support
* technology stack
* local development
* environment variables
* Neon setup
* migrations
* seed setup
* test accounts
* Vercel deployment
* security notes
* architecture
* future OpenWA integration

Never use em dashes anywhere in the README.

# ENVIRONMENT VARIABLES

Provide a safe .env.example.

Potential variables:

DATABASE_URL=
AUTH_SECRET=
APP_URL=

Include other required variables depending on the authentication implementation.

Do not include production secrets.

# VERCEL

Ensure Tabea deploys cleanly to Vercel.

Verify:

* production build
* Neon connection
* environment variables
* server-side auth
* migrations strategy
* static assets
* i18n routing if used
* icons
* mobile metadata

No part of V1 should require a persistent background server.

# FINAL PRODUCT QUALITY

Do not stop after creating pages that only look correct.

Tabea must work as an actual application.

The final deliverable should have:

* authentication
* roles
* authorization
* user management
* user deactivation
* task creation
* assignment
* priorities
* due dates
* task statuses
* Waiting reasons
* progress updates
* activity history
* visibility permissions
* editing permissions
* dashboard
* My Tasks
* All Tasks where permitted
* task search
* filters
* in-app notifications
* profile
* settings where useful
* Arabic
* English
* proper RTL
* excellent iPhone Safari layout
* desktop responsiveness
* database migrations
* seed data
* security
* testing
* Vercel deployment readiness
* Neon integration
* professional README
* Tabea logo and application icons

# DESIGN REVIEW STANDARD

Before considering the project complete, review every major screen and ask:

Does this look like a professionally built real-world application?

Does it look excellent on an iPhone?

Can the user understand the important information immediately?

Can a task be updated with very few taps?

Does Arabic look as polished as English?

Are permissions clear and secure?

Does the interface avoid looking AI-generated?

If any answer is no, refine it.

# MOST IMPORTANT PRODUCT PRIORITIES

In this order:

1. Mobile usability
2. Clear responsibility
3. Accountability
4. Reliability
5. Security
6. Task visibility
7. Fast status updates
8. Clear history
9. Arabic and English quality
10. Simple administration
11. Maintainable architecture
12. Professional visual design

# PRODUCT PHILOSOPHY

Tabea should make it easy to answer:

What do I need to do?

What did my father assign me?

When is it due?

What am I waiting for?

What has already been completed?

What is overdue?

What is my brother working on, if I have permission to see it?

What tasks are the workers responsible for?

What happened with this task?

Who changed the deadline?

When was this completed?

The application should answer those questions without requiring users to rely on memory, phone calls, or verbal discussions.

# KEEP THE SCOPE FOCUSED

Do not turn Tabea into:

* Jira
* Trello
* ERP software
* CRM software
* accounting software
* HR software
* employee monitoring software

Tabea is a private task accountability and follow-up system.

The core idea is simple:

**Assign work clearly, follow its progress, preserve its history, and know who is responsible.**

Build that experience exceptionally well.
