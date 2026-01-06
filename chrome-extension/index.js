document.getElementById('checkButton').addEventListener('click', async () => {
    const button = document.getElementById('checkButton');
    const resultsDiv = document.getElementById('results');

    button.disabled = true;
    button.textContent = 'Checking...';
    resultsDiv.innerHTML = '<div class="result-header">Searching for Amadeus GDS flights...</div>';

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'checkAmadeusFlights' });
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
        resultsDiv.innerHTML = renderError(data.error);
        return;
    }
    if (data.amadeusFlights.length === 0) {
        resultsDiv.innerHTML = renderNoFlights(data.totalContainers);
        return;
    }

    const flightsHtml = data.amadeusFlights.map((flight, index) =>
        renderFlightCard(flight, index)
    ).join('');
    const summaryHtml = renderSummary(data.totalContainers, data.amadeusFlights.length);
    resultsDiv.innerHTML = flightsHtml + summaryHtml;
}

