// Define the port number as a global variable
var serverPort = 8001; // Update this to your server's port if different
var ollamaPort = 11434; // Default Ollama service port

// Construct the base URL using the global port variable
var serverBaseUrl = `http://localhost:${serverPort}`;
var ollamaBaseUrl =
  localStorage.getItem("host-address") || `http://localhost:${ollamaPort}`; // Ollama base URL

var rebuildRules = undefined;
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
  rebuildRules = async function (domain) {
    const domains = [domain];
    /** @type {chrome.declarativeNetRequest.Rule[]} */
    const rules = [
      {
        id: 1,
        condition: {
          requestDomains: domains,
        },
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "origin",
              operation: "set",
              value: `http://${domain}/`,
            },
          ],
        },
      },
    ];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
      addRules: rules,
    });
  };
}

// Ensure the UI reflects the current Ollama base URL
if (document.getElementById("host-address")) {
  document.getElementById("host-address").value = ollamaBaseUrl;
}

if (rebuildRules) {
  rebuildRules(ollamaBaseUrl);
}

function setHostAddress() {
  ollamaBaseUrl = document.querySelector("#settingsModal #host-address").value;
  localStorage.setItem("host-address", ollamaBaseUrl);
  populateModels(); // Assuming this function refreshes model list or similar
  if (rebuildRules) {
    rebuildRules(ollamaBaseUrl);
  }
}

async function getModels() {
  const response = await fetch(`${ollamaBaseUrl}/api/tags`);
  const data = await response.json();
  return data;
}

// Function to send a POST request to the API
function postRequest(data, signal, endpoint = "generate") {
  const URL = `${ollamaBaseUrl}/api/${endpoint}`;
  return fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal: signal,
    //raw: true,
  });
}

// Function to stream the response from the server
async function getResponse(response, callback) {
  const reader = response.body.getReader();
  let partialLine = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    // Decode the received value and split by lines
    const textChunk = new TextDecoder().decode(value);
    const lines = (partialLine + textChunk).split("\n");
    partialLine = lines.pop(); // The last line might be incomplete

    for (const line of lines) {
      if (line.trim() === "") continue;
      const parsedResponse = JSON.parse(line);
      callback(parsedResponse); // Process each response word
    }
  }

  // Handle any remaining line
  if (partialLine.trim() !== "") {
    const parsedResponse = JSON.parse(partialLine);
    callback(parsedResponse);
  }
}

/**
 * Function to terminate the "ollama serve" process.
 */
async function killOllama() {
  let response = null;
  try {
    console.log(`${serverBaseUrl}/kill_ollama`);
    response = await fetch(`${serverBaseUrl}/kill_ollama`, {
      credentials: "include",
      mode: 'cors'
    });
    if (response.ok) {
      const text = await response.text();
      console.log(text); // Process response text as needed
    } else {
      console.error('Failed to terminate the "ollama serve" process.', response.statusText);
    }
  } catch (error) {
    console.log("Error when trying to send kill request:", error);
  }
}



/**
 * Function to start the "ollama serve" process.
 */
async function startOllama() {
  try {
    const response = await fetch(`${serverBaseUrl}/start_ollama`, {
      credentials: "include",
      mode: 'cors'
    });
    if (response.ok) {
      const text = await response.text();
      console.log(text); // Process response text as needed
    } else {
      console.error(
        'Failed to start the "ollama serve" process.',
        response.statusText
      );
    }
  } catch (error) {
    console.log("Error when trying to send start request:", error);
  }
}
