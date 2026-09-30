# 🍽️ Restaurant Reservation & Table Booking System

A restaurant reservation application built with Next.js, React, and Tailwind CSS. Reservations and admin credentials are stored in Supabase PostgreSQL, with server-side booking validation and cancellation-notification delivery tracking.

---

## 📋 Project Overview

This is a complete end-to-end restaurant reservation system with:
- **Customer Booking Interface**: Easy 3-step booking process
- **Admin Dashboard**: Manage all reservations and view statistics
- **Admin Authentication**: Server-validated password and signed, HTTP-only session cookie
- **Shared Availability**: Server-backed table availability shared across devices
- **Data Persistence**: Reservations, admin credentials, and notification attempts saved in Supabase PostgreSQL

---

## 🎯 Features

### Customer Features
✅ **Easy Date Selection** - Pick any date from tomorrow up to 30 days in advance  
✅ **Time Slot Selection** - Choose from 11:00 AM to 10:00 PM in 30-minute intervals  
✅ **Party Size Selection** - Select 1-6 guests, with table capacity validation
✅ **Interactive Table Selection** - Visual table grid showing capacity and availability  
✅ **Real-time Availability** - Tables automatically update based on selected date/time  
✅ **Instant Confirmation** - Get booking details immediately after reservation  
✅ **Progress Indicator** - Clear 3-step progress tracker  

### Admin Features
✅ **Admin Login** - Password configured with server-only environment variables
✅ **Dashboard Stats** - View total bookings, today's bookings, guest count, table capacity  
✅ **Bookings Table** - Complete list of all reservations with guest details  
✅ **Filter by Date** - Search bookings by specific date  
✅ **Cancel Bookings** - Remove reservations with confirmation  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  

---
## Project 
Home Page 
<img width="2118" height="964" alt="image" src="https://github.com/user-attachments/assets/8fd5b4f4-4b67-4c90-972b-e56bac5fabfe" />

Table Booking process
<img width="2164" height="1176" alt="image" src="https://github.com/user-attachments/assets/26695424-e86a-4f09-82bd-805a393f0aea" />

Feedback Page
<img width="1920" height="1080" alt="Screenshot 2025-12-16 153044" src="https://github.com/user-attachments/assets/058a9dc6-b26c-42e6-8ad6-f35141a4c93a" />

Admin View Feedback
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/c54cb41e-bdc7-4c2a-9d81-8063bcd7c5f0" />

Admin Login Page 
<img width="755" height="783" alt="image" src="https://github.com/user-attachments/assets/43c583b9-fbf6-472c-bd8e-e594608d15b1" />

Admin Dashbord
<img width="1920" height="1080" alt="Screenshot 2025-12-16 153122" src="https://github.com/user-attachments/assets/c3b56a58-0a3b-4252-adfa-59cfbe0eb331" />




## 📁 Project Structure

\`\`\`
restaurant-reservation-system/
├── app/
│   ├── page.tsx              # 🏠 Homepage with hero and features
│   ├── booking/
│   │   └── page.tsx          # 📅 Customer booking page (3-step process)
│   ├── admin/
│   │   └── page.tsx          # 📊 Admin dashboard with login
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles & design tokens
├── components/
│   └── ui/                   # Shadcn UI components library
├── package.json              # Dependencies
├── next.config.mjs           # Next.js configuration
└── README.md                 # This file
\`\`\`

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### Bookings Data Structure
\`\`\`javascript
{
  id: string,           // Unique timestamp-based ID
  name: string,         // Guest full name
  email: string,        // Guest email
  phone: string,        // Guest phone number
  date: string,         // YYYY-MM-DD format
  time: string,         // HH:MM format (24-hour)
  guests: number,       // 1-6 guests
  tableNumber: number,  // 1-6 (table ID)
  smsConsent: boolean   // Guest opt-in for transactional SMS
}
\`\`\`

### Available Tables
- Table 1: 2 seats
- Table 2: 2 seats
- Table 3: 4 seats
- Table 4: 4 seats
- Table 5: 6 seats
- Table 6: 6 seats

**Total Restaurant Capacity**: 24 seats

---

## 🚀 How to Run on Your Laptop

### Prerequisites
- Node.js 18+ installed on your machine
- npm or pnpm package manager
- A code editor (VS Code recommended)

### Installation Steps

#### 1. **Download the Project**
   - Click the download button in v0 and extract the ZIP file
   - Or clone from GitHub if you pushed the code

#### 2. **Navigate to Project Directory**
   \`\`\`bash
   cd restaurant-reservation-system
   \`\`\`

#### 3. **Install Dependencies**
   \`\`\`bash
   npm install
   # or
   pnpm install
   \`\`\`

#### Local demo mode (no Supabase credentials)
When you run `npm run dev` without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the app uses a development-only local store instead of failing. You can check availability, create and cancel reservations, and sign into the admin dashboard. Data is saved in `.data/local-demo.json` on this computer; it is not shared with other devices, and email/SMS are not sent. The app labels this mode in the booking and admin screens.

This local store is intentionally disabled in production. Configure Supabase before deploying or accepting real reservations.

#### 4. **Create and configure Supabase**
Create a Supabase project and run the SQL from `supabase/migrations/202609280001_initial_reservations.sql` in the Supabase SQL Editor. Copy the project URL and **service role** key into the private `.env.local` file. Never put the service role key in a `NEXT_PUBLIC_` variable or commit it.

#### 5. **Configure admin login**
Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `CRON_SECRET` in `.env.local`. Use a unique password and generate separate random values for the session and cron secrets with:

\`\`\`bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
\`\`\`

The first server login initializes the admin account in Supabase using a salted password hash. Later changes from the admin dashboard persist in Supabase and take precedence over `.env.local`. Vercel scheduled notifications require a Vercel plan that supports cron jobs; on other hosts, schedule an authenticated GET to `/api/cron/notifications` every five minutes, with `Authorization: Bearer <CRON_SECRET>`.

#### 6. **Configure cancellation notifications**
For email, set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`. For SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. Keep keys in `.env.local`, never share them in chat or commit them. Guests receive SMS only if they explicitly opt in and enter a phone number in international format. Reservation confirmation and cancellation notices are tracked in the database outbox, and failed deliveries can be retried from the dashboard or scheduled worker.

#### 7. **Start Development Server**
   \`\`\`bash
   npm run dev
   # or
   pnpm dev
   \`\`\`

#### 8. **Open in Browser**
   - Go to: `http://localhost:3000`
   - Your app is now running! 🎉

#### 9. **Build for Production**
   \`\`\`bash
   npm run build
   npm start
   # or
   pnpm build
   pnpm start
   \`\`\`

---

## 📖 How to Use the Application

### 🎫 Customer Booking Flow

**Step 1: Date, Time & Guests**
1. Open `http://localhost:3000/booking`
2. Select a date (must be tomorrow or later, up to 30 days)
3. Choose a time slot (11:00 AM to 10:00 PM, 30-min intervals)
4. Select party size (1-10 guests)
5. Click "Next: Select Table"

**Step 2: Select Your Table**
1. View all available tables for your selected date/time
2. Tables show their seating capacity
3. Booked tables are grayed out and disabled
4. Click on an available table to select it
5. Click "Next: Your Details"

**Step 3: Enter Contact Details**
1. Fill in your full name
2. Enter your email address
3. Enter your phone number
4. Review the booking summary
5. Click "Confirm Booking"

**Confirmation Page**
- See your booking details with checkmark
- See the current email and opted-in SMS confirmation delivery status
- Click "Back to Home" to return
  
**Give Feedback of service**
-a coustomer can give feedback about the restaruent

---

### 👨‍💼 Admin Dashboard Access

**Login to Admin Panel**
1. Go to `http://localhost:3000/admin`
2. Enter the `ADMIN_PASSWORD` configured in `.env.local`
3. Click "Login to Dashboard"

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the project root `.env.local` as described above. The default initial admin ID is `admin`. Never commit `.env.local` or share credentials.

After signing in, use **Change admin ID & password** on the dashboard to update your credentials. The current password is required, and the new password must have at least 12 characters. Credentials are stored as salted password hashes in Supabase and remain changed after server restarts.

**Admin Dashboard Features**

**View Statistics**
- **Total Bookings**: All reservations across all time
- **Today's Bookings**: Only reservations for today
- **Total Guests Booked**: Sum of all guest counts
- **View Feedback**: Feedback given by cousomer can we view by admin
- **Available Tables**: Restaurant capacity (always 6)

**Manage Bookings**
1. **View All**: See complete list of all bookings
2. **Filter by Date**: Click on date input to filter bookings for a specific date
3. **Clear Filter**: Remove date filter to see all bookings again
4. **Cancel Booking**: Click "Cancel" button to remove a reservation
5. **Confirm Cancellation**: A popup asks for confirmation before deleting
6. **Guest Notifications**: On cancellation, the server attempts to email the guest and sends an SMS only when the guest opted in. Delivery status is shown in the dashboard.

To enable email and SMS, copy the Resend and Twilio values from `.env.example` into your private `.env.local`. Verify your sender address with Resend. For SMS, use an active Twilio sender and enter guest phone numbers in international E.164 format (for example `+14155552671`). SMS consent is collected on the booking form; guests who do not opt in will not receive SMS. Providers may charge for messages.

**Table Display**
- Name, Email, Phone - Guest contact information
- Date & Time - Reservation details
- Guests - Number of people
- Table - Table number assigned
- Action - Cancel button

---

## 🎨 Design & Colors

The application uses a professional **Amber/Orange** color palette:

- **Primary Color**: Amber-600 (`#B45309`) - Main buttons and accents
- **Secondary Color**: Orange-600 (`#EA580C`) - Hover states
- **Success Color**: Green-600 (`#16A34A`) - Confirmations
- **Backgrounds**: Amber-50 to Orange-50 - Subtle gradients
- **Text**: Amber-900 to Gray-900 - Dark readable text
- **Accents**: White, Gray-300 - Clean spacing

---

## 💾 Data Persistence

### How It Works
- Reservations are stored in Supabase PostgreSQL and shared across browsers and devices.
- The database enforces one active reservation per table and time slot, including concurrent booking attempts.
- Admin passwords are stored as salted scrypt hashes, not plaintext.
- Reservation confirmation/cancellation and notification delivery attempts are stored in a database outbox for retry and auditing.
- Existing `restaurant_bookings` data in old browsers remains local; import it deliberately before removing the old app.
- Availability refreshes while guests are choosing a table, and the database remains authoritative at confirmation.
- Complete the Supabase project and provider-secret setup above before running booking/admin API routes; missing configuration is reported instead of silently storing browser-only data.

Admin login uses a signed HTTP-only session cookie. Supabase, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` must be configured on the server.

---

## 🔐 Security Notes

**Important:** Production deployment must use HTTPS, restrict and rotate service-role/provider secrets, configure rate limits and backups, and establish privacy/retention policies appropriate to the restaurant's location.

⚠️ **Before public production deployment:**
- Add edge/WAF rate limits to login and public booking endpoints.
- Enable verified sender/domain settings and provider-side delivery webhooks; provider acceptance is not proof of delivery.
- Set up Supabase point-in-time recovery/backups, monitoring, and key rotation.
- Publish privacy, retention, SMS-consent, opt-out, and cancellation policies.
- Import legacy reservations deliberately and verify the deployment migration before opening bookings.
- Run scheduled notification processing on a supported host, and add monitoring/alerts for exhausted notification retries.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **UI Library**: React 19+
- **Styling**: Tailwind CSS v4
- **Components**: Shadcn UI
- **State Management**: React hooks (useState, useEffect)
- **Storage**: Supabase PostgreSQL
- **Type Safety**: TypeScript

---

## 📝 API/Functions Overview

### Key Components

#### `app/page.tsx` - Homepage
- Landing page with hero section
- Feature cards (Easy Booking, Select Table, Instant Confirmation)
- CTA buttons to booking page
- Navigation to admin panel

#### `app/booking/page.tsx` - Booking System
**Main Functions:**
- `getMinDate()` - Returns tomorrow's date
- `getMaxDate()` - Returns 30 days from today
- `getAvailableTimes()` - Returns 11:00 AM to 10:00 PM slots
- `handleSelectTable()` - Selects/validates table
- `handleConfirmBooking()` - Creates a reservation through the server API and atomic database function

**State:**
- `step` - Current step (1, 2, or 3)
- `selectedDate/Time` - Reservation details
- `guestCount` - Number of guests
- `availableTables` - Table availability
- `selectedTable` - Chosen table
- `bookings` - Reservations fetched from the authenticated server API
- `bookingConfirmed` - Confirmation flag

#### `app/admin/page.tsx` - Admin Dashboard
**Main Functions:**
- `handleLogin()` - Authenticate with password
- `calculateStats()` - Compute dashboard statistics
- `handleCancelBooking()` - Delete reservation
- `filteredBookings` - Filter bookings by date

**State:**
- `isAuthenticated` - Login status
- `bookings` - All reservations
- `filterDate` - Date filter value
- `stats` - Dashboard statistics

---

## 🐛 Troubleshooting

### Issue: Bookings not saving
**Solution:** Confirm that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and the SQL migration has been applied in the selected Supabase project.

### Issue: Admin login is unavailable
**Solution:** Set the Supabase URL/service-role key and the `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `CRON_SECRET` values in `.env.local`, then restart the server. Never commit `.env.local` or share credentials.

### Issue: Availability cannot load
**Solution:** Confirm the migration ran successfully and the server has working Supabase service-role credentials. Availability is read from the shared database.

### Issue: Port 3000 already in use
**Solution:** 
\`\`\`bash
npm run dev -- -p 3001
# or kill the process on port 3000
\`\`\`

---

## 📞 Support & Questions

For issues or questions:
1. Check the Troubleshooting section above
2. Review the code comments in the files
3. Test in browser DevTools (F12)
4. Check Supabase logs and the dashboard's notification delivery status

---

## 📄 License

This project is open source and available for personal and commercial use.

---

## ✨ Future Enhancements

Potential features to add:
- Real email notifications for confirmations
- SMS notifications
- Calendar view for admins
- Guest reviews/ratings
- Special dietary requirements
- Payment integration (Stripe)
- User accounts and booking history
- Multi-language support
- Search functionality

---

**Happy Booking! 🍽️**
