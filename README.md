# UNO Balance - Amadeus GDS Flight Balance Checker

A Chrome extension that checks if Amadeus GDS flights are balanced by comparing booking and sales reports data.

## Features

- Automatically detects Amadeus GDS flights segments on the current page
- Validates booking balance by comparing:
  - Fare amounts
  - Tax amounts
  - Total merchant amounts
  - Payment details
  - Sales report tickets
- Provides clear feedback for each flight:
  - ✅ Balanced
  - ❌ Unbalanced 
  - ⚠️ Cannot check balance (when validation is not possible)
- Automatically retries fetching sales reports from previous days if data is not found on the booking date

## Upcoming Features
- Handle bookings with seats
- handle bookings with refunds in payment history
- validate bag ticket by checking ticket price, not only the ticket issued
- handle division of ticket prices by number os passenger without rounding


## Scenarios Where Validation is Not Possible

The extension cannot validate a booking in the following cases:

- **Office ID is N/A**: The sales report cannot be fetched without a valid booking/office ID
- **Currency mismatch**: Different currencies detected across fare, tax, total merchant, or payment amounts

## Installation Instructions

### Install from Source (Development Mode)

1. **Download or Clone the Repository**
   - Download this repository as a ZIP file and extract it, or
   - Clone it using Git: `git clone <repository-url>`

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click the "Load unpacked" button
   - Navigate to and select the `chrome-extension` folder inside this project
   - The folder should contain `manifest.json`

5. **Verify Installation**
   - The extension should now appear in your extensions list
   - You should see "Amadeus GDS Flight Balance Checker" with a toggle switch
   - Make sure the extension is enabled (toggle should be blue/on)

6. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "Amadeus GDS Flight Balance Checker"
   - Click the pin icon to keep it visible in your toolbar

## How to Use

1. **Navigate to a booking page** that contains Amadeus GDS flights
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Check Current Page"** button
4. **Review the results** for each flight:
   - Green border = Balanced ✅
   - Red border = Unbalanced ❌
   - Orange border = Cannot validate ⚠️


## Troubleshooting

### Extension Not Working
- Try reloading the page after installing/updating the extension
- Make sure you're on a page that contains flight booking information
- Check the browser console for any error messages

### "No flights found" Message
- Verify that the page contains Amadeus GDS flight containers
- The extension specifically looks for flights with Amadeus as the GDS provider

### Need to Update the Extension
1. Make your code changes
2. Go to `chrome://extensions/`
3. Click the refresh/reload icon on the extension card
4. Reload any open tabs where you want to use the updated version


## Support

If you encounter any issues or have questions, please open an issue in the project repository.

