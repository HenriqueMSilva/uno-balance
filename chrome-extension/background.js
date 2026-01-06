chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAmadeusSalesReport') {
        const { officeId, reportDate } = request;
        const url = `https://lb.amadeus-gateway.gke-apps.edo.qa/amadeus-gateway/api/v2/salesReport/ticket/?officeId=${officeId}&reportDate=${reportDate}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep the message channel open for async response
    }
});

