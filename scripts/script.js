// --- CONFIGURATION: PASTE YOUR 4 API KEYS HERE ---
const EODHD_API_KEY = "YOUR_EODHD_API_KEY_HERE";
const FMP_API_KEY = "YOUR_FMP_API_KEY_HERE";
const NEWS_API_KEY = "YOUR_NEWS_API_KEY_HERE";
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
// --- END OF CONFIGURATION ---

// DOM Element Selectors
const tickerInput = document.getElementById('tickerInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loader = document.getElementById('loader');
const errorContainer = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const resultsContainer = document.getElementById('resultsContainer');

// Result display elements
const companyLogo = document.getElementById('companyLogo');
const companyName = document.getElementById('companyName');
const companyTicker = document.getElementById('companyTicker');
const avgReturn = document.getElementById('avgReturn');
const preCovidReturn = document.getElementById('preCovidReturn');
const duringCovidReturn = document.getElementById('duringCovidReturn');
const postCovidReturn = document.getElementById('postCovidReturn');
const recommendation = document.getElementById('recommendation');
const priceTarget = document.getElementById('priceTarget');
const expectedReturn = document.getElementById('expectedReturn');
const holdingPeriod = document.getElementById('holdingPeriod');
const rationale = document.getElementById('rationale');
const futureProjection = document.getElementById('futureProjection');
const newsSentiment = document.getElementById('newsSentiment');
const newsList = document.getElementById('newsList');

// --- Event Listeners ---
analyzeBtn.addEventListener('click', handleAnalysis);
tickerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleAnalysis();
    }
});

// --- Main Handler ---
async function handleAnalysis() {
    const ticker = tickerInput.value.trim().toUpperCase();
    if (!ticker) {
        showError("Please enter a stock ticker.");
        return;
    }
    if (EODHD_API_KEY.includes("YOUR") || FMP_API_KEY.includes("YOUR") || NEWS_API_KEY.includes("YOUR") || GEMINI_API_KEY.includes("YOUR")) {
        showError("One or more API keys are missing. Please add your API keys at the top of the script.js file.");
        return;
    }

    // Reset UI
    resultsContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const [financialData, newsData, profileData] = await Promise.all([
            fetchFinancialData(ticker),
            fetchNewsData(ticker),
            fetchCompanyProfile(ticker)
        ]);

        const processedHistoricalData = processHistoricalData(financialData.timeSeries);
        const prompt = createGeminiPrompt(processedHistoricalData, newsData.articles, profileData.Name);
        const aiResponse = await getAIEvaluation(prompt);

        displayResults(profileData, processedHistoricalData, newsData, aiResponse);

    } catch (err) {
        console.error(err);
        showError(err.message || "An unknown error occurred.");
    } finally {
        loader.classList.add('hidden');
    }
}

// --- API Fetching Functions ---

async function fetchFinancialData(ticker) {
    const targetUrl = `https://eodhistoricaldata.com/api/eod/${ticker}?api_token=${EODHD_API_KEY}&fmt=json&period=d`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Failed to fetch financial data. The proxy or API might be down.");

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`The financial data API returned an error: "${responseText}"`);
    }

    if (!data || data.length === 0) {
        throw new Error("No time series data found for this ticker.");
    }

    const timeSeries = {};
    for (const day of data) {
        timeSeries[day.date] = { '5. adjusted close': day.adjusted_close };
    }
    return { timeSeries };
}

async function fetchCompanyProfile(ticker) {
    const url = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch company profile from FMP.");

    const data = await response.json();
    if (!data || data.length === 0) {
        throw new Error(`Profile for ticker "${ticker}" not found. Please check the symbol.`);
    }
    const profile = data[0];
    return { Name: profile.companyName, Symbol: profile.symbol, logoUrl: profile.image };
}

async function fetchNewsData(ticker) {
    const searchTicker = ticker.split('.')[0];
    const url = `https://newsapi.org/v2/everything?q=${searchTicker}&pageSize=15&sortBy=relevancy&language=en&apiKey=${NEWS_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch news data from NewsAPI.");
    const data = await response.json();
    if (data.status === "error") throw new Error(`NewsAPI error: ${data.message}`);
    return { articles: data.articles };
}

// --- Data Processing Function ---

function processHistoricalData(timeSeries) {
    const dates = Object.keys(timeSeries).sort();
    const today = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);

    const relevantDates = dates.filter(date => new Date(date) >= fiveYearsAgo);
    if (relevantDates.length < 2) throw new Error("Not enough historical data to perform analysis.");

    const startPrice = parseFloat(timeSeries[relevantDates[0]]['5. adjusted close']);
    const endPrice = parseFloat(timeSeries[relevantDates[relevantDates.length - 1]]['5. adjusted close']);
    const years = (new Date(relevantDates[relevantDates.length - 1]) - new Date(relevantDates[0])) / (1000 * 60 * 60 * 24 * 365.25);
    const cagr = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;

    const calculateReturnForPeriod = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const periodStartDay = relevantDates.find(d => new Date(d) >= startDate);
        let periodEndDay = [...relevantDates].reverse().find(d => new Date(d) <= endDate);
        if (!periodEndDay) periodEndDay = relevantDates[relevantDates.length - 1];

        if (!periodStartDay || !periodEndDay) return 0;
        const periodStartPrice = parseFloat(timeSeries[periodStartDay]['5. adjusted close']);
        const periodEndPrice = parseFloat(timeSeries[periodEndDay]['5. adjusted close']);
        return ((periodEndPrice / periodStartPrice) - 1) * 100;
    };

    return {
        avgReturn: cagr,
        preCovidReturn: calculateReturnForPeriod('2019-01-01', '2020-02-29'),
        duringCovidReturn: calculateReturnForPeriod('2020-03-01', '2021-12-31'),
        postCovidReturn: calculateReturnForPeriod('2022-01-01', today.toISOString().split('T')[0])
    };
}

// --- AI & Prompting Functions ---

function createGeminiPrompt(historicalData, newsArticles, companyName) {
    const newsHeadlines = newsArticles.slice(0, 10).map(article => article.title).join('\n');
    return `
        Analyze the following financial data for the company "${companyName}".
        Historical Performance:
        - 5-Year Average Annual Return: ${historicalData.avgReturn.toFixed(2)}%
        - Pre-COVID Return (Jan 2019 - Feb 2020): ${historicalData.preCovidReturn.toFixed(2)}%
        - During COVID Return (Mar 2020 - Dec 2021): ${historicalData.duringCovidReturn.toFixed(2)}%
        - Post-COVID Return (Jan 2022 - Present): ${historicalData.postCovidReturn.toFixed(2)}%
        Recent News Headlines:
        ${newsHeadlines}
    `;
}

async function getAIEvaluation(promptContent) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const systemInstruction = {
        role: "system",
        parts: [{
            text: `You are a financial analyst assistant. Your task is to analyze provided stock data and news to generate an investment recommendation. Provide your output only in a valid JSON format. Do not add explanations outside the JSON. The JSON object must contain these exact keys: newsSentiment ("Positive", "Neutral", "Negative"), futureProjection (one paragraph), recommendation ("Buy", "Hold", "Sell"), priceTarget (a number, representing local currency), holdingPeriod (e.g., "6-12 months"), expectedReturn (e.g., "15-20%"), rationale (2-3 sentences).`
        }]
    };
    const requestBody = {
        contents: [{ role: "user", parts: [{ text: promptContent }] }],
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: "application/json" }
    };
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
}

// --- UI Update Functions ---

function displayResults(profile, historical, news, ai) {
    companyLogo.src = profile.logoUrl;
    companyLogo.onerror = () => { companyLogo.src = 'https://via.placeholder.com/64?text=N/A'; };
    companyName.textContent = profile.Name;
    companyTicker.textContent = profile.Symbol;

    const formatPercent = (val) => `<span class="${val > 0 ? 'text-green-600' : 'text-red-600'}">${val.toFixed(2)}%</span>`;
    avgReturn.innerHTML = formatPercent(historical.avgReturn);
    preCovidReturn.innerHTML = formatPercent(historical.preCovidReturn);
    duringCovidReturn.innerHTML = formatPercent(historical.duringCovidReturn);
    postCovidReturn.innerHTML = formatPercent(historical.postCovidReturn);

    recommendation.textContent = ai.recommendation;
    priceTarget.textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(ai.priceTarget);
    if (profile.Symbol.endsWith(".US")) {
        priceTarget.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ai.priceTarget);
    }
    expectedReturn.textContent = ai.expectedReturn;
    holdingPeriod.textContent = ai.holdingPeriod;
    rationale.textContent = ai.rationale;
    futureProjection.textContent = ai.futureProjection;
    setSentimentColors('recommendation', ai.recommendation);

    newsSentiment.textContent = ai.newsSentiment;
    setSentimentColors('newsSentiment', ai.newsSentiment);

    newsList.innerHTML = '';
    news.articles.slice(0, 7).forEach(article => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${article.url}" target="_blank" class="hover:text-blue-600 transition-colors">${article.title}</a>`;
        newsList.appendChild(li);
    });
    resultsContainer.classList.remove('hidden');
}

function setSentimentColors(elementId, sentiment) {
    const el = document.getElementById(elementId);
    let classes = 'bg-gray-100 text-gray-800';
    switch (sentiment.toUpperCase()) {
        case 'BUY':
        case 'POSITIVE':
            classes = 'bg-green-100 text-green-800';
            break;
        case 'HOLD':
        case 'NEUTRAL':
            classes = 'bg-yellow-100 text-yellow-800';
            break;
        case 'SELL':
        case 'NEGATIVE':
            classes = 'bg-red-100 text-red-800';
            break;
    }
    el.className = el.className.replace(/\b(bg|text)-(red|green|yellow|gray)-[1-9]00\b/g, '').trim();
    el.classList.add(...classes.split(' '));
}

function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
}