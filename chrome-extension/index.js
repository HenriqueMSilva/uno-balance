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

    if (data.amadeusIds.length === 0) {
        resultsDiv.innerHTML = `
            <div class="result-header">Results:</div>
            <div class="no-results">No flights with Amadeus GDS found.</div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                Total flight containers found: ${data.totalContainers}
            </div>
        `;
        return;
    }

    let html = `
        <div class="success">
            Found ${data.amadeusIds.length} flight(s) with Amadeus GDS
        </div>
        <div class="result-header" style="margin-top: 15px;">Flight IDs:</div>
    `;

    data.amadeusIds.forEach(id => {
        html += `<div class="flight-id">${id}</div>`;
    });

    html += `
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Total flight containers checked: ${data.totalContainers}
        </div>
    `;

    resultsDiv.innerHTML = html;
}

