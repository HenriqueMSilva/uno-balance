chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAmadeusFlights') {
        checkAmadeusFlightsBalance()
            .then(result => {
                console.log('✅ [Content Script] Check complete, sending response:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ [Content Script] Error:', error);
                sendResponse({
                    error: `Script error: ${error.message}`,
                    amadeusFlights: [],
                    totalContainers: 0,
                    allBalanced: false
                });
            });
        return true;
    }
});

async function checkAmadeusFlightsBalance() {
    try {
        const flightsProduct = document.getElementById('flights-product');

        if (!flightsProduct) {
            return {
                error: 'Could not find flights-product element on this page.',
                amadeusFlights: [],
                totalContainers: 0,
                allBalanced: false
            };
        }

        const bookingDate = extractBookingDate();
        const containers = flightsProduct.querySelectorAll('.od-flight-details-container');
        const amadeusFlights = extractFlightDataFromHTML(containers, bookingDate);

        // Fetch sales report data for each flight
        const formattedDate = formatBookingDateToISO(bookingDate);

        // Wait for all async operations
        await Promise.all(amadeusFlights.map(async (flight) => {
            // Check if booking code is N/A
            if (!flight.officeId || flight.officeId === 'N/A') {
                flight.canValidate = false;
                flight.validationError = 'Booking code is N/A - cannot fetch sales report';
                flight.isBalanced = false;
                flight.validationResults = [];
                return;
            }

            // Check currency consistency
            const currencyCheck = validateCurrencyConsistency(flight);
            if (!currencyCheck.isValid) {
                flight.canValidate = false;
                flight.validationError = currencyCheck.reason;
                flight.isBalanced = false;
                flight.validationResults = [];
                return;
            }

            flight.canValidate = true;
            if (formattedDate) {
                flight.salesReport = await fetchSalesReportByPNR(flight.officeId, formattedDate, flight.pnr);
                flight.validationResults = validateBookingBalance(flight);
                flight.isBalanced = flight.validationResults.every(v => v.isValid);
                flight.unbalancedReasons = flight.validationResults
                    .filter(v => !v.isValid)
                    .map(v => v.reason);
            }
        }));

        console.log('All flights validated:', amadeusFlights);

        const allBalanced = amadeusFlights.every(flight => flight.isBalanced);

        return {
            amadeusFlights: amadeusFlights,
            totalContainers: containers.length,
            bookingDate: bookingDate,
            allBalanced: allBalanced,
            error: null
        };

    } catch (error) {
        console.error('[Critical Error]', error);
        console.error('Stack trace:', error.stack);
        return {
            error: `Script error: ${error.message}`,
            amadeusFlights: [],
            totalContainers: 0,
            allBalanced: false
        };
    }
}

function extractBookingDate() {
    const bookingDateElement = document.getElementById('bookingDate');
    return bookingDateElement ? bookingDateElement.textContent.trim() : null;
}

function formatBookingDateToISO(bookingDate) {
    if (!bookingDate) return null;

    // Parse date format: "30/12/2025 14:36" to "2025-12-30"
    const match = bookingDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
    }
    return null;
}

function extractFlightDataFromHTML(containers, bookingDate) {
    const amadeusFlights = [];

    containers.forEach((flightContainer) => {
        const containerId = flightContainer.id;
        const rightYellowDiv = flightContainer.querySelector(':scope > div.right');
        if (!rightYellowDiv) {
            console.log(` No :scope > div.right found in container ${containerId}`);
            return;
        }
        const marginDiv = rightYellowDiv.querySelector('div.margin_top10.margin_right10');
        if (!marginDiv) {
            console.log(`No margin div found in container ${containerId}`);
            return;
        }
        const flightInfoBox = marginDiv.querySelector('div.iteminfobox.info_side');
        console.log(`div.iteminfobox.info_side found:`, flightInfoBox ? '✓' : '✗', flightInfoBox);
        if (!flightInfoBox){
            console.log(`No div.iteminfobox.info_side div found in container ${containerId}`);
            return;
        }
        const childDivs = flightInfoBox.querySelectorAll(':scope > div.bold');
        if (childDivs.length > 0 && childDivs[0].textContent.trim() === '(Amadeus GDS)') {
            console.log(`AMADEUS MATCH FOUND - Processing ${containerId}`);
            const pnr = containerId;
            const officeId = childDivs.length > 3 ? childDivs[3].textContent.trim() : null;

            const passengerCount = extractPassengerCount(flightContainer);
            const baggageCount = extractBaggageCount(flightContainer);

            const flightData = extractFlightPaymentData(flightContainer, pnr, officeId);
            flightData.passengerCount = passengerCount;
            flightData.baggageCount = baggageCount;
            flightData.bookingDate = bookingDate;
            amadeusFlights.push(flightData);
        }
    });

    return amadeusFlights;
}

function extractPassengerCount(flightContainer) {
    const passengerElement = flightContainer.querySelector('.flight_details .od-flight-segment-line strong:nth-child(7)');
    return passengerElement ? parseInt(passengerElement.textContent.trim().match(/\d+/)?.[0] || '0') : 0;
}

function extractBaggageCount(flightContainer) {
    const baggageElement = flightContainer.querySelector('.segment-details .margin_bot8 > span:last-child');
    if (baggageElement) {
        const baggageMatch = baggageElement.textContent.trim().match(/(\d+)\s*Pieces/);
        return baggageMatch ? parseInt(baggageMatch[1]) : 0;
    }
    return 0;
}



async function fetchAmadeusSalesReport(officeId, reportDate) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'fetchAmadeusSalesReport',
            officeId,
            reportDate
        });

        if (response.success) {
            return response.data;
        } else {
            console.error(`Error fetching sales report: ${response.error}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching sales report for ${officeId} on ${reportDate}:`, error);
        return null;
    }
}

async function fetchSalesReportByPNR(officeId, reportDate, pnr) {
    let salesReport = await fetchAmadeusSalesReport(officeId, reportDate);
    let filteredReport = filterSalesReportByPNR(salesReport, pnr);

    // If no entries found, try the previous day
    if (filteredReport.length === 0) {
        console.log(`No sales report entries found for PNR ${pnr} on ${reportDate}, trying previous day...`);
        const previousDate = getPreviousDay(reportDate);
        salesReport = await fetchAmadeusSalesReport(officeId, previousDate);
        filteredReport = filterSalesReportByPNR(salesReport, pnr);

    }

    return filteredReport;
}

function getPreviousDay(dateString) {
    // dateString format: "2025-12-30"
    const date = new Date(dateString);
    date.setDate(date.getDate() - 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function filterSalesReportByPNR(salesReportData, pnr) {
    if (!salesReportData || !salesReportData.items || !Array.isArray(salesReportData.items)) {
        return [];
    }

    return salesReportData.items.filter(item => item.pnr === pnr);
}

function extractFlightPaymentData(flightContainer, pnr, officeId) {
    const flightData = {
        pnr: pnr,
        officeId: officeId,
        fare: null,
        tax: null,
        totalMerchant: null,
        payments: [],
        passengerCount: 0,
        baggageCount: 0
    };

    // Find the fare table that comes after this container
    let nextElement = flightContainer.nextElementSibling;
    while (nextElement && !nextElement.classList.contains('od-table-fare-wrapper')) {
        nextElement = nextElement.nextElementSibling;
    }

    if (nextElement && nextElement.classList.contains('od-table-fare-wrapper')) {
        // Extract fare information
        const fareTable = nextElement.querySelector('table.table-fare');
        if (fareTable) {
            const fareRows = fareTable.querySelectorAll('tbody tr');
            if (fareRows.length > 0) {
                const cells = fareRows[0].querySelectorAll('td.price-column');
                if (cells.length >= 3) {
                    flightData.fare = cells[0].textContent.trim();
                    flightData.tax = cells[1].textContent.trim();
                    flightData.totalMerchant = cells[2].textContent.trim();
                }
            }
        }

        // Find payment details section
        const paymentsSection = nextElement.querySelector('#flight-provider-payments');
        if (paymentsSection) {
            const paymentRows = paymentsSection.querySelectorAll('table.table-fare tbody tr:not(:first-child)');
            paymentRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const payment = {
                        date: cells[0].textContent.trim(),
                        transactionType: cells[1].textContent.trim(),
                        merchant: cells[2].textContent.trim(),
                        paymentMethod: cells[3].textContent.trim(),
                        creditCard: cells[4].textContent.trim(),
                        price: cells[5].textContent.trim()
                    };
                    flightData.payments.push(payment);
                }
            });
        }
    }

    return flightData;
}