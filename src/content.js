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

const observer = new MutationObserver(() => {
    // const buttons = document.querySelectorAll("button");
    const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("See sections"))
    console.log("button?", btn)
    if (btn) {
        // console.log("See sections button found! Inserting plot button.");

        // // Call the function that creates the plot button and popup
        // currentCourse(btn);

        // // Stop observing once the element is found 
        // // observer.disconnect();
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

const currentCourse = (seeSectionsBtn) => {
    if (!seeSectionsBtn) {
        return
    }
    console.log("trying to create button")
    // Create button for displaying MadGrades plot in popup 
    const plotBtn = document.createElement("button")
    plotBtn.textContent = "Show MadGrades"
    plotBtn.className = "madgrades-btn"
    seeSectionsBtn.insertAdjacentElement("afterend", plotBtn)

    // Create popup container 
    const popup = document.createElement("div")
    popup.id = "madgrades-popup"
    
    const modalContent = document.createElement("div");
    modalContent.className = "madgrades-modal-content";

    const avgGradesPlotDiv = document.createElement("div")
    avgGradesPlotDiv.id = "madgrades-plot"
    modalContent.appendChild(avgGradesPlotDiv)

    // Button to close popup 
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close"
    closeBtn.id = "close-btn"
    modalContent.appendChild(closeBtn) // Append close button to wrapper

    popup.appendChild(modalContent); // Append wrapper to popup
    document.body.appendChild(popup); // Append popup to body

    plotBtn.addEventListener("click", () => {
        popup.style.display = "block"
        console.log("clicked")
        chrome.runtime.sendMessage(
            { action: "displayGraph", payload: "COMP SCI 564" },
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
} else {
    injectStyles();
}

function injectStyles() {
    // Styling for injected elements
    const styleLink = document.createElement("link")
    styleLink.rel = "stylesheet"
    styleLink.href = chrome.runtime.getURL("injected.css")
    document.head.appendChild(styleLink)
    console.log("Styling applied!")
}
