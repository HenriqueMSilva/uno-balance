
function renderError(errorMessage) {
    return `<div class="error">${errorMessage}</div>`;
}

function renderNoFlights(totalContainers) {
    return `
        <div class="result-header">Results:</div>
        <div class="no-results">No flights with Amadeus GDS found.</div>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Total flight containers found: ${totalContainers}
        </div>
    `;
}

function renderSummary(totalContainers, amadeusFlightsCount) {
    return `
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Total flight containers checked: ${totalContainers}<br>
            Amadeus flights found: ${amadeusFlightsCount}
        </div>
    `;
}

function renderFlightCard(flight, index) {
    const flightStatus = getFlightStatus(flight);
    const flightDetails = renderFlightData(flight);
    const statusMessage = renderStatusMessage(flight);

    return `
        <div style="margin-bottom: 15px; padding: 10px; border: 2px solid ${flightStatus.borderColor}; border-radius: 5px; background-color: ${flightStatus.backgroundColor};">
            <div style="font-weight: bold; margin-bottom: 8px;">
                ${flightStatus.indicator} Flight ${index + 1} - ${flightStatus.text}
            </div>
            ${flightDetails}
            ${statusMessage}
        </div>
    `;
}

function getFlightStatus(flight) {
    if (flight.canValidate === false) {
        return {
            indicator: '⚠️',
            text: 'Cannot check balance',
            borderColor: '#ff9800',
            backgroundColor: '#fffbf0'
        };
    }

    if (flight.isBalanced) {
        return {
            indicator: '✅',
            text: 'Balanced',
            borderColor: '#4CAF50',
            backgroundColor: '#f0f9f0'
        };
    }

    return {
        indicator: '❌',
        text: 'Unbalanced',
        borderColor: '#f44336',
        backgroundColor: '#fff5f5'
    };
}

function renderFlightData(flight) {
    return `
        <div class="flight-id">
            <strong>PNR:</strong> ${flight.pnr}<br>
            <strong>Office ID:</strong> ${flight.officeId || 'N/A'}
        </div>
    `;
}

function renderStatusMessage(flight) {
    if (flight.canValidate === false) {
        return `
            <div style="margin-top: 10px; padding: 8px; background-color: #fff3cd; border-left: 3px solid #ff9800; border-radius: 3px;">
                <strong style="color: #f57c00;">Reason:</strong>
                <div style="margin-top: 5px; font-size: 12px;">${flight.validationError}</div>
            </div>
        `;
    }

    if (!flight.isBalanced && flight.unbalancedReasons && flight.unbalancedReasons.length > 0) {
        const reasonsList = flight.unbalancedReasons
            .map(reason => `<li>${reason}</li>`)
            .join('');

        return `
            <div style="margin-top: 10px; padding: 8px; background-color: #ffe6e6; border-left: 3px solid #f44336; border-radius: 3px;">
                <strong style="color: #d32f2f;">Unbalanced because:</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 12px;">
                    ${reasonsList}
                </ul>
            </div>
        `;
    }

    return '';
}