// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 [Content Script] Received message:', request);

    if (request.action === 'checkAmadeusFlights') {
        console.log('🔍 [Content Script] Starting Amadeus GDS check...');

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

// Main function to check for Amadeus GDS flights
function checkAmadeusFlights() {

    try {
        const amadeusIds = [];

        // Find the flights product container
        const flightsProduct = document.getElementById('flights-product');

        if (!flightsProduct) {
            return {
                error: 'Could not find flights-product element on this page.',
                amadeusIds: [],
                totalContainers: 0
            };
        }

        // Find all flight detail containers
        const containers = flightsProduct.querySelectorAll('.od-flight-details-container');
        console.log(`✈️  [Step 2] Found ${containers.length} flight container(s):`, containers);

        // Check each container for Amadeus GDS
        containers.forEach((flightContainer, index) => {
            const containerId = flightContainer.id;
            console.log(`\n🔎 [Flight ${index + 1}/${containers.length}] Checking container: ${containerId}`);

            // Look for the div with class "bold" that contains "(Amadeus GDS)"
            const rightYellowDiv = flightContainer.querySelector(':scope > div.right');
            console.log(`  ↳ div.right found:`, rightYellowDiv ? '✓' : '✗', rightYellowDiv);
            if (!rightYellowDiv) {
                console.log(`  ⚠️  No div.right found in container ${containerId}`);
                return;
            }

            // Try to find the margin div - be more flexible with the selector
            const marginDiv = rightYellowDiv.querySelector('div.margin_top10.margin_right10');
            console.log(`  ↳ div.margin_top10.margin_right10 found (exact match):`, marginDiv ? '✓' : '✗', marginDiv);
            if (!marginDiv) {
                console.log(`  ⚠️  No margin div found in container ${containerId}`);
                return;
            }

            const flightInfoBox = marginDiv.querySelector('div.iteminfobox.info_side');
            console.log(`  ↳ div.iteminfobox.info_side found:`, flightInfoBox ? '✓' : '✗', flightInfoBox);
            if (!flightInfoBox) return;

            // Get all direct child divs and check the second one
            const childDivs = flightInfoBox.querySelectorAll(':scope > div.bold');
            console.log(`  ↳ Found ${childDivs.length} div.bold element(s) inside info_side`);

            // Check all bold divs for Amadeus GDS text
            for (let i = 0; i < childDivs.length; i++) {
                const div = childDivs[i];
                const text = div.textContent.trim();
                console.log(`    [${i + 1}] div.bold text: "${text}"`);

                if (text === '(Amadeus GDS)') {
                    console.log(`    ✅ MATCH FOUND! Adding ${containerId} to results`);
                    amadeusIds.push(containerId);
                    break;
                } else {
                    console.log(`    ❌ No match (expected "(Amadeus GDS)")`);
                }
            }
        });

        console.log('\n📊 [Results] Scan complete!');
        console.log(`   ✓ Total containers checked: ${containers.length}`);
        console.log(`   ✓ Amadeus GDS flights found: ${amadeusIds.length}`);
        console.log(`   ✓ Flight IDs:`, amadeusIds);

        return {
            amadeusIds: amadeusIds,
            totalContainers: containers.length,
            error: null
        };

    } catch (error) {
        console.error('💥 [Critical Error]', error);
        console.error('Stack trace:', error.stack);
        return {
            error: `Script error: ${error.message}`,
            amadeusIds: [],
            totalContainers: 0
        };
    }
}
