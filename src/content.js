// =================================================================
// 🌟 FIXED content.js 🌟
// =================================================================

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
cseScript.src = chrome.runtime.getURL('cseScraper.js');
// 🚨 Inject cseScraper.js immediately 
(document.head || document.documentElement).appendChild(cseScript);

let rendererScriptInjected = false;

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

// MutationObserver for the Search page to find the "See sections" button
const observer = new MutationObserver(() => {
    const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("See sections"))
    if (btn) {
        const existingPlotBtn = btn.nextElementSibling;

        if (!existingPlotBtn || !existingPlotBtn.classList.contains('madgrades-btn')) {
            currentCourse(btn);
        }

    } else {
        // console.log("Mutation detected, but 'See sections' button still not present.");
    }
})
observer.observe(document.body, { childList: true, subtree: true })

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
    console.log("trying to create button")
    const plotBtn = document.createElement("button")
    plotBtn.textContent = "Show MadGrades"
    plotBtn.className = "madgrades-btn"
    seeSectionsBtn.insertAdjacentElement("afterend", plotBtn)

    const popup = document.createElement("div")
    popup.id = "madgrades-popup"

    const modalContent = document.createElement("div");
    modalContent.className = "madgrades-modal-content";

    const avgGradesPlotDiv = document.createElement("div")
    avgGradesPlotDiv.id = "madgrades-plot"
    modalContent.appendChild(avgGradesPlotDiv)

    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close"
    closeBtn.id = "close-btn"
    modalContent.appendChild(closeBtn)

    popup.appendChild(modalContent);
    document.body.appendChild(popup);

    plotBtn.addEventListener("click", () => {
        popup.style.display = "block"

        const courseQuery = getCourseNameFromDOM();
        if (!courseQuery) {
            console.error("Could not find course name in the details pane.");
            return;
        }
        chrome.runtime.sendMessage(
            { action: "displayGraph", payload: courseQuery },
            function (response) {
                if (response && response.status === "success") {
                    console.log("bg executed !")
                    console.log(response)
                    createPlot(response.data);
                }
                else {
                    console.log("error executing bg")
                }
            }
        )
    });

    closeBtn.addEventListener("click", () => {
        popup.style.display = "none"
    })
}

function mainContentExecution() {
    // 🚨 We no longer need to call window.handleScheduler or window.handleSectionsButton
    // because cseScraper.js is now self-executing.
    injectStyles();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mainContentExecution);
} else {
    mainContentExecution();
}

function injectStyles() {
    const styleLink = document.createElement("link")
    styleLink.rel = "stylesheet"
    styleLink.href = chrome.runtime.getURL("injected.css")
    document.head.appendChild(styleLink)
    console.log("Styling applied!")
}