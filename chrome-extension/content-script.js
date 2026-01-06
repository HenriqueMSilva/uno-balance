// Content Script for Amadeus GDS Flight Checker
// This runs on the page and can be debugged in Sources > Content Scripts

console.log('🔌 [Content Script] Amadeus GDS Checker loaded');

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

    return true; // Keep the message channel open for async response
});

// Main function to check for Amadeus GDS flights
function checkAmadeusFlights() {

    try {
        console.log('🔍 [Amadeus GDS Checker] Starting scan...');
        const amadeusIds = [];

        // Find the flights product container
        const flightsProduct = document.getElementById('flights-product');
        console.log('📦 [Step 1] Looking for flights-product element:', flightsProduct);

        if (!flightsProduct) {
            console.error('❌ [Error] Could not find flights-product element');
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
        containers.forEach((container, index) => {
            const containerId = container.id;
            console.log(`\n🔎 [Flight ${index + 1}/${containers.length}] Checking container: ${containerId}`);

            // Look for the div with class "bold" that contains "(Amadeus GDS)"
            // Following the path: container > div.right > div.margin_top10.margin_right10 > div.iteminfobox.info_side > div:nth-child(2)
            const rightDiv = container.querySelector('div.right');
            console.log(`  ↳ div.right found:`, rightDiv ? '✓' : '✗', rightDiv);
            if (!rightDiv) return;

            const marginDiv = rightDiv.querySelector('div.margin_top10.margin_right10');
            console.log(`  ↳ div.margin_top10.margin_right10 found:`, marginDiv ? '✓' : '✗', marginDiv);
            if (!marginDiv) return;

            const infoBox = marginDiv.querySelector('div.iteminfobox.info_side');
            console.log(`  ↳ div.iteminfobox.info_side found:`, infoBox ? '✓' : '✗', infoBox);
            if (!infoBox) return;

            // Get all direct child divs and check the second one
            const childDivs = infoBox.querySelectorAll(':scope > div.bold');
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

