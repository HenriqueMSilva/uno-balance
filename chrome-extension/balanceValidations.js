function validateBookingBalance(flightData) {
    const validationResults = [];

    // Validate payment details
    validationResults.push(validateFirstTwoPaymentsBalance(flightData));
    validationResults.push(validatePassengerPayments(flightData));
    validationResults.push(validateTotalMerchantBalance(flightData));

    // Validate sales report
    validationResults.push(validatePassengerSalesReportEntries(flightData));
    validationResults.push(validateBaggageSalesReportEntries(flightData));

    return validationResults;
}

function validateFirstTwoPaymentsBalance(flightData) {
    const { payments } = flightData;

    if (!payments || payments.length < 2) {
        return {
            type: 'FIRST_TWO_PAYMENTS',
            isValid: false,
            reason: 'Less than 2 payment entries found'
        };
    }

    const firstAmount = parseFloat(payments[0].price.replace(/[^\d.-]/g, ''));
    const secondAmount = parseFloat(payments[1].price.replace(/[^\d.-]/g, ''));
    const sum = firstAmount + secondAmount;

    const isValid = Math.abs(sum) < 0.01; // Allow small floating point errors

    return {
        type: 'FIRST_TWO_PAYMENTS',
        isValid,
        reason: isValid ? null : `First two payments (${payments[0].price} + ${payments[1].price}) do not add up to 0`
    };
}

function validatePassengerPayments(flightData) {
    const { payments, fare, tax, passengerCount } = flightData;

    if (!payments || payments.length < 2 + passengerCount) {
        return {
            type: 'PASSENGER_PAYMENTS',
            isValid: false,
            reason: `Expected ${2 + passengerCount} payments, found ${payments?.length || 0}`
        };
    }

    const fareAmount = parseFloat(fare.replace(/[^\d.-]/g, ''));
    const taxAmount = parseFloat(tax.replace(/[^\d.-]/g, ''));
    const expectedPerPassenger = (fareAmount + taxAmount) / passengerCount;

    const passengerPayments = payments.slice(2, 2 + passengerCount);

    for (let i = 0; i < passengerPayments.length; i++) {
        const paymentAmount = parseFloat(passengerPayments[i].price.replace(/[^\d.-]/g, ''));
        if (Math.abs(paymentAmount - expectedPerPassenger) > 0.01) {
            return {
                type: 'PASSENGER_PAYMENTS',
                isValid: false,
                reason: `Passenger payment ${i + 1} (${passengerPayments[i].price}) does not match expected amount (${expectedPerPassenger.toFixed(2)})`
            };
        }
    }

    return {
        type: 'PASSENGER_PAYMENTS',
        isValid: true,
        reason: null
    };
}

function validateTotalMerchantBalance(flightData) {
    const { payments, totalMerchant } = flightData;

    if (!payments || !totalMerchant) {
        return {
            type: 'TOTAL_MERCHANT',
            isValid: false,
            reason: 'Missing payment or total merchant information'
        };
    }

    const expectedTotal = parseFloat(totalMerchant.replace(/[^\d.-]/g, ''));
    const paymentsSum = payments.reduce((sum, payment) => {
        return sum + parseFloat(payment.price.replace(/[^\d.-]/g, ''));
    }, 0);

    const isValid = Math.abs(paymentsSum - expectedTotal) < 0.01;

    return {
        type: 'TOTAL_MERCHANT',
        isValid,
        reason: isValid ? null : `Sum of payments (${paymentsSum.toFixed(2)}) does not match total merchant (${totalMerchant})`
    };
}

function validatePassengerSalesReportEntries(flightData) {
    const { salesReport, fare, tax, passengerCount } = flightData;

    if (!salesReport || salesReport.length === 0) {
        return {
            type: 'PASSENGER_SALES_REPORT',
            isValid: false,
            reason: 'No sales report entries found'
        };
    }

    const fareAmount = parseFloat(fare.replace(/[^\d.-]/g, ''));
    const taxAmount = parseFloat(tax.replace(/[^\d.-]/g, ''));
    const expectedTotalPrice = (fareAmount + taxAmount) / passengerCount;
    const expectedTax = taxAmount / passengerCount;

    const passengerEntries = salesReport.filter(entry =>
        entry.action === 'ELECTRONIC_TICKETING_SALE_AUTOMATED'
    );

    if (passengerEntries.length !== passengerCount) {
        return {
            type: 'PASSENGER_SALES_REPORT',
            isValid: false,
            reason: `Expected ${passengerCount} passenger entries, found ${passengerEntries.length}`
        };
    }

    for (let i = 0; i < passengerEntries.length; i++) {
        const entry = passengerEntries[i];
        const totalPrice = entry.monetaryInformation.totalPrice;
        const entryTax = entry.monetaryInformation.tax;

        if (Math.abs(totalPrice - expectedTotalPrice) > 0.01) {
            return {
                type: 'PASSENGER_SALES_REPORT',
                isValid: false,
                reason: `Passenger entry ${i + 1} totalPrice (${totalPrice}) does not match expected (${expectedTotalPrice.toFixed(2)})`
            };
        }

        if (Math.abs(entryTax - expectedTax) > 0.01) {
            return {
                type: 'PASSENGER_SALES_REPORT',
                isValid: false,
                reason: `Passenger entry ${i + 1} tax (${entryTax}) does not match expected (${expectedTax.toFixed(2)})`
            };
        }
    }

    return {
        type: 'PASSENGER_SALES_REPORT',
        isValid: true,
        reason: null
    };
}

function validateBaggageSalesReportEntries(flightData) {
    const { salesReport, baggageCount } = flightData;

    if (!salesReport) {
        return {
            type: 'BAGGAGE_SALES_REPORT',
            isValid: false,
            reason: 'No sales report found'
        };
    }

    const baggageEntries = salesReport.filter(entry =>
        entry.action === 'ELECTRONIC_MISCELLANEOUS_DOCUMENT_ASSOCIATED'
    );

    const isValid = baggageEntries.length === baggageCount;

    return {
        type: 'BAGGAGE_SALES_REPORT',
        isValid,
        reason: isValid ? null : `Expected ${baggageCount} baggage entries, found ${baggageEntries.length}`
    };
}

function validateCurrencyConsistency(flightData) {
    const { fare, tax, totalMerchant, payments } = flightData;

    const currencies = new Set();

    // Extract currency from fare, tax, and total merchant
    const fareCurrency = extractCurrency(fare);
    const taxCurrency = extractCurrency(tax);
    const totalMerchantCurrency = extractCurrency(totalMerchant);

    if (fareCurrency) currencies.add(fareCurrency);
    if (taxCurrency) currencies.add(taxCurrency);
    if (totalMerchantCurrency) currencies.add(totalMerchantCurrency);

    // Extract currency from all payments
    if (payments && Array.isArray(payments)) {
        payments.forEach(payment => {
            const paymentCurrency = extractCurrency(payment.price);
            if (paymentCurrency) currencies.add(paymentCurrency);
        });
    }

    // Check if all currencies are the same
    if (currencies.size > 1) {
        return {
            isValid: false,
            reason: `Multiple currencies detected: ${Array.from(currencies).join(', ')} - cannot validate balance`
        };
    }

    if (currencies.size === 0) {
        return {
            isValid: false,
            reason: 'No currency information found in amounts'
        };
    }

    return {
        isValid: true,
        reason: null
    };
}

function extractCurrency(amountString) {
    if (!amountString) return null;
    // Match currency symbols or codes (e.g., €, $, USD, EUR, etc.)
    const match = amountString.match(/([A-Z]{3}|[$€£¥])/);
    return match ? match[1] : null;
}
