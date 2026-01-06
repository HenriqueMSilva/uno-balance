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
                amadeusIds: [],
                totalContainers: 0
            });
        }
    }
});

function checkAmadeusFlights() {

    try {
        const amadeusIds = [];

        const flightsProduct = document.getElementById('flights-product');

        if (!flightsProduct) {
            return {
                error: 'Could not find flights-product element on this page.',
                amadeusIds: [],
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
            for (let i = 0; i < childDivs.length; i++) {
                const div = childDivs[i];
                const text = div.textContent.trim();
                console.log(` [${i + 1}] div.bold text: "${text}"`);

                if (text === '(Amadeus GDS)') {
                    console.log(`    ✅ MATCH FOUND! Adding ${containerId} to results`);
                    amadeusIds.push(containerId);
                    break;
                } else {
                    console.log(`    ❌ No match (expected "(Amadeus GDS)")`);
                }
            }
        });

        console.log('\n [Results] Scan complete!');
        console.log(`   ✓ Total containers checked: ${containers.length}`);
        console.log(`   ✓ Amadeus GDS flights found: ${amadeusIds.length}`);
        console.log(`   ✓ Flight IDs:`, amadeusIds);

        return {
            amadeusIds: amadeusIds,
            totalContainers: containers.length,
            error: null
        };

    } catch (error) {
        console.error('[Critical Error]', error);
        console.error('Stack trace:', error.stack);
        return {
            error: `Script error: ${error.message}`,
            amadeusIds: [],
            totalContainers: 0
        };
    }
}
