chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAmadeusSalesReport') {
        const { officeId, reportDate } = request;
        const amadeusSalesReportUrl = `https://lb.amadeus-gateway.gke-apps.edo.qa/amadeus-gateway/api/v2/salesReport/ticket/?officeId=${officeId}&reportDate=${reportDate}`;

        fetch(amadeusSalesReportUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }
});

