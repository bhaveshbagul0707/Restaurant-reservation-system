# 🍽️ Restaurant Reservation & Table Booking System

A modern, simple, and fully functional restaurant table reservation system built with Next.js, React, and Tailwind CSS. No database required - uses localStorage for data persistence.

---

## 📋 Project Overview

This is a complete end-to-end restaurant reservation system with:
- **Customer Booking Interface**: Easy 3-step booking process
- **Admin Dashboard**: Manage all reservations and view statistics
- **Admin Authentication**: Secure login with demo password
- **Real-time Availability**: Tables show as booked/available instantly
- **Data Persistence**: All bookings saved to browser localStorage

---

## 🎯 Features

### Customer Features
✅ **Easy Date Selection** - Pick any date from tomorrow up to 30 days in advance  
✅ **Time Slot Selection** - Choose from 11:00 AM to 10:00 PM in 30-minute intervals  
✅ **Party Size Selection** - Select 1-10 guests with easy increment/decrement buttons  
✅ **Interactive Table Selection** - Visual table grid showing capacity and availability  
✅ **Real-time Availability** - Tables automatically update based on selected date/time  
✅ **Instant Confirmation** - Get booking details immediately after reservation  
✅ **Progress Indicator** - Clear 3-step progress tracker  

### Admin Features
✅ **Secure Login** - Password-protected dashboard (demo: `admin123`)  
✅ **Dashboard Stats** - View total bookings, today's bookings, guest count, table capacity  
✅ **Bookings Table** - Complete list of all reservations with guest details  
✅ **Filter by Date** - Search bookings by specific date  
✅ **Cancel Bookings** - Remove reservations with confirmation  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  

---

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

## 🗄️ Database Schema (localStorage)

### Bookings Data Structure
\`\`\`javascript
{
  id: string,           // Unique timestamp-based ID
  name: string,         // Guest full name
  email: string,        // Guest email
  phone: string,        // Guest phone number
  date: string,         // YYYY-MM-DD format
  time: string,         // HH:MM format (24-hour)
  guests: number,       // 1-10 guests
  tableNumber: number   // 1-6 (table ID)
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

#### 4. **Start Development Server**
   \`\`\`bash
   npm run dev
   # or
   pnpm dev
   \`\`\`

#### 5. **Open in Browser**
   - Go to: `http://localhost:3000`
   - Your app is now running! 🎉

#### 6. **Build for Production**
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
- Confirmation email info (demo doesn't send real emails)
- Click "Back to Home" to return

---

### 👨‍💼 Admin Dashboard Access

**Login to Admin Panel**
1. Go to `http://localhost:3000/admin`
2. Enter password: `admin123`
3. Click "Login to Dashboard"

**Admin Dashboard Features**

**View Statistics**
- **Total Bookings**: All reservations across all time
- **Today's Bookings**: Only reservations for today
- **Total Guests Booked**: Sum of all guest counts
- **Available Tables**: Restaurant capacity (always 6)

**Manage Bookings**
1. **View All**: See complete list of all bookings
2. **Filter by Date**: Click on date input to filter bookings for a specific date
3. **Clear Filter**: Remove date filter to see all bookings again
4. **Cancel Booking**: Click "Cancel" button to remove a reservation
5. **Confirm Cancellation**: A popup asks for confirmation before deleting

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
- All bookings are stored in **browser localStorage**
- Data persists between page refreshes and browser sessions
- Each device has its own separate data
- Clearing browser cache will delete all bookings

### Storage Key
\`\`\`
restaurant_bookings
\`\`\`

### Example localStorage Data
\`\`\`json
[
  {
    "id": "1731234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 (555) 000-0000",
    "date": "2025-11-25",
    "time": "19:00",
    "guests": 4,
    "tableNumber": 3
  }
]
\`\`\`

---

## 🔐 Security Notes

**Important:** This is a demo application with basic authentication.

⚠️ **For Production Use:**
- Replace localStorage with a real database (PostgreSQL, MongoDB, etc.)
- Implement proper authentication (JWT tokens, OAuth, etc.)
- Use secure password hashing (bcrypt, etc.)
- Add input validation and sanitization
- Implement rate limiting
- Add email verification
- Use environment variables for sensitive data

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **UI Library**: React 19+
- **Styling**: Tailwind CSS v4
- **Components**: Shadcn UI
- **State Management**: React hooks (useState, useEffect)
- **Storage**: Browser localStorage
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
- `handleConfirmBooking()` - Saves booking to localStorage

**State:**
- `step` - Current step (1, 2, or 3)
- `selectedDate/Time` - Reservation details
- `guestCount` - Number of guests
- `availableTables` - Table availability
- `selectedTable` - Chosen table
- `bookings` - All bookings from localStorage
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
**Solution:** Check if localStorage is enabled in browser settings. Private/Incognito mode may not support localStorage.

### Issue: Admin password not working
**Solution:** Ensure caps lock is off. Default password is `admin123` (lowercase).

### Issue: Tables show as always available
**Solution:** Refresh the page. Select date and time first to see availability.

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
4. Check localStorage in DevTools → Application tab

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
