document.getElementById('checkButton').addEventListener('click', async () => {
    const button = document.getElementById('checkButton');
    const resultsDiv = document.getElementById('results');

    // Disable button while processing
    button.disabled = true;
    button.textContent = 'Checking...';
    resultsDiv.innerHTML = '<div class="result-header">Searching for Amadeus GDS flights...</div>';

    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkAmadeusFlights' });

        // Display results
        displayResults(response);
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}<br><small>Try reloading the page if you just installed/updated the extension.</small></div>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Check Current Page';
    }
});

function displayResults(data) {
    const resultsDiv = document.getElementById('results');

    if (data.error) {
        resultsDiv.innerHTML = `<div class="error">${data.error}</div>`;
        return;
    }

    if (data.amadeusFlights.length === 0) {
        resultsDiv.innerHTML = `
            <div class="result-header">Results:</div>
            <div class="no-results">No flights with Amadeus GDS found.</div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                Total flight containers found: ${data.totalContainers}
            </div>
        `;
        return;
    }

    let html = '<div style="margin-bottom: 15px; font-weight: bold;">Flight Balance Results:</div>';

    data.amadeusFlights.forEach((flight, index) => {
        const cannotValidate = flight.canValidate === false;
        let balanceIndicator, borderColor, backgroundColor, statusText;

        if (cannotValidate) {
            balanceIndicator = '⚠️';
            borderColor = '#ff9800';
            backgroundColor = '#fffbf0';
            statusText = 'Cannot check balance';
        } else if (flight.isBalanced) {
            balanceIndicator = '✅';
            borderColor = '#4CAF50';
            backgroundColor = '#f0f9f0';
            statusText = 'Balanced';
        } else {
            balanceIndicator = '❌';
            borderColor = '#f44336';
            backgroundColor = '#fff5f5';
            statusText = 'Unbalanced';
        }

        html += `
            <div style="margin-bottom: 15px; padding: 10px; border: 2px solid ${borderColor}; border-radius: 5px; background-color: ${backgroundColor};">
                <div style="font-weight: bold; margin-bottom: 8px;">${balanceIndicator} Flight ${index + 1} - ${statusText}</div>
                <div class="flight-id">
                    <strong>PNR:</strong> ${flight.pnr}<br>
                    <strong>Office ID:</strong> ${flight.officeId || 'N/A'}
                </div>
                ${cannotValidate ? `
                    <div style="margin-top: 10px; padding: 8px; background-color: #fff3cd; border-left: 3px solid #ff9800; border-radius: 3px;">
                        <strong style="color: #f57c00;">Reason:</strong>
                        <div style="margin-top: 5px; font-size: 12px;">${flight.validationError}</div>
                    </div>
                ` : !flight.isBalanced && flight.unbalancedReasons && flight.unbalancedReasons.length > 0 ? `
                    <div style="margin-top: 10px; padding: 8px; background-color: #ffe6e6; border-left: 3px solid #f44336; border-radius: 3px;">
                        <strong style="color: #d32f2f;">Unbalanced because:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 12px;">
                            ${flight.unbalancedReasons.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += `
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Total flight containers checked: ${data.totalContainers}<br>
            Amadeus flights found: ${data.amadeusFlights.length}
        </div>
    `;

    resultsDiv.innerHTML = html;
}
