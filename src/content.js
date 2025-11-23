const plotlyScript = document.createElement('script');
plotlyScript.src = chrome.runtime.getURL('node_modules/plotly.js-dist/plotly.js');
(document.head || document.documentElement).appendChild(plotlyScript);

const configScript = document.createElement('script');
configScript.src = chrome.runtime.getURL('madgrades/config.js');
configScript.type = 'module';
(document.head || document.documentElement).appendChild(configScript);

const handlerScript = document.createElement('script');
handlerScript.src = chrome.runtime.getURL('madgrades/madgrades_handler.js');
handlerScript.type = 'module';
(document.head || document.documentElement).appendChild(handlerScript);

const cseScript = document.createElement('script');
cseScript.src = chrome.runtime.getURL('cseScraper.js'); // Ensure this matches the manifest path
(document.head || document.documentElement).appendChild(cseScript);

let rendererScriptInjected = false;

// Declare variables globally
let popup;
let closeBtn;

// --- Function to create the persistent modal structure (new) ---
function createMadgradesPopup() {
    // Check if the popup already exists in the DOM to prevent duplicates
    if (document.getElementById('madgrades-popup')) {
        popup = document.getElementById('madgrades-popup');
        return;
    }

    popup = document.createElement("div");
    popup.id = "madgrades-popup";
    popup.style.display = "none"; // Ensure it starts hidden

    const modalContent = document.createElement("div");
    modalContent.className = "madgrades-modal-content";

    const spinnerDiv = document.createElement("div");
    spinnerDiv.id = "madgrades-spinner";
    modalContent.appendChild(spinnerDiv); // Add it to the modal content

    const avgGradesPlotDiv = document.createElement("div")
    avgGradesPlotDiv.id = "madgrades-plot"
    modalContent.appendChild(avgGradesPlotDiv)

    closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.id = "close-btn";
    modalContent.appendChild(closeBtn);

    popup.appendChild(modalContent);
    document.body.appendChild(popup);

    closeBtn.addEventListener("click", () => {
        document.getElementById('madgrades-popup').classList.remove('visible');
        popup.style.display = "none";
        // Also ensure the graph is cleared when closed for the next render
        if (window.Plotly && window.Plotly.purge) {
            window.Plotly.purge('madgrades-plot');
        } else {
            document.getElementById('madgrades-plot').innerHTML = '';
        }
    });

    console.log("MadGrades Popup structure created once.");
}
// --- End of new function ---

function dispatchPlotEvent(data) {
    const event = new CustomEvent('RenderMadgradesPlot', {
        detail: {
            plotData: JSON.stringify(data)
        }
    });

    window.dispatchEvent(event);
}

function createPlot(data) {
    if (!rendererScriptInjected) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('render_plot.js');
        (document.head || document.documentElement).appendChild(script);
        rendererScriptInjected = true;

        script.onload = () => {
            dispatchPlotEvent(data);
        };
        script.onerror = (e) => console.error("Failed to load renderplot.js", e);
    } else {
        dispatchPlotEvent(data);
    }
}

const observer = new MutationObserver(() => {
    // const buttons = document.querySelectorAll("button");
    const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("See sections"))
    console.log("button?", btn)
    if (btn) {
        const existingPlotBtn = btn.nextElementSibling;

        if (!existingPlotBtn || !existingPlotBtn.classList.contains('madgrades-btn')) {
            currentCourse(btn);
        }

    } else {
        // If the button isn't here yet, we just wait for the next mutation
        console.log("Mutation detected, but 'See sections' button still not present.");
    }
})
observer.observe(document.body, { childList: true, subtree: true })

function injectStyles() {
    // Styling for injected elements
    const styleLink = document.createElement("link")
    styleLink.rel = "stylesheet"
    styleLink.href = chrome.runtime.getURL("injected.css")
    document.head.appendChild(styleLink)
    createMadgradesPopup();
    console.log("Styling applied!")
}

const getCourseNameFromDOM = () => {
    const pane = document.querySelector('cse-pane#details');

    if (!pane || pane.offsetParent === null) return null;

    const toolbarSpans = pane.querySelectorAll('mat-toolbar span');

    const courseNameSpan = Array.from(toolbarSpans)
        .filter(span => span.innerText.trim() && !span.classList.length)
        .pop();

    return courseNameSpan ? courseNameSpan.innerText.trim() : null;
}

const currentCourse = (seeSectionsBtn) => {
    if (!seeSectionsBtn) {
        return
    }

    // We rely on 'popup' being a global variable created by createMadgradesPopup()
    if (!popup) {
        console.error("Popup not initialized. Re-running startup logic.");
        createMadgradesPopup();
    }

    console.log("trying to create button")

    // Create NEW button for this course instance
    const plotBtn = document.createElement("button")
    plotBtn.textContent = "Show MadGrades"
    plotBtn.className = "madgrades-btn"
    seeSectionsBtn.insertAdjacentElement("afterend", plotBtn)

    // Attach click listener to the NEW button, referencing the ONE global popup
    plotBtn.addEventListener("click", () => {
        const popup = document.getElementById('madgrades-popup');
        popup.classList.add('visible');
        popup.style.display = "block" // Show the one, persistent popup
        popup.classList.add('loading'); // for buffer

        const courseQuery = getCourseNameFromDOM();
        if (!courseQuery) {
            console.error("Could not find course name in the details pane.");
            // Optionally, show a message in the popup saying "Error fetching course info"
            return; // Stop execution if the course name is missing
        }
        chrome.runtime.sendMessage(
            { action: "displayGraph", payload: courseQuery },
            function (response) {
                popup.classList.remove('loading');
                if (response && response.status === "success") {
                    console.log("bg executed !")
                    createPlot(response.data);
                }
                else {
                    console.log("error executing bg")
                }
            }
        )
    });
}
// plotBtn.addEventListener("click", () => {
//     popup.style.display = "block"

//     chrome.runtime.sendMessage(
//         { action: "displayGraph", payload: "COMP SCI 564" },
//         function (response) {
//             if (response && response.status === "success") {
//                 console.log("bg executed !")
//                 console.log(response)
//                 createPlot(response.data);
//             }
//             else {
//                 console.log("error executing bg")
//             }
//         }
//     )
// });

// closeBtn.addEventListener("click", () => {
//     popup.style.display = "none"
// })


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
} else {
    injectStyles();
}

function mainContentExecution() {
    const path = window.location.href.split("?")[0];

    // Wait until the cs&e.js script is loaded before trying to call its functions.
    // This is the simplest way to ensure the functions are on the window object.
    cseScript.onload = () => {
        switch (true) {
            case path.endsWith("/scheduler"):
                // 💡 Call the globally exposed function
                if (window.handleScheduler) {
                    window.handleScheduler();
                }
                break;
            case path.endsWith("/search"):
                // 💡 Call the globally exposed function
                if (window.handleSectionsButton) {
                    window.handleSectionsButton();
                }
                break;
        }
    };

    // Ensure styles are injected after the page is loaded (keep existing injectStyles call)
    injectStyles();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mainContentExecution);
} else {
    mainContentExecution();
}

function injectStyles() {
    // Styling for injected elements
    const styleLink = document.createElement("link")
    styleLink.rel = "stylesheet"
    styleLink.href = chrome.runtime.getURL("injected.css")
    document.head.appendChild(styleLink)
    console.log("Styling applied!")
}