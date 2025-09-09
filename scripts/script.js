// --- ⬇️ IMPORTANT: ADD YOUR API KEY HERE ⬇️ ---
const GEMINI_API_KEY = "AIzaSyDOTksI9KbJy8YRqDbY6PBKtyxUIBayH2s"; // Get from Google AI Studio.

// --- DOM Element References ---
const searchInput = document.getElementById('company-search-input');
const analyzeButton = document.getElementById('analyze-button');
const initialStateSection = document.getElementById('initial-state');
const loadingSection = document.getElementById('loading-section');
const loadingMessage = document.getElementById('loading-message');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const resultsWrapper = document.getElementById('results-wrapper');
const companyNameDisplay = document.getElementById('company-name-display');
const companySourceDisplay = document.getElementById('company-source-display');
const financialTableBody = document.getElementById('financial-table-body');
const keyRatiosContainer = document.getElementById('key-ratios');
const performanceList = document.getElementById('performance-analysis-list');
const newsList = document.getElementById('news-headlines-list');
const forecastRecommendation = document.getElementById('forecast-recommendation');
const forecastPreSentimentTarget = document.getElementById('forecast-pre-sentiment-target');
const forecastPostSentimentTarget = document.getElementById('forecast-post-sentiment-target');
const forecastTimeline = document.getElementById('forecast-timeline');
const forecastExpectedReturn = document.getElementById('forecast-expected-return');
const forecastReasoning = document.getElementById('forecast-reasoning');
const chartCanvas = document.getElementById('stockPriceChart');
let stockChartInstance = null;

// --- Dummy Data for Initial Load ---
const dummyCompanyData = {
    companyName: "Bharat Innovations Tech",
    dataSource: "Displaying pre-loaded dummy data.",
    financials: [
        { year: 2015, revenue: "5,000", netProfit: "500", eps: null },
        { year: 2016, revenue: "6,500", netProfit: "700", eps: null },
        { year: 2017, revenue: "8,000", netProfit: "950", eps: null },
        { year: 2018, revenue: "10,000", netProfit: "1,100", eps: null },
        { year: 2019, revenue: "12,000", netProfit: "1,400", eps: null },
        { year: 2020, revenue: "13,000", netProfit: "1,200", eps: 18.0 },
        { year: 2021, revenue: "16,000", netProfit: "2,200", eps: 33.0 },
        { year: 2022, revenue: "20,000", netProfit: "3,000", eps: 45.0 },
        { year: 2023, revenue: "25,000", netProfit: "4,000", eps: 60.0 },
        { year: 2024, revenue: "28,000", netProfit: "4,500", eps: 67.5 },
    ],
    ratios: { 
        peRatio: "35.2", 
        debtToEquity: "0.4",
        roe: "20.5%",
        pbRatio: "7.1"
    },
    chartData: {
        labels: ["2015-01-01", "2016-01-01", "2017-01-01", "2018-01-01", "2019-01-01", "2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01", "2024-01-01", new Date().toISOString().split('T')[0]],
        prices: [200, 350, 500, 800, 1000, 900, 1300, 1800, 2400, 3000, 3200]
    },
    performance: { 
        preCovidReturn: 25.0,
        duringCovidReturn: 44.4,
        postCovidReturn: 146.1,
        last1YearReturn: 33.3, 
        last3YearReturn: 77.8,
        last5YearReturn: 255.6
    },
    news: [
        { headline: "Bharat Innovations signs major deal with European conglomerate for AI solutions.", sentiment: "positive" },
        { headline: "Q4 profits jump 20% YoY, beating analyst expectations.", sentiment: "positive" },
        { headline: "Increased competition from new market entrants puts pressure on margins.", sentiment: "negative" },
        { headline: "Company announces new R&D center focused on sustainable technology.", sentiment: "neutral" }
    ],
    forecast: {
        recommendation: "BUY", 
        preSentimentTarget: "₹3,800",
        postSentimentTarget: "₹3,950", 
        timeline: "9-12 months",
        expectedReturn: "23.4%",
        reasoning: "Bharat Innovations Tech demonstrates robust revenue growth and improving profit margins. Strategic partnerships and expansion into high-demand sectors like AI and green tech provide a strong future outlook. Positive market sentiment following recent deal announcements suggests further upside potential."
    }
};

// --- Utility Functions ---
function getRecommendationColor(recommendation) {
    if (!recommendation) return "text-gray-500";
    switch (recommendation.toUpperCase()) {
        case "BUY": return "text-green-600";
        case "SELL": return "text-red-600";
        case "HOLD": default: return "text-yellow-500";
    }
}

// --- Main Data Aggregation and Analysis Flow ---
async function getAiPoweredData(companyName) {
    loadingMessage.textContent = `Gathering and analyzing data for ${companyName}... This may take a moment.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemInstruction = "You are an expert financial data API. Your task is to use Google Search to find real-time, accurate financial data for a given Indian company. You must provide a complete analysis and return all data strictly in the specified JSON format.";

    const userPrompt = `Please perform a complete financial analysis for the Indian company: "${companyName}".

Use your search capabilities to find the most recent and relevant data available.

Return your complete findings in the following strict JSON format. Do not include any text, notes, or markdown formatting before or after the JSON object.

**JSON FORMAT INSTRUCTIONS:**
- "companyName": The official full name of the company.
- "dataSource": Set this to "Data sourced via Google Search."
- "ticker": The correct NSE ticker symbol (e.g., "RELIANCE.NS").
- "financials": An array of financial data since 2015.
  - "year": The calendar year for the data.
  - "revenue": A string representing total revenue in crores (e.g., "1,50,000").
  - "netProfit": A string representing net profit in crores (e.g., "25,000").
  - "eps": The trailing twelve months (TTM) Earnings Per Share as a number. Only provide this for the most recent year.
- "ratios": The most recent key ratios.
  - "peRatio": The TTM P/E ratio as a string.
  - "debtToEquity": The most recent Debt to Equity ratio as a string.
  - "roe": The Return on Equity as a string (e.g., "15.5%").
  - "pbRatio": The Price to Book ratio as a string.
- "chartData":
  - "labels": An array of date strings in "YYYY-MM-DD" format, representing today and the start of each year since 2015.
  - "prices": An array of numbers representing the approximate closing stock price on those corresponding dates.
- "performance":
  - "preCovidReturn": Stock return from Jan 2018 to Dec 2019, as a number.
  - "duringCovidReturn": Stock return from Jan 2020 to Dec 2021, as a number.
  - "postCovidReturn": Stock return from Jan 2022 to present, as a number.
  - "last1YearReturn": The percentage stock return over the last 1 year, as a number.
  - "last3YearReturn": The percentage stock return over the last 3 years, as a number.
  - "last5YearReturn": The percentage stock return over the last 5 years, as a number.
- "news": An array of 3-4 recent, relevant news headlines.
  - "headline": The news headline string.
  - "sentiment": The sentiment of the headline ("positive", "negative", or "neutral").
- "forecast": Your AI-powered analysis.
  - "recommendation": Your final recommendation ("BUY", "HOLD", or "SELL").
  - "preSentimentTarget": Your calculated target price based ONLY on financial data, as a string (e.g., "₹X,XXX.XX").
  - "postSentimentTarget": Your FINAL target price after factoring in news sentiment, as a string (e.g., "₹X,XXX.XX").
  - "timeline": The estimated timeline as a string (e.g., "X-Y months").
  - "expectedReturn": The potential return based on the FINAL target price, as a string (e.g., "XX.X%").
  - "reasoning": A concise paragraph (max 150 words) justifying your recommendation. Explain how news sentiment may have adjusted the final target from the pre-sentiment target.`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error?.message || "The request to the AI model failed.");
        }
        const responseData = await response.json();
        let jsonText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) {
            throw new Error("Received an empty response from the AI model.");
        }
        
        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        }

        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`Failed to get AI analysis: ${error.message}`);
    }
}

// --- UI Rendering Functions ---
function showResults(companyName) {
  initialState.classList.add("hidden");
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  // Enable scrolling when results are shown
  document.body.classList.remove("no-scroll");

  // Update title
  resultsTitle.textContent = `${companyName} – Financial Insights`;
}
function displayCompanyData(data) {
    companyNameDisplay.textContent = data.companyName;
    companySourceDisplay.textContent = data.dataSource;

    financialTableBody.innerHTML = '';
    (data.financials || []).forEach(row => {
        financialTableBody.innerHTML += `
            <tr class="text-sm">
                <td class="px-4 py-2 font-medium text-gray-900">${row.year}</td>
                <td class="px-4 py-2 text-gray-600">${row.revenue}</td>
                <td class="px-4 py-2 text-gray-600">${row.netProfit}</td>
                <td class="px-4 py-2 text-gray-600">${row.eps || 'N/A'}</td>
            </tr>`;
    });

    const ratios = data.ratios || {};
    keyRatiosContainer.innerHTML = `
        <div class="bg-gray-100 p-2 rounded-md"><strong>P/E:</strong> ${ratios.peRatio || 'N/A'}</div>
        <div class="bg-gray-100 p-2 rounded-md"><strong>D/E:</strong> ${ratios.debtToEquity || 'N/A'}</div>
        <div class="bg-gray-100 p-2 rounded-md"><strong>ROE:</strong> ${ratios.roe || 'N/A'}</div>
        <div class="bg-gray-100 p-2 rounded-md"><strong>P/B:</strong> ${ratios.pbRatio || 'N/A'}</div>`;
    
    performanceList.innerHTML = '';
    const performance = data.performance || {};
    const perfItems = [
        { period: 'Pre-COVID (2018-2019)', value: performance.preCovidReturn },
        { period: 'During-COVID (2020-2021)', value: performance.duringCovidReturn },
        { period: 'Post-COVID (2022-Present)', value: performance.postCovidReturn },
        { period: 'Last 1-Year Return', value: performance.last1YearReturn },
        { period: 'Last 3-Years Return', value: performance.last3YearReturn },
        { period: 'Last 5-Years Return', value: performance.last5YearReturn }
    ];
    perfItems.forEach(item => {
        if (item.value !== null && !isNaN(item.value)) {
            const colorClass = item.value >= 0 ? 'text-green-600' : 'text-red-600';
            const sign = item.value >= 0 ? '+' : '';
            performanceList.innerHTML += `<li class="flex justify-between items-center text-sm">
                <span class="text-gray-600">${item.period}</span>
                <span class="font-bold ${colorClass}">${sign}${item.value.toFixed(1)}%</span></li>`;
        }
    });

    newsList.innerHTML = '';
    (data.news || []).forEach(item => {
         let sentimentIndicator = '';
        switch (item.sentiment) {
            case 'positive':
                sentimentIndicator = '<span class="text-green-500 mr-2">▲</span>';
                break;
            case 'negative':
                sentimentIndicator = '<span class="text-red-500 mr-2">▼</span>';
                break;
            default:
                sentimentIndicator = '<span class="text-gray-400 mr-2">●</span>';
                break;
        }
        newsList.innerHTML += `<li class="text-sm text-gray-700 border-b border-gray-100 pb-2 flex items-start">${sentimentIndicator}<span>${item.headline}</span></li>`;
    });

    const forecast = data.forecast || {};
    forecastRecommendation.textContent = forecast.recommendation || 'N/A';
    forecastRecommendation.className = `text-4xl font-extrabold ${getRecommendationColor(forecast.recommendation)}`;
    forecastPreSentimentTarget.textContent = forecast.preSentimentTarget || 'N/A';
    forecastPostSentimentTarget.textContent = forecast.postSentimentTarget || 'N/A';
    forecastTimeline.textContent = forecast.timeline || 'N/A';
    forecastExpectedReturn.textContent = forecast.expectedReturn || 'N/A';
    forecastReasoning.textContent = forecast.reasoning || 'No forecast available.';
    
    renderStockChart(data.chartData || { labels: [], prices: [] });
}

function renderStockChart(chartData) {
    if (stockChartInstance) stockChartInstance.destroy();

    stockChartInstance = new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Stock Price (₹)', data: chartData.prices,
                borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2, pointRadius: 2, tension: 0.1, fill: true,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'year' } },
                y: { ticks: { callback: value => '₹' + value.toLocaleString() } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function setUIState(state, message = "") {
    initialStateSection.classList.toggle('hidden', state !== 'initial');
    loadingSection.classList.toggle('hidden', state !== 'loading');
    errorSection.classList.toggle('hidden', state !== 'error');
    resultsWrapper.classList.toggle('hidden', state !== 'results');
    
    analyzeButton.disabled = (state === 'loading');
    
    if (state === 'error') errorMessage.textContent = message;
    if (state === 'loading') loadingMessage.textContent = message;
}

// --- Event Handlers ---

async function handleAnalysisRequest() {
    const companyName = searchInput.value.trim();
    if (!companyName) {
        setUIState('error', "Please enter a company name.");
        return;
    }

    setUIState('loading', 'Starting analysis...');

    try {
        let companyData;
        const lowerCaseCompanyName = companyName.toLowerCase();
        if (lowerCaseCompanyName === 'dummy' || lowerCaseCompanyName === 'bharat innovations tech') {
            companyData = dummyCompanyData;
        } else {
            if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing. Cannot generate forecast.");
            companyData = await getAiPoweredData(companyName);
        }
        
        displayCompanyData(companyData);
        setUIState('results');

    } catch (error) {
        console.error("Analysis failed:", error);
        setUIState('error', error.message);
    }
}

// --- Initial Load and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    setUIState('initial');
});

analyzeButton.addEventListener('click', handleAnalysisRequest);
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') handleAnalysisRequest();
});


