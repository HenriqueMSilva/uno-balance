function validateBookingBalance(flightData) {
    const validationResults = [];
    validationResults.push(validateAirlineRefundPaymentsBalance(flightData));
    validationResults.push(validatePassengerTicketsPayments(flightData));
    validationResults.push(validatePaymentRecordsCount(flightData));
    validationResults.push(validateTotalMerchantBalance(flightData));
    validationResults.push(validatePassengerSalesReportEntries(flightData));
    validationResults.push(validateBaggageSalesReportEntries(flightData));
    return validationResults;
}

function validateAirlineRefundPaymentsBalance(flightData) {
    const { payments } = flightData;

    if (!payments || payments.length < 2) {
        return {
            type: 'AIRLINE_REFUND_PAIRS',
            isValid: false,
            reason: 'Less than 2 payment entries found',
            flightTicketsStartIndex: 0
        };
    }

    const { flightTicketsStartIndex, invalidPairs } = processRefundPairs(payments);
    flightData.flightTicketsStartIndex = flightTicketsStartIndex;

    if (invalidPairs.length > 0) {
        return {
            type: 'AIRLINE_REFUND_PAIRS',
            isValid: false,
            reason: `Found ${invalidPairs.length} refund pair(s) that don't sum to zero: ${invalidPairs.map(p => `[${p.current} + ${p.refund} = ${p.sum}]`).join(', ')}`,
            flightTicketsStartIndex: flightTicketsStartIndex
        };
    }

    if (flightTicketsStartIndex === 0) {
        return {
            type: 'AIRLINE_REFUND_PAIRS',
            isValid: false,
            reason: 'No AIRLINE REFUND pairs found at the beginning of payments',
            flightTicketsStartIndex: 0
        };
    }

    return {
        type: 'AIRLINE_REFUND_PAIRS',
        isValid: true,
        reason: null,
        flightTicketsStartIndex: flightTicketsStartIndex
    };
}

function processRefundPairs(payments) {
    const invalidPairs = [];
    let currentIndex = 0;

    while (currentIndex + 1 < payments.length && isAirlineRefundPair(currentIndex, payments)) {
        const payment = payments[currentIndex];
        const nextPayment = payments[currentIndex + 1];
        const validation = validateRefundPairBalance(payment, nextPayment);

        if (!validation.isBalanced) {
            invalidPairs.push({
                index: currentIndex,
                current: validation.paymentAmount,
                refund: validation.refundAmount,
                sum: validation.sum
            });
        }

        currentIndex += 2;
    }

    return {
        flightTicketsStartIndex: currentIndex,
        invalidPairs: invalidPairs
    };
}

function isAirlineRefundPair(currentIndex, payments) {
    const nextPayment = payments[currentIndex + 1];
    return nextPayment && nextPayment.transactionType === 'AIRLINE REFUND';
}

function validateRefundPairBalance(payment, refundPayment) {
    const paymentCents = moneyToCents(payment.price);
    const refundCents = moneyToCents(refundPayment.price);
    const sumCents = paymentCents + refundCents;

    return {
        isBalanced: sumCents === 0,
        paymentAmount: payment.price,
        refundAmount: refundPayment.price,
        sum: centsToMoney(sumCents)
    };
}

function validatePaymentRecordsCount(flightData) {
    const { payments, passengerCount, baggageCount, flightTicketsStartIndex = 0 } = flightData;

    if (!payments) {
        return {
            type: 'PAYMENT_RECORDS_COUNT',
            isValid: false,
            reason: 'No payment records found'
        };
    }
    const ancillaryCount = baggageCount;
    const refundRecordsCount = flightTicketsStartIndex;
    const expectedTotalRecords = refundRecordsCount + passengerCount + ancillaryCount;
    const actualRecordsCount = payments.length;

    const isValid = actualRecordsCount === expectedTotalRecords;

    return {
        type: 'PAYMENT_RECORDS_COUNT',
        isValid,
        reason: isValid
            ? null
            : `Expected ${expectedTotalRecords} payment records (${refundRecordsCount} refund + ${passengerCount} passengers + ${baggageCount} bags), found ${actualRecordsCount}`
    };
}

function validatePassengerTicketsPayments(flightData) {
    const { payments, fare, tax, passengerCount, flightTicketsStartIndex = 0 } = flightData;

    // Use the index directly to know where passenger payments start
    const recordsToSkip = flightTicketsStartIndex;

    if (!payments || payments.length < recordsToSkip + passengerCount) {
        return {
            type: 'PASSENGER_PAYMENTS',
            isValid: false,
            reason: `Expected ${recordsToSkip + passengerCount} payments (${recordsToSkip} refund records + ${passengerCount} passenger payments), found ${payments?.length || 0}`
        };
    }

    const fareCents = moneyToCents(fare);
    const taxCents = moneyToCents(tax);
    const totalCents = fareCents + taxCents;
    const expectedPerPassengerCents = Math.floor(totalCents / passengerCount);
    const passengerPayments = payments.slice(recordsToSkip, recordsToSkip + passengerCount);

    for (let i = 0; i < passengerPayments.length; i++) {
        const paymentCents = moneyToCents(passengerPayments[i].price);
        if (paymentCents !== expectedPerPassengerCents) {
            return {
                type: 'PASSENGER_PAYMENTS',
                isValid: false,
                reason: `Passenger payment ${i + 1} (${passengerPayments[i].price}) does not match expected amount (${centsToMoney(expectedPerPassengerCents)})`
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

    const expectedTotalCents = moneyToCents(totalMerchant);
    const paymentsSumCents = payments.reduce(
        (sum, payment) => sum + moneyToCents(payment.price),
        0
    );

    const isValid = paymentsSumCents === expectedTotalCents;

    return {
        type: 'TOTAL_MERCHANT',
        isValid,
        reason: isValid
            ? null
            : `Sum of payments (${centsToMoney(paymentsSumCents)}) does not match total merchant (${totalMerchant})`
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

    const fareCents = moneyToCents(fare);
    const taxCents = moneyToCents(tax);

    const totalPriceCents = fareCents + taxCents;
    const expectedTotalPriceCents = Math.floor(totalPriceCents / passengerCount);
    const expectedTaxCents = Math.floor(taxCents / passengerCount);

    const passengerEntries = salesReport.filter(
        entry => entry.action === 'ELECTRONIC_TICKETING_SALE_AUTOMATED'
    );

    if (passengerEntries.length !== passengerCount) {
        return {
            type: 'PASSENGER_SALES_REPORT',
            isValid: false,
            reason: `Expected ${passengerCount} ETS tickets in sales report for passengers, found ${passengerEntries.length}`
        };
    }

    for (let i = 0; i < passengerEntries.length; i++) {
        const entry = passengerEntries[i];
        const totalPriceCentsEntry = moneyToCents(entry.monetaryInformation.totalPrice);
        const taxCentsEntry = moneyToCents(entry.monetaryInformation.tax);

        if (totalPriceCentsEntry !== expectedTotalPriceCents) {
            return {
                type: 'PASSENGER_SALES_REPORT',
                isValid: false,
                reason: `Passenger entry ${i + 1} totalPrice (${centsToMoney(totalPriceCentsEntry)}) does not match expected (${centsToMoney(expectedTotalPriceCents)})`
            };
        }

        if (taxCentsEntry !== expectedTaxCents) {
            return {
                type: 'PASSENGER_SALES_REPORT',
                isValid: false,
                reason: `Passenger entry ${i + 1} tax (${centsToMoney(taxCentsEntry)}) does not match expected (${centsToMoney(expectedTaxCents)})`
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

    const baggageEntries = salesReport.filter(
        entry => entry.action === 'ELECTRONIC_MISCELLANEOUS_DOCUMENT_ASSOCIATED'
    );

    const isValid = baggageEntries.length === baggageCount;

    return {
        type: 'BAGGAGE_SALES_REPORT',
        isValid,
        reason: isValid ? null : `Expected ${baggageCount} EMD tickets in sales report for baggage, found ${baggageEntries.length}`
    };
}

function validateCurrencyConsistency(flightData) {
    const { fare, tax, totalMerchant, payments } = flightData;

    const currencies = new Set();

    const fareCurrency = extractCurrency(fare);
    const taxCurrency = extractCurrency(tax);
    const totalMerchantCurrency = extractCurrency(totalMerchant);

    if (fareCurrency) currencies.add(fareCurrency);
    if (taxCurrency) currencies.add(taxCurrency);
    if (totalMerchantCurrency) currencies.add(totalMerchantCurrency);

    if (payments && Array.isArray(payments)) {
        payments.forEach(payment => {
            const paymentCurrency = extractCurrency(payment.price);
            if (paymentCurrency) currencies.add(paymentCurrency);
        });
    }

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
    const match = amountString.match(/([A-Z]{3}|[$€£¥])/);
    return match ? match[1] : null;
}

function moneyToCents(amount) {
    if (amount == null) return 0;

    if (typeof amount === 'number') {
        return Math.round(amount * 100);
    }

    if (typeof amount === 'string') {
        const clean = amount.trim().replace(/[^\d.-]/g, '');
        const sign = clean.startsWith('-') ? -1 : 1;
        const [whole, decimal = ''] = clean.replace('-', '').split('.');
        return sign * (Number(whole) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2)));
    }

}

function centsToMoney(cents) {
    return (cents / 100).toFixed(2);
}
