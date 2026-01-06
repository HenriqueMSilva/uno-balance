chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAmadeusFlights') {
        try {
            const result = checkAmadeusFlights();
            console.log('✅ [Content Script] Check complete, sending response:', result);
            sendResponse(result);
        } catch (error) {
            console.error('❌ [Content Script] Error:', error);
            sendResponse({
                error: `Script error: ${error.message}`,
                amadeusFlights: [],
                totalContainers: 0
            });
        }
    }
});

function checkAmadeusFlights() {

    try {
        const amadeusFlights = [];

        const flightsProduct = document.getElementById('flights-product');

        if (!flightsProduct) {
            return {
                error: 'Could not find flights-product element on this page.',
                amadeusFlights: [],
                totalContainers: 0
            };
        }

        const containers = flightsProduct.querySelectorAll('.od-flight-details-container');
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
                const flightData = extractFlightPaymentDetails(flightContainer, pnr, officeId);
                amadeusFlights.push(flightData);
            }
        });

        return {
            amadeusFlights: amadeusFlights,
            totalContainers: containers.length,
            error: null
        };

    } catch (error) {
        console.error('[Critical Error]', error);
        console.error('Stack trace:', error.stack);
        return {
            error: `Script error: ${error.message}`,
            amadeusFlights: [],
            totalContainers: 0
        };
    }
}

function extractFlightPaymentDetails(flightContainer, pnr, officeId) {
    const flightData = {
        pnr: pnr,
        officeId: officeId,
        fare: null,
        tax: null,
        totalMerchant: null,
        payments: []
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
