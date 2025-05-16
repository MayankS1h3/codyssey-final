// --- Globals ---
let solvedChart, totalChart, progressChart, comparisonChart;
const API_BASE_URL = "http://localhost:3000/api"; // ADJUST THIS TO YOUR BACKEND URL
let authToken = null;

// --- DOM Elements (Auth) ---
const authButtonsContainer = document.getElementById("authButtonsContainer");
const showLoginBtn = document.getElementById("showLoginBtn");
const showSignupBtn = document.getElementById("showSignupBtn");
const loginFormDiv = document.getElementById("loginForm");
const signupFormDiv = document.getElementById("signupForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const signupLeetcodeUsernameInput = document.getElementById(
  "signupLeetcodeUsername"
);
const signupCodeforcesHandleInput = document.getElementById(
  "signupCodeforcesHandle"
);
const signupBtn = document.getElementById("signupBtn");
const signupMessage = document.getElementById("signupMessage");

const userProfileSection = document.getElementById("userProfileSection");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const leetcodeUsernameProfileInput = document.getElementById(
  "leetcodeUsernameProfile"
);
const codeforcesHandleProfileInput = document.getElementById(
  "codeforcesHandleProfile"
);
const saveHandlesBtn = document.getElementById("saveHandlesBtn");
const logoutBtn = document.getElementById("logoutBtn");

const dashboardContentDiv = document.getElementById("dashboardContent");

// --- DOM Elements (Dashboard - mostly existing) ---
const fetchStatsButton = document.getElementById("fetchStats");
const statsContainer = document.getElementById("statsContainer");
const loadingIndicator = document.getElementById("loadingIndicator");
const messageArea = document.getElementById("messageArea"); // For general messages

// --- Event Listeners (Auth) ---
showLoginBtn.addEventListener("click", () => toggleForms("login"));
showSignupBtn.addEventListener("click", () => toggleForms("signup"));
loginBtn.addEventListener("click", handleLogin);
signupBtn.addEventListener("click", handleSignup);
logoutBtn.addEventListener("click", handleLogout);
saveHandlesBtn.addEventListener("click", handleSaveHandles);
fetchStatsButton.addEventListener("click", fetchAllStatsForUser);

function toggleForms(formToShow) {
  loginFormDiv.style.display = formToShow === "login" ? "block" : "none";
  signupFormDiv.style.display = formToShow === "signup" ? "block" : "none";
  authButtonsContainer.style.display = "none"; // Hide initial buttons once a form is shown
  loginMessage.textContent = "";
  signupMessage.textContent = "";
}

function showAuthButtons() {
  authButtonsContainer.style.display = "block";
  loginFormDiv.style.display = "none";
  signupFormDiv.style.display = "none";
  userProfileSection.style.display = "none";
  dashboardContentDiv.style.display = "none";
}

// --- Auth State & UI Management ---
function updateUIAfterLogin(userData) {
  authToken = userData.token;
  localStorage.setItem("authToken", userData.token);
  localStorage.setItem("userEmail", userData.email);
  localStorage.setItem("leetcodeUsername", userData.leetcodeUsername || "");
  localStorage.setItem("codeforcesHandle", userData.codeforcesHandle || "");

  userEmailDisplay.textContent = userData.email;
  leetcodeUsernameProfileInput.value = userData.leetcodeUsername || "";
  codeforcesHandleProfileInput.value = userData.codeforcesHandle || "";

  authButtonsContainer.style.display = "none";
  loginFormDiv.style.display = "none";
  signupFormDiv.style.display = "none";
  userProfileSection.style.display = "block";
  dashboardContentDiv.style.display = "block";
  messageArea.textContent = ""; // Clear general messages

  // Automatically fetch stats if handles are present
  if (userData.leetcodeUsername || userData.codeforcesHandle) {
    fetchAllStatsForUser();
  } else {
    // Clear previous stats if any, and prompt to add handles
    statsContainer.classList.add("hidden");
    statsContainer.style.opacity = "0";
    showMessage(
      "Set your LeetCode/Codeforces handles and click 'Fetch My Stats'.",
      "info"
    );
  }
}

function updateUIAfterLogout() {
  authToken = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("leetcodeUsername");
  localStorage.removeItem("codeforcesHandle");

  showAuthButtons(); // Show login/signup buttons, hide profile and dashboard
  loginEmailInput.value = "";
  loginPasswordInput.value = ""; // Clear forms
  signupEmailInput.value = "";
  signupPasswordInput.value = "";
  signupLeetcodeUsernameInput.value = "";
  signupCodeforcesHandleInput.value = "";
  messageArea.textContent = "";
  statsContainer.classList.add("hidden"); // Ensure stats are hidden
}

async function checkAuthState() {
  authToken = localStorage.getItem("authToken");
  const email = localStorage.getItem("userEmail");
  if (authToken && email) {
    // Optionally: Add a request to backend to verify token is still valid
    // For now, we'll assume it is.
    const lcUN = localStorage.getItem("leetcodeUsername");
    const cfHN = localStorage.getItem("codeforcesHandle");
    updateUIAfterLogin({
      token: authToken,
      email,
      leetcodeUsername: lcUN,
      codeforcesHandle: cfHN,
    });
  } else {
    updateUIAfterLogout();
  }
}

// --- API Call Functions ---
async function apiRequest(
  endpoint,
  method = "GET",
  body = null,
  requireAuth = false
) {
  const headers = { "Content-Type": "application/json" };
  if (requireAuth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      // Give precedence to server's message, otherwise use statusText
      throw new Error(
        data.message || response.statusText || `HTTP error ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error; // Re-throw to be caught by calling function
  }
}

async function handleSignup() {
  const userData = {
    email: signupEmailInput.value,
    password: signupPasswordInput.value,
    leetcodeUsername: signupLeetcodeUsernameInput.value || undefined, // Send undefined if empty
    codeforcesHandle: signupCodeforcesHandleInput.value || undefined,
  };

  if (!userData.email || !userData.password) {
    signupMessage.textContent = "Email and Password are required.";
    return;
  }
  signupMessage.textContent = "Signing up...";

  try {
    const data = await apiRequest("/auth/signup", "POST", userData);
    signupMessage.textContent = data.message + " Please login.";
    toggleForms("login"); // Switch to login form
  } catch (error) {
    signupMessage.textContent =
      error.message || "Signup failed. Please try again.";
  }
}

async function handleLogin() {
  const credentials = {
    email: loginEmailInput.value,
    password: loginPasswordInput.value,
  };
  if (!credentials.email || !credentials.password) {
    loginMessage.textContent = "Email and Password are required.";
    return;
  }
  loginMessage.textContent = "Logging in...";

  try {
    const data = await apiRequest("/auth/login", "POST", credentials);
    updateUIAfterLogin(data); // data should include token, email, and handles
    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.textContent =
      error.message || "Login failed. Check credentials or try again.";
  }
}

async function handleLogout() {
  // Optional: Call a backend /auth/logout endpoint if it does anything (e.g., token blocklisting)
  // await apiRequest('/auth/logout', 'POST', null, true);
  updateUIAfterLogout();
  showMessage("You have been logged out.", "info");
}

async function handleSaveHandles() {
  const handles = {
    leetcodeUsername: leetcodeUsernameProfileInput.value.trim(),
    codeforcesHandle: codeforcesHandleProfileInput.value.trim(),
  };
  showMessage("Saving handles...", "info");
  try {
    const data = await apiRequest("/user/handles", "POST", handles, true);
    localStorage.setItem("leetcodeUsername", data.leetcodeUsername || ""); // Update local storage
    localStorage.setItem("codeforcesHandle", data.codeforcesHandle || "");
    showMessage(data.message || "Handles saved successfully!", "success");
  } catch (error) {
    showMessage(error.message || "Failed to save handles.", "error");
  }
}

// --- Modified Stats Fetching Logic ---
async function fetchAllStatsForUser() {
  if (!authToken) {
    showMessage("Please login to fetch stats.", "warning");
    toggleForms("login"); // Show login form if not logged in
    return;
  }

  const lcUsername = localStorage.getItem("leetcodeUsername");
  const cfHandle = localStorage.getItem("codeforcesHandle");

  if (!lcUsername && !cfHandle) {
    showMessage(
      "Please save your LeetCode/Codeforces handles in your profile first.",
      "warning"
    );
    return;
  }

  loadingIndicator.classList.remove("hidden");
  statsContainer.classList.add("hidden");
  statsContainer.style.opacity = "0";
  showMessage("Fetching data for your profiles...", "info");

  const promises = [];
  if (lcUsername) promises.push(fetchLeetCodeData(lcUsername));
  else
    promises.push(
      Promise.resolve({
        status: "skipped",
        data: null,
        message: "LeetCode username not set.",
      })
    );

  if (cfHandle) promises.push(fetchCodeforcesData(cfHandle));
  else
    promises.push(
      Promise.resolve({
        status: "skipped",
        data: null,
        message: "Codeforces handle not set.",
      })
    );

  const results = await Promise.allSettled(promises);

  loadingIndicator.classList.add("hidden");

  const lcResult =
    results[0].status === "fulfilled"
      ? results[0].value
      : {
          status: "error",
          data: null,
          message: "LeetCode: Fetch promise rejected.",
        };
  const cfResult =
    results[1].status === "fulfilled"
      ? results[1].value
      : {
          status: "error",
          data: null,
          message: "Codeforces: Fetch promise rejected.",
        };

  let errors = [];
  if (lcResult.status === "error" && lcUsername) errors.push(lcResult.message);
  if (cfResult.status === "error" && cfHandle) errors.push(cfResult.message);

  if (errors.length > 0) {
    showMessage(errors.join(" \n"), "error");
  } else if (lcResult.status !== "error" || cfResult.status !== "error") {
    if ((lcResult.data && lcUsername) || (cfResult.data && cfHandle)) {
      showMessage("Data fetched successfully!", "success");
    } else if (!lcUsername && !cfHandle) {
      // Should be caught earlier
    } else {
      showMessage(
        "No new data to display or one/both handles not found on platforms.",
        "info"
      );
    }
  }

  if ((lcResult.data && lcUsername) || (cfResult.data && cfHandle)) {
    updateUIDashboard(lcResult.data, cfResult.data);
  } else {
    statsContainer.classList.add("hidden"); // Keep it hidden if no data
    if (!errors.length) {
      // If no specific errors but no data
      showMessage(
        "No data found for the provided handles. Please check them in your profile.",
        "warning"
      );
    }
  }
}

// --- Original Data Fetching & Charting Functions ---
// (fetchLeetCodeData, fetchCodeforcesData, updateUIDashboard (was updateUI),
//  updateUserStatsDisplay, createSolvedChart, createTotalChart,
//  createProgressChart, createComparisonChart)
//  These functions remain largely the same as your last version,
//  just ensure they are called correctly by fetchAllStatsForUser
//  and updateUIDashboard.

// Helper to show messages (already have this, ensure it's robust)
function showMessage(message, type = "info") {
  messageArea.textContent = message;
  messageArea.className = `text-center mb-4 p-2 rounded-md ${
    type === "error"
      ? "text-red-700 bg-red-100 border border-red-300"
      : type === "warning"
      ? "text-yellow-700 bg-yellow-100 border border-yellow-300"
      : type === "success"
      ? "text-green-700 bg-green-100 border border-green-300"
      : "text-blue-700 bg-blue-100 border border-blue-300" // info
  }`;
}

// --- LeetCode & Codeforces Data Fetchers (Keep your existing implementations) ---
async function fetchLeetCodeData(username) {
  /* ... your existing code ... */
  if (!username)
    return {
      status: "skipped",
      data: null,
      message: "LeetCode username not provided.",
    };
  try {
    const URL = `https://leetcode-stats-api.herokuapp.com/${username.trim()}`;
    const response = await fetch(URL);
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP error ${response.status}` }));
      return {
        status: "error",
        data: null,
        message: `LeetCode: ${errorData.message || response.statusText}`,
      };
    }
    const data = await response.json();
    if (data.status === "Failed Request" || data.ranking === undefined) {
      return {
        status: "error",
        data: null,
        message: `LeetCode: ${
          data.message || "User not found or error fetching stats."
        }`,
      };
    }
    return { status: "success", data, message: "LeetCode data fetched." };
  } catch (error) {
    console.error("LeetCode API Error:", error);
    return {
      status: "error",
      data: null,
      message: "LeetCode: Network error or API is down.",
    };
  }
}

async function fetchCodeforcesData(handle) {
  /* ... your existing code ... */
  if (!handle)
    return {
      status: "skipped",
      data: null,
      message: "Codeforces handle not provided.",
    };
  try {
    const userInfoResponse = await fetch(
      `https://codeforces.com/api/user.info?handles=${handle.trim()}`
    );
    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      return {
        status: "error",
        data: null,
        message: `Codeforces user.info: HTTP ${userInfoResponse.status}. ${errorText}`,
      };
    }
    const userInfoData = await userInfoResponse.json();
    if (userInfoData.status !== "OK") {
      return {
        status: "error",
        data: null,
        message: `Codeforces: ${
          userInfoData.comment || "Failed to fetch user info."
        }`,
      };
    }
    const cfUserInfo = userInfoData.result[0];

    const userStatusResponse = await fetch(
      `https://codeforces.com/api/user.status?handle=${handle.trim()}&from=1&count=10000`
    );
    if (!userStatusResponse.ok) {
      const errorText = await userStatusResponse.text();
      return {
        status: "error",
        data: null,
        message: `Codeforces user.status: HTTP ${userStatusResponse.status}. ${errorText}`,
      };
    }
    const userStatusData = await userStatusResponse.json();
    if (userStatusData.status !== "OK") {
      return {
        status: "error",
        data: null,
        message: `Codeforces: ${
          userStatusData.comment || "Failed to fetch user submissions."
        }`,
      };
    }

    const solvedProblems = new Set();
    let easySolved = 0,
      mediumSolved = 0,
      hardSolved = 0;

    userStatusData.result.forEach((sub) => {
      if (sub.verdict === "OK") {
        const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
        if (!solvedProblems.has(problemId)) {
          solvedProblems.add(problemId);
          const rating = sub.problem.rating;
          if (rating <= 1200) easySolved++;
          else if (rating >= 1201 && rating <= 1700) mediumSolved++;
          else if (rating >= 1701) hardSolved++;
        }
      }
    });

    return {
      status: "success",
      data: {
        rating: cfUserInfo.rating || 0,
        rank: cfUserInfo.rank || "N/A",
        maxRating: cfUserInfo.maxRating || 0,
        maxRank: cfUserInfo.maxRank || "N/A",
        contribution: cfUserInfo.contribution || 0,
        easySolved,
        mediumSolved,
        hardSolved,
        totalSolved: solvedProblems.size,
      },
      message: "Codeforces data fetched.",
    };
  } catch (error) {
    console.error("Codeforces API Error:", error);
    return {
      status: "error",
      data: null,
      message: "Codeforces: Network error or API processing failed.",
    };
  }
}

// --- Dashboard UI Update (was updateUI) & Chart Functions ---
// (Keep your existing implementations for:
//  updateUIDashboard, updateUserStatsDisplay, createSolvedChart, createTotalChart,
//  createProgressChart, createComparisonChart)
// Make sure they handle cases where lcData or cfData might be null/undefined if a user
// only has one handle set, or if one of the API calls fails.

function updateUIDashboard(lcData, cfData) {
  if (!lcData && !cfData) {
    // Only hide if BOTH are missing
    statsContainer.classList.add("hidden");
    if (localStorage.getItem("authToken")) {
      // if logged in but no data
      showMessage(
        "No data found for your saved handles. Please check them or try fetching again.",
        "warning"
      );
    }
    return;
  }
  statsContainer.classList.remove("hidden");
  setTimeout(() => {
    statsContainer.style.opacity = "1";
  }, 50);

  updateUserStatsDisplay(lcData, cfData);
  createSolvedChart(lcData, cfData);
  createTotalChart(lcData);
  createProgressChart(lcData);
  createComparisonChart(lcData, cfData);
}

function updateUserStatsDisplay(lcData, cfData) {
  /* ... your existing code ... */
  const userStatsContainer = document.getElementById("userStats");
  userStatsContainer.innerHTML = ""; // Clear previous stats

  const createStatElement = (label, value) => {
    const statElement = document.createElement("div");
    statElement.className =
      "flex flex-col items-center m-2 p-4 bg-gray-700 bg-opacity-50 rounded-lg shadow min-w-[120px]";
    statElement.innerHTML = `
            <span class="text-xl md:text-2xl font-bold text-white">${
              value !== undefined && value !== null ? value : "N/A"
            }</span>
            <span class="text-xs md:text-sm text-gray-300 text-center">${label}</span>
        `;
    userStatsContainer.appendChild(statElement);
  };
  let hasStats = false;
  if (lcData) {
    createStatElement("LC Ranking", lcData.ranking);
    createStatElement("LC Reputation", lcData.reputation);
    createStatElement("LC Contrib.", lcData.contributionPoints);
    createStatElement("LC Total Solved", lcData.totalSolved);
    hasStats = true;
  }
  if (cfData) {
    createStatElement("CF Rating", cfData.rating);
    createStatElement("CF Max Rating", cfData.maxRating);
    createStatElement("CF Rank", cfData.rank);
    createStatElement("CF Contrib.", cfData.contribution);
    createStatElement("CF Total Solved", cfData.totalSolved);
    hasStats = true;
  }
  if (!hasStats) {
    userStatsContainer.innerHTML =
      "<p class='text-center text-gray-400 p-4'>No stats to display for the provided handles.</p>";
  }
}
function createSolvedChart(lcData, cfData) {
  /* ... your existing code, ensure it handles null lcData/cfData ... */
  if (solvedChart) solvedChart.destroy();
  const chartEl = document.querySelector("#solvedChart");
  chartEl.innerHTML = "";

  const series = [];
  if (
    lcData &&
    (lcData.easySolved || lcData.mediumSolved || lcData.hardSolved)
  ) {
    series.push({
      name: "LeetCode",
      data: [
        lcData.easySolved || 0,
        lcData.mediumSolved || 0,
        lcData.hardSolved || 0,
      ],
    });
  }
  if (
    cfData &&
    (cfData.easySolved || cfData.mediumSolved || cfData.hardSolved)
  ) {
    series.push({
      name: "Codeforces",
      data: [
        cfData.easySolved || 0,
        cfData.mediumSolved || 0,
        cfData.hardSolved || 0,
      ],
    });
  }

  if (series.length === 0) {
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>No solved problem data available to display.</p>";
    return;
  }
  const options = {
    series: series,
    chart: { type: "bar", height: 350, foreColor: "#e2e8f0" },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "55%", endingShape: "rounded" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: ["Easy", "Medium", "Hard"],
      labels: { style: { colors: "#e2e8f0" } },
    },
    yaxis: {
      title: { text: "Problems Solved", style: { color: "#e2e8f0" } },
      labels: { style: { colors: "#e2e8f0" } },
    },
    fill: { opacity: 1 },
    legend: { position: "top", labels: { colors: "#e2e8f0" } },
    colors: ["#4ade80", "#fbbf24"],
    tooltip: { theme: "dark" },
  };
  solvedChart = new ApexCharts(chartEl, options);
  solvedChart.render();
}
function createTotalChart(lcData) {
  /* ... your existing code, ensure it handles null lcData ... */
  if (totalChart) totalChart.destroy();
  const chartEl = document.querySelector("#totalChart");
  chartEl.innerHTML = "";

  if (
    !lcData ||
    (!lcData.totalEasy && !lcData.totalMedium && !lcData.totalHard)
  ) {
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>LeetCode 'total available' data not found.</p>";
    return;
  }
  const options = {
    series: [
      lcData.totalEasy || 0,
      lcData.totalMedium || 0,
      lcData.totalHard || 0,
    ],
    chart: { type: "pie", height: 350, foreColor: "#e2e8f0" },
    labels: ["Easy", "Medium", "Hard"],
    colors: ["#60a5fa", "#818cf8", "#a78bfa"],
    dataLabels: {
      enabled: true,
      style: { colors: ["#1a202c"] },
      dropShadow: { enabled: false },
    },
    legend: { position: "top", labels: { colors: "#e2e8f0" } },
    tooltip: { theme: "dark", y: { formatter: (val) => val + " problems" } },
  };
  totalChart = new ApexCharts(chartEl, options);
  totalChart.render();
}
function createProgressChart(lcData) {
  /* ... your existing code, ensure it handles null lcData ... */
  if (progressChart) progressChart.destroy();
  const chartEl = document.querySelector("#progressChart");
  chartEl.innerHTML = "";

  if (
    !lcData ||
    (lcData.totalEasy === undefined &&
      lcData.totalMedium === undefined &&
      lcData.totalHard === undefined)
  ) {
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>LeetCode progress data not available.</p>";
    return;
  }
  const progressData = [
    lcData.totalEasy ? ((lcData.easySolved || 0) / lcData.totalEasy) * 100 : 0,
    lcData.totalMedium
      ? ((lcData.mediumSolved || 0) / lcData.totalMedium) * 100
      : 0,
    lcData.totalHard ? ((lcData.hardSolved || 0) / lcData.totalHard) * 100 : 0,
  ].map((p) => parseFloat(p.toFixed(1)));

  if (
    progressData.every((p) => p === 0) &&
    !lcData.easySolved &&
    !lcData.mediumSolved &&
    !lcData.hardSolved
  ) {
    // If all progress is 0 and no problems solved, it likely means totals are also 0 or missing
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>Not enough LeetCode data for progress radar.</p>";
    return;
  }

  const options = {
    series: [{ name: "LeetCode Progress", data: progressData }],
    chart: { height: 350, type: "radar", foreColor: "#e2e8f0" },
    xaxis: {
      categories: ["Easy", "Medium", "Hard"],
      labels: { style: { colors: ["#e2e8f0", "#e2e8f0", "#e2e8f0"] } },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        formatter: (val) => val.toFixed(0) + "%",
        style: { colors: "#e2e8f0" },
      },
    },
    fill: { opacity: 0.5, colors: ["#8b5cf6"] },
    stroke: { show: true, width: 2, colors: ["#8b5cf6"], dashArray: 0 },
    markers: {
      size: 4,
      colors: ["#8b5cf6"],
      strokeColor: "#e2e8f0",
      strokeWidth: 2,
    },
    tooltip: { theme: "dark", y: { formatter: (val) => val.toFixed(1) + "%" } },
    plotOptions: {
      radar: {
        polygons: { strokeColors: "#718096", connectorColors: "#718096" },
      },
    },
  };
  progressChart = new ApexCharts(chartEl, options);
  progressChart.render();
}
function createComparisonChart(lcData, cfData) {
  /* ... your existing code, ensure it handles null lcData/cfData ... */
  if (comparisonChart) comparisonChart.destroy();
  const chartEl = document.querySelector("#comparisonChart");
  chartEl.innerHTML = "";

  let lcSolved = [0, 0, 0],
    cfSolved = [0, 0, 0];
  let hasLcData = false,
    hasCfData = false;

  if (
    lcData &&
    (lcData.easySolved || lcData.mediumSolved || lcData.hardSolved)
  ) {
    lcSolved = [
      lcData.easySolved || 0,
      lcData.mediumSolved || 0,
      lcData.hardSolved || 0,
    ];
    hasLcData = true;
  }
  if (
    cfData &&
    (cfData.easySolved || cfData.mediumSolved || cfData.hardSolved)
  ) {
    cfSolved = [
      cfData.easySolved || 0,
      cfData.mediumSolved || 0,
      cfData.hardSolved || 0,
    ];
    hasCfData = true;
  }

  if (!hasLcData && !hasCfData) {
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>No data for comparison chart.</p>";
    return;
  }
  const series = [];
  if (hasLcData) series.push({ name: "LeetCode", data: lcSolved });
  if (hasCfData) series.push({ name: "Codeforces", data: cfSolved });

  const options = {
    series: series,
    chart: { type: "bar", height: 350, foreColor: "#e2e8f0" },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => (val > 0 ? val : ""),
      offsetY: -20,
      style: { fontSize: "10px", colors: ["#e2e8f0"] },
    },
    stroke: { show: true, width: 1, colors: ["transparent"] },
    xaxis: {
      categories: ["Easy", "Medium", "Hard"],
      labels: { style: { colors: "#e2e8f0" } },
    },
    yaxis: {
      title: { text: "Problems Solved", style: { color: "#e2e8f0" } },
      labels: { style: { colors: "#e2e8f0" } },
    },
    fill: { opacity: 1 },
    legend: { position: "top", labels: { colors: "#e2e8f0" } },
    colors: ["#10b981", "#3b82f6"],
    tooltip: { theme: "dark", y: { formatter: (val) => val + " problems" } },
  };
  comparisonChart = new ApexCharts(chartEl, options);
  comparisonChart.render();
}

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
  checkAuthState(); // Check login state on page load
  // Initial placeholder for charts if not logged in
  if (!localStorage.getItem("authToken")) {
    const chartDivs = [
      "#solvedChart",
      "#totalChart",
      "#progressChart",
      "#comparisonChart",
      "#userStats",
    ];
    chartDivs.forEach((divId) => {
      const el = document.querySelector(divId);
      if (el)
        el.innerHTML =
          "<p class='text-center text-gray-400 p-4'>Please login or sign up to view and fetch your stats.</p>";
    });
  }
});
