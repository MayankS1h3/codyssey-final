// --- Globals ---
let solvedChart, totalChart, progressChart, comparisonChart;
const API_BASE_URL = "http://localhost:3000/api"; // Ensure this matches your backend
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
const messageArea = document.getElementById("messageArea");
const calHeatmapDiv = document.getElementById("cal-heatmap");

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
  authButtonsContainer.style.display = "none";
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
  messageArea.textContent = "";

  if (userData.leetcodeUsername || userData.codeforcesHandle) {
    fetchAllStatsForUser();
  } else {
    statsContainer.classList.add("hidden");
    statsContainer.style.opacity = "0";
    if (calHeatmapDiv)
      calHeatmapDiv.innerHTML =
        "<p class='text-center text-gray-400 p-4'>Set handles to see activity.</p>";
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

  showAuthButtons();
  loginEmailInput.value = "";
  loginPasswordInput.value = "";
  signupEmailInput.value = "";
  signupPasswordInput.value = "";
  signupLeetcodeUsernameInput.value = "";
  signupCodeforcesHandleInput.value = "";
  messageArea.textContent = "";
  statsContainer.classList.add("hidden");
  if (calHeatmapDiv) calHeatmapDiv.innerHTML = "";
}

async function checkAuthState() {
  authToken = localStorage.getItem("authToken");
  const email = localStorage.getItem("userEmail");
  if (authToken && email) {
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
      throw new Error(
        data.message || response.statusText || `HTTP error ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
}

async function handleSignup() {
  const userData = {
    email: signupEmailInput.value,
    password: signupPasswordInput.value,
    leetcodeUsername: signupLeetcodeUsernameInput.value || undefined,
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
    toggleForms("login");
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
    updateUIAfterLogin(data);
    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.textContent =
      error.message || "Login failed. Check credentials or try again.";
  }
}

async function handleLogout() {
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
    localStorage.setItem("leetcodeUsername", data.leetcodeUsername || "");
    localStorage.setItem("codeforcesHandle", data.codeforcesHandle || "");
    showMessage(data.message || "Handles saved successfully!", "success");
    if (data.leetcodeUsername || data.codeforcesHandle) {
      fetchAllStatsForUser();
    }
  } catch (error) {
    showMessage(error.message || "Failed to save handles.", "error");
  }
}

// --- Heatmap Specific Functions ---
async function getCodeforcesSubmissionsForHeatmap(handle) {
  if (!handle) return [];
  try {
    // Use your API_BASE_URL to construct the path to your backend proxy
    // Make sure handle is URI encoded if it can contain special characters
    const proxyUrl = `${API_BASE_URL}/cf-proxy/user-status?handle=${encodeURIComponent(
      handle.trim()
    )}&count=5000&from=1`;
    const response = await fetch(proxyUrl); // Call your backend

    if (!response.ok) {
      // Try to get a message from your backend's error response
      const errorData = await response.json().catch(() => ({
        message: `Failed to fetch from CF Proxy: Server returned status ${response.status}`,
      }));
      console.error(
        `Error from CF proxy: ${errorData.message || response.statusText}`
      );
      showMessage(
        `Could not fetch Codeforces activity: ${
          errorData.message || "Proxy error"
        }`,
        "error"
      );
      return [];
    }
    const data = await response.json(); // This is the response from your proxy, which should be the CF API response
    if (data.status === "OK" && data.result) {
      return data.result; // Array of submission objects
    } else {
      // The proxy should have already handled CF API errors, but as a fallback:
      console.error(
        `Codeforces data via proxy indicates error: ${
          data.comment || "Unknown structure from proxy response"
        }`
      );
      showMessage(
        `Codeforces activity error: ${
          data.comment || "Unknown error via proxy"
        }`,
        "error"
      );
      return [];
    }
  } catch (error) {
    // Catches network errors for the fetch call to your proxy
    console.error(
      "Network error fetching Codeforces submissions via proxy:",
      error
    );
    showMessage(
      "Network error fetching Codeforces activity. Is your backend server running?",
      "error"
    );
    return [];
  }
}

function processAndCombineActivity(leetcodeCalendar, codeforcesSubmissions) {
  // <<< --- ADD THESE LOGS --- >>>
  console.log("--- Debugging processAndCombineActivity ---");
  console.log(
    "Raw LeetCode Calendar for processing:",
    JSON.stringify(leetcodeCalendar, null, 2)
  );
  console.log(
    "Raw Codeforces Submissions for processing:",
    JSON.stringify(codeforcesSubmissions, null, 2)
  );
  // <<< --- END OF ADDED LOGS --- >>>
  const combinedData = {};
  if (leetcodeCalendar && typeof leetcodeCalendar === "object") {
    for (const timestampStr in leetcodeCalendar) {
      const timestamp = parseInt(timestampStr, 10);
      if (!isNaN(timestamp)) {
        combinedData[timestamp] =
          (combinedData[timestamp] || 0) + leetcodeCalendar[timestampStr];
      }
    }
  }
  if (Array.isArray(codeforcesSubmissions)) {
    codeforcesSubmissions.forEach((submission) => {
      const submissionTimestamp = submission.creationTimeSeconds;
      const date = new Date(submissionTimestamp * 1000);
      date.setUTCHours(0, 0, 0, 0);
      const dayTimestamp = Math.floor(date.getTime() / 1000);
      combinedData[dayTimestamp] = (combinedData[dayTimestamp] || 0) + 1;
    });
  }
  return combinedData;
}

function renderCombinedHeatmap(activityData) {
  if (!calHeatmapDiv) {
    console.error("Heatmap container #cal-heatmap not found.");
    return;
  }
  calHeatmapDiv.innerHTML = ""; // Clear previous heatmap
  if (Object.keys(activityData).length === 0) {
    calHeatmapDiv.innerHTML =
      "<p class='text-center text-gray-400 p-4'>No activity data available for the heatmap.</p>";
    return;
  }

  // --- Debugging logs from before (can be kept or removed) ---
  // console.log("--- Debugging CalHeatMap ---");
  // console.log("Type of d3:", typeof d3);
  // if (typeof d3 === 'object' && d3 !== null) {
  //     console.log("d3 version (if available on object):", d3.version);
  //     console.log("d3 select defined?:", typeof d3.select);
  // }
  // console.log("Type of CalHeatMap constructor:", typeof CalHeatMap);
  // console.log("CalHeatMap constructor itself:", CalHeatMap);
  // console.log("Activity data being passed to heatmap:", JSON.stringify(activityData, null, 2));
  // --- End of debugging logs ---

  const cal = new CalHeatMap();

  // --- MODIFICATION FOR LAST 3 MONTHS ---
  const startDate = new Date(); // Today
  startDate.setMonth(startDate.getMonth() - 2); // Go back 2 months (e.g., if May, this becomes March)
  startDate.setDate(1); // Set to the 1st of that month
  startDate.setHours(0, 0, 0, 0); // Normalize to the beginning of the day

  try {
    cal.init({
      itemSelector: "#cal-heatmap",
      domain: "month", // Each "domain" is a month
      subDomain: "day",
      data: activityData,
      start: startDate, // MODIFIED: Start date for the 3-month range
      cellSize: 15,
      cellPadding: 3,
      cellRadius: 3,
      range: 3, // MODIFIED: Display 3 months
      legend: [1, 3, 6, 10, 15], // Adjust legend if desired for a smaller range, or keep as is
      legendColors: {
        min: "#D1FAE5",
        empty: "#F3F4F6",
        base: "#F3F4F6",
        low: "#A7F3D0",
        medium: "#6EE7B7",
        high: "#34D399",
        max: "#10B981",
      },
      tooltip: true,
      displayLegend: true,
      legendCellSize: 12,
      legendMargin: [10, 0, 0, 0],
      label: {
        position: "top",
        offset: { x: 10, y: -15 },
        width: 110,
      },
      itemName: ["submission", "submissions"],
      animationDuration: 500,
    });
    // If successful and there was data, update the main message
    if (Object.keys(activityData).length > 0) {
      // This message might be better placed in fetchAllStatsForUser after all promises resolve
      // showMessage("Activity heatmap loaded for the last 3 months!", "success");
    }
  } catch (e) {
    console.error("Error initializing CalHeatMap's .init():", e);
    calHeatmapDiv.innerHTML =
      "<p class='text-center text-red-400 p-4'>Could not display activity heatmap. " +
      e.message +
      "</p>";
  }
}

async function fetchAllStatsForUser() {
  if (!authToken) {
    showMessage("Please login to fetch stats.", "warning");
    toggleForms("login");
    return;
  }
  const lcUsername = localStorage.getItem("leetcodeUsername");
  const cfHandle = localStorage.getItem("codeforcesHandle");

  if (!lcUsername && !cfHandle) {
    showMessage(
      "Please save your LeetCode/Codeforces handles in your profile first.",
      "warning"
    );
    statsContainer.classList.add("hidden");
    statsContainer.style.opacity = "0";
    if (calHeatmapDiv)
      calHeatmapDiv.innerHTML =
        "<p class='text-center text-gray-400 p-4'>Set handles and fetch stats to see activity.</p>";
    return;
  }

  loadingIndicator.classList.remove("hidden");
  statsContainer.classList.add("hidden");
  statsContainer.style.opacity = "0";
  if (calHeatmapDiv)
    calHeatmapDiv.innerHTML =
      "<p class='text-center text-gray-400 p-4'>Loading activity data...</p>";
  showMessage("Fetching data for your profiles...", "info");

  const chartPromises = [];
  if (lcUsername) chartPromises.push(fetchLeetCodeData(lcUsername));
  else
    chartPromises.push(
      Promise.resolve({
        status: "skipped",
        data: null,
        message: "LeetCode username not set.",
      })
    );
  if (cfHandle) chartPromises.push(fetchCodeforcesData(cfHandle));
  else
    chartPromises.push(
      Promise.resolve({
        status: "skipped",
        data: null,
        message: "Codeforces handle not set.",
      })
    );

  let leetcodeCalendarForHeatmap = {};
  const cfSubmissionsPromiseForHeatmap = cfHandle
    ? getCodeforcesSubmissionsForHeatmap(cfHandle)
    : Promise.resolve([]);
  // Fetch LeetCode data once for both charts and heatmap
  const lcDataPromise = lcUsername
    ? fetchLeetCodeData(lcUsername)
    : Promise.resolve({ status: "skipped", data: null });

  const [
    lcDataResult,
    cfChartResultSettled,
    cfSubmissionsForHeatmapResultSettled,
  ] = await Promise.allSettled([
    lcDataPromise, // This now serves for both charts and heatmap
    chartPromises[1], // This is the original cfData promise for charts
    cfSubmissionsPromiseForHeatmap,
  ]);

  loadingIndicator.classList.add("hidden");

  const lcResultForChartsAndHeatmap =
    lcDataResult.status === "fulfilled"
      ? lcDataResult.value
      : { status: "error", data: null, message: "LeetCode: Fetch rejected." };
  const cfResultForCharts =
    cfChartResultSettled.status === "fulfilled"
      ? cfChartResultSettled.value
      : {
          status: "error",
          data: null,
          message: "Codeforces (Charts): Fetch rejected.",
        };
  const cfSubmissionsForHeatmap =
    cfSubmissionsForHeatmapResultSettled.status === "fulfilled"
      ? cfSubmissionsForHeatmapResultSettled.value
      : [];

  if (
    lcResultForChartsAndHeatmap.status === "success" &&
    lcResultForChartsAndHeatmap.data &&
    lcResultForChartsAndHeatmap.data.submissionCalendar
  ) {
    leetcodeCalendarForHeatmap =
      lcResultForChartsAndHeatmap.data.submissionCalendar;
  }

  let errors = [];
  if (lcResultForChartsAndHeatmap.status === "error" && lcUsername)
    errors.push(lcResultForChartsAndHeatmap.message);
  if (cfResultForCharts.status === "error" && cfHandle)
    errors.push(cfResultForCharts.message);
  // Note: Errors from getCodeforcesSubmissionsForHeatmap are logged internally and result in empty array, not added to this 'errors' list for the main message area.

  if (errors.length > 0) {
    showMessage(errors.join(" \n"), "error");
  } else if (
    lcResultForChartsAndHeatmap.status !== "error" ||
    cfResultForCharts.status !== "error"
  ) {
    if (
      (lcResultForChartsAndHeatmap.data && lcUsername) ||
      (cfResultForCharts.data && cfHandle)
    ) {
      // showMessage("Data fetched successfully!", "success"); // This might be too quick before heatmap renders
    } else {
      showMessage(
        "No new data to display or one/both handles not found on platforms.",
        "info"
      );
    }
  }

  if (
    (lcResultForChartsAndHeatmap.data && lcUsername) ||
    (cfResultForCharts.data && cfHandle)
  ) {
    updateUIDashboard(lcResultForChartsAndHeatmap.data, cfResultForCharts.data);
  } else {
    statsContainer.classList.add("hidden");
    if (!errors.length) {
      showMessage(
        "No data found for the provided handles. Please check them in your profile.",
        "warning"
      );
    }
  }

  if (lcUsername || cfHandle) {
    const combinedActivity = processAndCombineActivity(
      leetcodeCalendarForHeatmap,
      cfSubmissionsForHeatmap
    );
    renderCombinedHeatmap(combinedActivity);
    if (Object.keys(combinedActivity).length > 0 && errors.length === 0) {
      showMessage("Stats and activity heatmap loaded!", "success");
    } else if (
      errors.length === 0 &&
      Object.keys(combinedActivity).length === 0
    ) {
      showMessage("Stats loaded. No activity data for heatmap.", "info");
    }
  } else {
    if (calHeatmapDiv)
      calHeatmapDiv.innerHTML =
        "<p class='text-center text-gray-400 p-4'>Set handles to see activity.</p>";
  }
}

async function fetchLeetCodeData(username) {
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
    if (
      data.status === "Failed Request" ||
      data.message === "User not found!" ||
      (data.totalQuestions === 0 && !data.submissionCalendar)
    ) {
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
  if (!handle)
    return {
      status: "skipped",
      data: null,
      message: "Codeforces handle not provided.",
    };
  try {
    // Using the proxy for user.info as well, for consistency and if CF ever adds CORS to it.
    // Or, keep direct if user.info is known to not have CORS issues. For now, let's assume direct is fine for this part.
    const userInfoResponse = await fetch(
      `https://codeforces.com/api/user.info?handles=${handle.trim()}`
    );
    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse
        .text()
        .catch(() => `HTTP ${userInfoResponse.status}`);
      return {
        status: "error",
        data: null,
        message: `Codeforces user.info: ${errorText}`,
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

    // For solved counts by difficulty, we still need user.status. We can use the proxy for this too,
    // but the existing fetchCodeforcesData was for chart data, not raw heatmap submissions.
    // Let's use the proxy here too for consistency, but process it for chart data.
    const proxyStatusUrl = `${API_BASE_URL}/cf-proxy/user-status?handle=${encodeURIComponent(
      handle.trim()
    )}&count=10000`; // Fetch enough for stats
    const userStatusResponse = await fetch(proxyStatusUrl);

    if (!userStatusResponse.ok) {
      const errorData = await userStatusResponse.json().catch(() => ({
        message: `CF Status via Proxy: ${userStatusResponse.statusText}`,
      }));
      return {
        status: "error",
        data: null,
        message: `Codeforces user.status (via proxy): ${errorData.message}`,
      };
    }
    const userStatusData = await userStatusResponse.json();
    if (userStatusData.status !== "OK") {
      return {
        status: "error",
        data: null,
        message: `Codeforces (via proxy): ${
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
          if (rating === undefined) {
          } else if (rating <= 1200) easySolved++;
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
    console.error("Codeforces API Error (fetchCodeforcesData):", error);
    return {
      status: "error",
      data: null,
      message: "Codeforces: Network error or API processing failed.",
    };
  }
}

function updateUIDashboard(lcData, cfData) {
  if (!lcData && !cfData) {
    statsContainer.classList.add("hidden");
    if (localStorage.getItem("authToken")) {
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
  const userStatsContainer = document.getElementById("userStats");
  userStatsContainer.innerHTML = "";
  const createStatElement = (label, value) => {
    /* ... (same as before) ... */
    const statElement = document.createElement("div");
    statElement.className =
      "flex flex-col items-center m-2 p-4 bg-gray-700 bg-opacity-50 rounded-lg shadow min-w-[120px]";
    statElement.innerHTML = `<span class="text-xl md:text-2xl font-bold text-white">${
      value !== undefined && value !== null ? value : "N/A"
    }</span><span class="text-xs md:text-sm text-gray-300 text-center">${label}</span>`;
    userStatsContainer.appendChild(statElement);
  };
  let hasStats = false;
  if (lcData && lcData.totalSolved !== undefined) {
    createStatElement("LC Ranking", lcData.ranking);
    createStatElement("LC Reputation", lcData.reputation);
    createStatElement("LC Contrib.", lcData.contributionPoints);
    createStatElement("LC Total Solved", lcData.totalSolved);
    hasStats = true;
  }
  if (cfData && cfData.totalSolved !== undefined) {
    createStatElement("CF Rating", cfData.rating);
    createStatElement("CF Max Rating", cfData.maxRating);
    createStatElement("CF Rank", cfData.rank);
    createStatElement("CF Contrib.", cfData.contribution);
    createStatElement("CF Total Solved", cfData.totalSolved);
    hasStats = true;
  }
  if (!hasStats)
    userStatsContainer.innerHTML =
      "<p class='text-center text-gray-400 p-4'>No stats to display.</p>";
}

function createSolvedChart(lcData, cfData) {
  /* ... (same as before, ensure null checks) ... */
  if (solvedChart) solvedChart.destroy();
  const chartEl = document.querySelector("#solvedChart");
  chartEl.innerHTML = "";
  const series = [];
  if (
    lcData &&
    (lcData.easySolved !== undefined ||
      lcData.mediumSolved !== undefined ||
      lcData.hardSolved !== undefined)
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
    (cfData.easySolved !== undefined ||
      cfData.mediumSolved !== undefined ||
      cfData.hardSolved !== undefined)
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
      "<p class='text-center text-gray-400 p-4'>No solved data.</p>";
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
  /* ... (same as before, ensure null checks) ... */
  if (totalChart) totalChart.destroy();
  const chartEl = document.querySelector("#totalChart");
  chartEl.innerHTML = "";
  if (
    !lcData ||
    (lcData.totalEasy === undefined &&
      lcData.totalMedium === undefined &&
      lcData.totalHard === undefined)
  ) {
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>No LC total data.</p>";
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
  /* ... (same as before, ensure null checks) ... */
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
      "<p class='text-center text-gray-400 p-4'>No LC progress data.</p>";
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
    !lcData.hardSolved &&
    !lcData.totalEasy &&
    !lcData.totalMedium &&
    !lcData.totalHard
  ) {
    chartEl.innerHTML =
      "<p class='text-center text-gray-400 p-4'>Not enough LC data for radar.</p>";
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
  /* ... (same as before, ensure null checks) ... */
  if (comparisonChart) comparisonChart.destroy();
  const chartEl = document.querySelector("#comparisonChart");
  chartEl.innerHTML = "";
  let lcSolved = [0, 0, 0],
    cfSolved = [0, 0, 0];
  let hasLcData = false,
    hasCfData = false;
  if (
    lcData &&
    (lcData.easySolved !== undefined ||
      lcData.mediumSolved !== undefined ||
      lcData.hardSolved !== undefined)
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
    (cfData.easySolved !== undefined ||
      cfData.mediumSolved !== undefined ||
      cfData.hardSolved !== undefined)
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
      "<p class='text-center text-gray-400 p-4'>No comparison data.</p>";
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

function showMessage(message, type = "info") {
  messageArea.textContent = message;
  messageArea.className = `text-center mb-4 p-2 rounded-md ${
    type === "error"
      ? "text-red-700 bg-red-100 border border-red-300"
      : type === "warning"
      ? "text-yellow-700 bg-yellow-100 border border-yellow-300"
      : type === "success"
      ? "text-green-700 bg-green-100 border border-green-300"
      : "text-blue-700 bg-blue-100 border border-blue-300"
  }`;
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuthState();
  if (!localStorage.getItem("authToken")) {
    const elementsToClear = [
      "#solvedChart",
      "#totalChart",
      "#progressChart",
      "#comparisonChart",
      "#userStats",
      "#cal-heatmap",
    ];
    elementsToClear.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el)
        el.innerHTML =
          "<p class='text-center text-gray-400 p-4'>Please login or sign up to view and fetch your stats.</p>";
    });
  }
});
