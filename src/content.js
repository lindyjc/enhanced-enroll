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
(document.head || document.documentElement).appendChild(cseScript);

let rendererScriptInjected = false;

// GLOBAL modal elements
let popup = null;
let closeBtn = null;

// =================================================================
//  Create popup ONCE only
// =================================================================
function createMadgradesPopup() {
    if (popup) return; // don't recreate

    popup = document.createElement("div");
    popup.id = "madgrades-popup";
    popup.style.display = "none";

    const modalContent = document.createElement("div");
    modalContent.className = "madgrades-modal-content";

    const spinnerDiv = document.createElement("div");
    spinnerDiv.id = "madgrades-spinner";
    modalContent.appendChild(spinnerDiv);

    const avgGradesPlotDiv = document.createElement("div");
    avgGradesPlotDiv.id = "madgrades-plot";
    modalContent.appendChild(avgGradesPlotDiv);

    closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.id = "close-btn";
    modalContent.appendChild(closeBtn);

    popup.appendChild(modalContent);
    document.body.appendChild(popup);

    closeBtn.addEventListener("click", () => {
        popup.classList.remove('visible');
        popup.style.display = "none";

        if (window.Plotly) {
            window.Plotly.purge('madgrades-plot');
        } else {
            document.getElementById('madgrades-plot').innerHTML = '';
        }
    });

    console.log("MadGrades popup created.");
}

// =================================================================
//  Helpers
// =================================================================
function dispatchPlotEvent(data) {
    const event = new CustomEvent('RenderMadgradesPlot', {
        detail: { plotData: JSON.stringify(data) }
    });
    window.dispatchEvent(event);
}

function createPlot(data) {
    if (!rendererScriptInjected) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('render_plot.js');
        (document.head || document.documentElement).appendChild(script);
        rendererScriptInjected = true;

        script.onload = () => dispatchPlotEvent(data);
        script.onerror = e => console.log("Failed to load render_plot.js", e);
    } else {
        dispatchPlotEvent(data);
    }
}

function getCourseNameFromDOM() {
    const pane = document.querySelector('cse-pane#details');

    if (!pane || pane.offsetParent === null) return null;

    const toolbarSpans = pane.querySelectorAll('mat-toolbar span');

    const courseNameSpan = Array.from(toolbarSpans)
        .filter(span => span.innerText.trim() && !span.classList.length)
        .pop();

    return courseNameSpan ? courseNameSpan.innerText.trim() : null;
}

// =================================================================
//  RMP MESSAGING SYSTEM
// =================================================================

// Listen for RMP requests from page context (cseScraper.js)
window.addEventListener('message', function(event) {
    // Only accept messages from the same frame and of the correct type
    if (event.source !== window) return;
    
    if (event.data.type && event.data.type === 'FETCH_RMP_DATA') {
        const { professorName, sectionGroupId } = event.data;
        
        console.log("Content script: Forwarding RMP request for:", professorName);
        
        // Forward to background script
        chrome.runtime.sendMessage(
            { action: "findRMP", professorName: professorName },
            (professorData) => {
                // Send response back to page context
                window.postMessage({
                    type: 'RMP_DATA_RESPONSE',
                    professorData: professorData,
                    sectionGroupId: sectionGroupId,
                    professorName: professorName
                }, '*');
            }
        );
    }
});

// Listen for RMP responses to update the UI
window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    if (event.data.type && event.data.type === 'RMP_DATA_RESPONSE') {
        const { professorData, professorName } = event.data;
        
        console.log("Content script: Received RMP data for:", professorName);
        
        // Find the section group by instructor name and update it
        const instructorElements = document.querySelectorAll('.one-instructor');
        instructorElements.forEach(instructorElement => {
            if (instructorElement.innerText.trim() === professorName) {
                const sectionGroup = instructorElement.closest('cse-pack-header');
                if (sectionGroup) {
                    if (professorData && professorData.status === "success") {
                        displayProfessorRating(professorData.data, sectionGroup);
                    } else {
                        console.error(`Failed to fetch RMP data for ${professorName}:`, professorData?.error);
                        displayProfessorRating({ error: `Failed to fetch for ${professorName}` }, sectionGroup);
                    }
                }
            }
        });
    }
});

// display RMP
function displayProfessorRating(professorData, sectionElement) {
    const existingRating = sectionElement.querySelector('.rmp-rating');
    if (existingRating) {
        existingRating.remove();
    }

    const ratingElement = document.createElement('div');
    ratingElement.className = 'rmp-rating';

    if (professorData.isPlaceholder) {
        // Create clickable RMP search link
        ratingElement.innerHTML = `
            <div style="margin: 4px 0; font-size: 12px; line-height: 1.3;">
                <a href="${professorData.searchUrl}" target="_blank" style="color: #C5050C; text-decoration: underline; font-weight: bold;">
                    🔍 Search RateMyProfessors
                </a>
            </div>
        `;
    } else if (professorData.rating && professorData.rating !== "N/A" && !professorData.error) {
        // Normal rating display
        const rating = parseFloat(professorData.rating);
        let ratingColor = '#cc0000';
        if (rating >= 4.0) ratingColor = '#00a000';
        else if (rating >= 3.0) ratingColor = '#ff9900';

        const difficulty = parseFloat(professorData.difficulty);
        let difficultyColor = '#00a000';
        if (difficulty >= 4.0) difficultyColor = '#cc0000';
        else if (difficulty >= 3.0) difficultyColor = '#ff9900';

        ratingElement.innerHTML = `
            <div style="margin: 4px 0; font-size: 12px; line-height: 1.3;">
                <span style="font-weight: bold;">RMP: </span>
                <span style="color: ${ratingColor}; font-weight: bold;">${professorData.rating}/5</span> | 
                <span style="font-weight: bold;">Difficulty: </span>
                <span style="color: ${difficultyColor}; font-weight: bold;">${professorData.difficulty}/5</span>
            </div>
        `;
    } else if (professorData.error) {
        ratingElement.innerHTML = `
            <div style="margin: 4px 0; font-size: 11px; color: #666; font-style: italic;">
                RMP: Not found
            </div>
        `;
    }

    const instructorElement = sectionElement.querySelector('.one-instructor');
    if (instructorElement) {
        instructorElement.parentNode.insertBefore(ratingElement, instructorElement.nextSibling);
    }
}

// =================================================================
//  Main logic: add the "Show MadGrades" button
// =================================================================
function currentCourse(seeSectionsBtn) {
    if (!seeSectionsBtn) return;

    if (!popup) createMadgradesPopup();

    console.log("Trying to create MadGrades button...");

    // Prevent duplicate button
    const existingBtn = seeSectionsBtn.nextElementSibling;
    if (existingBtn && existingBtn.classList.contains("madgrades-btn")) {
        return;
    }

    const plotBtn = document.createElement("button");
    plotBtn.textContent = "Show MadGrades";
    plotBtn.className = "madgrades-btn";
    seeSectionsBtn.insertAdjacentElement("afterend", plotBtn);

    plotBtn.addEventListener("click", () => {
        popup.style.display = "block";
        popup.classList.add("visible", "loading");

        const courseQuery = getCourseNameFromDOM();
        if (!courseQuery) {
            console.error("No course name found.");
            popup.classList.remove('loading');
            return;
        }

        chrome.runtime.sendMessage(
            { action: "displayGraph", payload: courseQuery },
            response => {
                popup.classList.remove('loading');
                if (response?.status === "success") {
                    createPlot(response.data);
                } else {
                    console.log("Error executing background script.");
                }
            }
        );
    });
}

// =================================================================
// MutationObserver – watches for “See sections” button
// =================================================================
const observer = new MutationObserver(() => {
    const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.includes("See sections"));

    if (btn) currentCourse(btn);
});
observer.observe(document.body, { childList: true, subtree: true });

// =================================================================
// Inject styles & start system
// =================================================================
function injectStyles() {
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = chrome.runtime.getURL("injected.css");
    document.head.appendChild(styleLink);

    console.log("Styles injected.");
    createMadgradesPopup();
}

function mainContentExecution() {
    injectStyles();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mainContentExecution);
} else {
    mainContentExecution();
}