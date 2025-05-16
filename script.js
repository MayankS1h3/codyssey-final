let solvedChart, totalChart, progressChart, comparisonChart;

const fetchStatsButton = document.getElementById("fetchStats");
const leetcodeUsernameInput = document.getElementById("leetcodeUsername");
const codeforcesUsernameInput = document.getElementById("codeforcesUsername");
const statsContainer = document.getElementById("statsContainer");
const loadingIndicator = document.getElementById("loadingIndicator");
const messageArea = document.getElementById("messageArea");

fetchStatsButton.addEventListener("click", fetchAllStats);

function showMessage(message, type = "info") {
  messageArea.textContent = message;
  messageArea.className = `text-center mb-4 ${
    type === "error"
      ? "text-red-400"
      : type === "warning"
      ? "text-yellow-400"
      : "text-blue-300"
  }`;
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
    if (data.status === "Failed Request" || data.ranking === undefined) {
      // Adjusted condition based on API
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
    // 1. Fetch user info (rating, rank)
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

    // 2. Fetch user submissions to count solved problems
    const userStatusResponse = await fetch(
      `https://codeforces.com/api/user.status?handle=${handle.trim()}&from=1&count=10000`
    ); // Fetch a large number
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
          else if (rating >= 1201 && rating <= 1700)
            mediumSolved++; // Adjusted medium range
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

async function fetchAllStats() {
  const leetcodeUsername = leetcodeUsernameInput.value.trim();
  const codeforcesHandle = codeforcesUsernameInput.value.trim();

  if (!leetcodeUsername && !codeforcesHandle) {
    showMessage("Enter at least one username/handle to proceed.", "warning");
    return;
  }

  loadingIndicator.classList.remove("hidden");
  statsContainer.classList.add("hidden");
  statsContainer.style.opacity = "0";
  showMessage("Fetching data...", "info");

  let lcResult, cfResult;

  // Use Promise.allSettled to ensure all fetches complete, even if some fail
  const results = await Promise.allSettled([
    fetchLeetCodeData(leetcodeUsername),
    fetchCodeforcesData(codeforcesHandle),
  ]);

  lcResult =
    results[0].status === "fulfilled"
      ? results[0].value
      : {
          status: "error",
          data: null,
          message: "LeetCode: Fetch promise rejected.",
        };
  cfResult =
    results[1].status === "fulfilled"
      ? results[1].value
      : {
          status: "error",
          data: null,
          message: "Codeforces: Fetch promise rejected.",
        };

  loadingIndicator.classList.add("hidden");

  let errors = [];
  if (lcResult.status === "error") errors.push(lcResult.message);
  if (cfResult.status === "error") errors.push(cfResult.message);

  if (errors.length > 0) {
    showMessage(errors.join(" \n"), "error");
  } else {
    showMessage("Data fetched successfully!", "success");
  }

  if (lcResult.status === "success" || cfResult.status === "success") {
    updateUI(lcResult.data, cfResult.data);
    // Optionally clear inputs if both were successful or as per preference
    // leetcodeUsernameInput.value = '';
    // codeforcesUsernameInput.value = '';
  } else if (
    errors.length > 0 &&
    lcResult.status !== "success" &&
    cfResult.status !== "success"
  ) {
    // If both failed and errors were shown, do nothing more for UI
    statsContainer.classList.add("hidden"); // Ensure it stays hidden
  } else {
    // One skipped, one failed, or other non-success scenarios with no data for UI
    statsContainer.classList.add("hidden");
    if (!errors.length)
      showMessage("No data to display. Please check usernames.", "warning");
  }
}

function updateUI(lcData, cfData) {
  if (!lcData && !cfData) {
    statsContainer.classList.add("hidden");
    return;
  }
  statsContainer.classList.remove("hidden");
  setTimeout(() => {
    statsContainer.style.opacity = "1";
  }, 50);

  updateUserStatsDisplay(lcData, cfData);
  createSolvedChart(lcData, cfData);
  createTotalChart(lcData); // Primarily LeetCode
  createProgressChart(lcData); // Primarily LeetCode
  createComparisonChart(lcData, cfData);
}

function updateUserStatsDisplay(lcData, cfData) {
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

  if (lcData) {
    createStatElement("LC Ranking", lcData.ranking);
    createStatElement("LC Reputation", lcData.reputation);
    createStatElement("LC Contrib.", lcData.contributionPoints);
    createStatElement("LC Total Solved", lcData.totalSolved);
  }
  if (cfData) {
    createStatElement("CF Rating", cfData.rating);
    createStatElement("CF Max Rating", cfData.maxRating);
    createStatElement("CF Rank", cfData.rank);
    createStatElement("CF Contrib.", cfData.contribution);
    createStatElement("CF Total Solved", cfData.totalSolved);
  }
}

function createSolvedChart(lcData, cfData) {
  if (solvedChart) solvedChart.destroy();

  const series = [];
  const categories = ["Easy", "Medium", "Hard"];

  if (lcData) {
    series.push({
      name: "LeetCode",
      data: [
        lcData.easySolved || 0,
        lcData.mediumSolved || 0,
        lcData.hardSolved || 0,
      ],
    });
  }
  if (cfData) {
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
    document.querySelector("#solvedChart").innerHTML =
      "<p class='text-center text-gray-400'>No data for solved problems chart.</p>";
    return;
  }

  const options = {
    series: series,
    chart: {
      type: "bar", // Changed to bar for better comparison of two series
      height: 350,
      foreColor: "#e2e8f0",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: categories,
      labels: { style: { colors: "#e2e8f0" } },
    },
    yaxis: {
      title: { text: "Problems Solved", style: { color: "#e2e8f0" } },
      labels: { style: { colors: "#e2e8f0" } },
    },
    fill: { opacity: 1 },
    legend: { position: "top", labels: { colors: "#e2e8f0" } },
    colors: ["#4ade80", "#fbbf24"], // Colors for LC and CF series
    tooltip: { theme: "dark" },
  };

  solvedChart = new ApexCharts(document.querySelector("#solvedChart"), options);
  solvedChart.render();
}

function createTotalChart(lcData) {
  // Primarily LeetCode
  if (totalChart) totalChart.destroy();
  if (
    !lcData ||
    (!lcData.totalEasy && !lcData.totalMedium && !lcData.totalHard)
  ) {
    document.querySelector("#totalChart").innerHTML =
      "<p class='text-center text-gray-400'>LeetCode 'total available' data not found.</p>";
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
  totalChart = new ApexCharts(document.querySelector("#totalChart"), options);
  totalChart.render();
}

function createProgressChart(lcData) {
  // Primarily LeetCode
  if (progressChart) progressChart.destroy();

  if (
    !lcData ||
    (!lcData.totalEasy && !lcData.totalMedium && !lcData.totalHard)
  ) {
    document.querySelector("#progressChart").innerHTML =
      "<p class='text-center text-gray-400'>LeetCode progress data not available.</p>";
    return;
  }

  const progressData = [
    lcData.totalEasy ? (lcData.easySolved / lcData.totalEasy) * 100 : 0,
    lcData.totalMedium ? (lcData.mediumSolved / lcData.totalMedium) * 100 : 0,
    lcData.totalHard ? (lcData.hardSolved / lcData.totalHard) * 100 : 0,
  ].map((p) => parseFloat(p.toFixed(1))); // Ensure numbers and fix precision

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
  progressChart = new ApexCharts(
    document.querySelector("#progressChart"),
    options
  );
  progressChart.render();
}

function createComparisonChart(lcData, cfData) {
  if (comparisonChart) comparisonChart.destroy();

  const series = [];
  const categories = ["Easy Solved", "Medium Solved", "Hard Solved"];
  let lcSolved = [0, 0, 0],
    cfSolved = [0, 0, 0];

  if (lcData) {
    lcSolved = [
      lcData.easySolved || 0,
      lcData.mediumSolved || 0,
      lcData.hardSolved || 0,
    ];
  }
  if (cfData) {
    cfSolved = [
      cfData.easySolved || 0,
      cfData.mediumSolved || 0,
      cfData.hardSolved || 0,
    ];
  }

  if (!lcData && !cfData) {
    document.querySelector("#comparisonChart").innerHTML =
      "<p class='text-center text-gray-400'>No data for comparison chart.</p>";
    return;
  }

  // This chart will compare total solved by difficulty side-by-side
  // X-axis: Difficulty (Easy, Medium, Hard)
  // Y-axis: Number of problems solved
  // Series: LeetCode, Codeforces

  const options = {
    series: [
      { name: "LeetCode", data: lcSolved },
      { name: "Codeforces", data: cfSolved },
    ],
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
      formatter: function (val) {
        return val > 0 ? val : "";
      }, // Show only if > 0
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
    colors: ["#10b981", "#3b82f6"], // LeetCode Green, Codeforces Blue
    tooltip: { theme: "dark", y: { formatter: (val) => val + " problems" } },
  };

  comparisonChart = new ApexCharts(
    document.querySelector("#comparisonChart"),
    options
  );
  comparisonChart.render();
}

// Initialize with empty state for charts if needed
document.addEventListener("DOMContentLoaded", () => {
  const chartDivs = [
    "#solvedChart",
    "#totalChart",
    "#progressChart",
    "#comparisonChart",
  ];
  chartDivs.forEach((div) => {
    const el = document.querySelector(div);
    if (el)
      el.innerHTML =
        "<p class='text-center text-gray-400 p-4'>Enter username(s) and fetch stats to view charts.</p>";
  });
});
