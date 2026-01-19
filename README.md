# Someday
<p align="center">
<img src="./someday-logo.svg" width="250" alt="someday logo"/>
</p>

**Free to host calendar availability picker - open-source cal.com / calendly alternative built on [Google-Apps-Script](https://developers.google.com/apps-script) for Gmail users.**


## Demo (mocked endpoints)

[https://someday-demo.vercel.app/](https://someday-demo.vercel.app/)

## What is Someday?

Someday is a simple, open-source scheduling tool designed specifically for Gmail users. Uses Google Apps Scripts to host and [clasp](https://github.com/google/clasp) to manage. Built with modern technologies like [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Shadcn/UI](https://ui.shadcn.com/), and [Vite](https://vite.dev/). A simple alternative to traditional scheduling apps like Calendly.

### Key Features

- **Free to Host**: Using Google Apps Script, hosting is free via your Google account.
- **Open Source**: Someday is completely free to use and open for contributions.
- **Effortless Integration**: Designed as a Google Apps Script, Someday integrates seamlessly with your Gmail, making it easy to manage your schedule directly from your inbox.
- **Developer-Friendly**: Built with modern, developer-preferred technologies, Someday is easy to customize and extend.
- **Multiple Event Types**: Create diverse meeting options like "Quick Chat" or "Deep Dive" with unique durations and availability settings.
- **Team Scheduling**: Add multiple calendars including teammates' calendars (with read access) for collaborative scheduling.
- **Flexible Scheduling Strategies**: Choose between "Collective" (all team members must be free) or "Round-Robin" (distribute bookings among available team members) scheduling modes.
- **Guest Permission Controls**: Fine-grained control over what guests can do with booked events (modify, invite others, see attendees) and calendar visibility (public, private, or default).
- **Dynamic Configuration**: Adjust your timezone, working hours, available days, and monitored calendars globally or per event type directly through the integrated Settings screen.
- **Owner-Only Access**: Secure access to configuration via the script owner's Google account session.
- **Simple Booking Process**: Users can select a date and time slot, then fill out a straightforward form with their name, email, phone, and an optional note.
- **Privacy First**: No data sharing beyond Google to 3rd party apps.

## Getting Started

### Configuration

Someday includes a built-in **Settings** screen for easy configuration.

1. **Accessing Settings**:
   - Once deployed, open your web app URL.
   - If you are the person who deployed the script (the **Owner**), you will see a **gear icon** ⚙️ next to the theme toggle.
   - **Note**: Google Apps Script owner recognition may fail if you are logged into multiple Google accounts in the same browser. To see the settings icon, ensure you are logged into **only one account** or use an **Incognito/Private window** and log into the account you deployed the script with.
   - Click the gear icon to open the configuration screen.

2. **Configurable Settings**:
   
   **Global Defaults**:
   - **Time Zone**: Set your primary time zone for availability calculations.
   - **Scheduling Window**: Control how many days into the future users can book (up to 90 days).
   - **Work Hours**: Define your standard daily window of availability.
   - **Available Days**: Select which days of the week you normally accept bookings.
   - **Monitored Calendars**: Choose multiple calendars to check for conflicts (e.g., Personal, Work, Holidays). You can add teammate calendars or any calendar you have read access to by entering their email address.
   - **Scheduling Strategy** (when multiple calendars selected):
     - **Collective**: All selected team members must be free for a timeslot to be available. All team members are invited to the booked event.
     - **Round-Robin**: Bookings are distributed among available team members. Only the assigned team member and the guest receive calendar invites.

   **Event Types**:
   - **Custom Meeting Types**: Create unlimited event types (e.g. "15 Min Discovery", "1 Hour Review").
   - **Flexible Durations**: Set specific lengths for each meeting type (up to 24 hours).
   - **Guest Permissions**: Control what guests can do with booked events:
     - **Modify Event**: Allow/prevent guests from changing event details, time, or location
     - **Invite Others**: Allow/prevent guests from adding additional attendees
     - **See Other Guests**: Allow/prevent guests from viewing the attendee list
   - **Calendar Visibility**: Choose how events appear in Google Calendar:
     - **Default**: Uses your calendar's default visibility setting
     - **Public**: Event details are publicly visible to everyone
     - **Private**: Shows only as "Busy" without revealing event details
   - **Smart Overrides**: Override global Work Hours, Available Days, Monitored Calendars, and Scheduling Strategy for specific event types.
   - **Per-Event Strategies**: Set different scheduling strategies for different event types (e.g., Round-Robin for sales calls, Collective for team meetings).
   - **Direct Links**: Copy a unique booking URL for any event type to share directly.
   - **Visibility Controls**: Toggle which event types are displayed on your main public scheduling page.

3. **Backend Defaults**:
   To change the fallback defaults, you can modify the `CONFIG` object initialization in `backend/src/app.ts`.

### Self host iframe html / remove Google App Scripts banner

- Google apps script has a banner that says "This application was created by a Google Apps Script user", to remove you can host the html file yourself and embed the script as an iframe

- Use the `hosted-iframe-example.html` file, github pages is a good option for this, add your script url to the iframe src

### Develop

- `cd ./frontend`
- `npm install`
- `npm run dev`
- dummyData will be generated on the fly using the generateDummyData function ~line 42 in `frontend/hooks/useGoogleTimeSlots.ts`

### Install 


### Step 1: Set Up Your Environment

__you may need to sign out of all accounts, and only into your target account__

1. **Install `clasp`:**
   - Ensure you have Node.js installed.
   - Install `clasp` globally using npm:
     ```bash
     npm install -g @google/clasp@^2.5.0
     ```

2. **Login with `clasp`:**
   - Execute the following command to log in:
     ```bash
     clasp login
     ```

3. **Remove Existing Configuration (if necessary):**
   - If you encounter issues, remove the existing `.clasp.json` file:
     ```bash
     rm .clasp.json
     ```


4. **Enable Apps Script API:**
   - Visit [Google Apps Script API settings](https://script.google.com/home/usersettings).
   - Enable the Apps Script API.
   - Wait a few minutes for the changes to propagate.

### Step 2: Create and Deploy the Script

1. **Create a New Project:**
   - Create a new Apps Script project as a web app:
     ```bash
     clasp create --type webapp
     ```

2. **Deploy the Script:**
   - Use the following command to deploy your script:
     ```bash
     npm run deploy
     ```


3. **Access the Web App:**
   - Visit the URL provided after deployment.
   - You will see the message "Authorization is required to perform that action."
  
4. **Authorize the Web App: (!!! IMPORTANT !!!)**
   - run `clasp open` to open the editor
   - go to `dist/app.gs`
   - in the drop down at the top, select `fetchAvailability` then hit run
   - Authorization modal will pop up, 'Review permissions', select your account, you will see a warning, go to advanced, then Go to <your script>(unsafe) then click Allow
   - if it worked, refresh the page/editor then run the function again and it should complete without issue.

5. **Calendar Access:**
   - By default, the script uses your primary calendar.
   - You can add multiple calendars directly through the **Settings** screen in the UI by selecting from your owned calendars or entering any calendar email address (e.g., teammate@company.com).
   - The script needs at least read access to any calendar you monitor for conflicts or team scheduling.
   - For team scheduling, ensure you have appropriate calendar permissions for teammates' calendars you wish to include.

## Cheat Sheet

- `npm run deploy` - build and deploy
- `npm run build` - build only

- `undeployall.sh` - undeploy all versions of the script

- `deployments.sh` - list all deployments web-urls

- `clasp open` - open the script editor

## Screen Captures

<img src="./screencap1.jpg" width="350" />
<img src="./screencap2.jpg" width="350" />


## Contributing

Open a pull request or issue to contribute to Someday. welcoming all contributions, including bug fixes, feature requests, and documentation improvements.

## License

MIT
