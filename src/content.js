/* Allow extension to interact with page-level JS */
const plotlyScript = document.createElement('script');
plotlyScript.src = chrome.runtime.getURL('node_modules/plotly.js-dist/plotly.js');
(document.head || document.documentElement).appendChild(plotlyScript);

// const plotScript = document.createElement('script');
// plotScript.src = chrome.runtime.getURL('create_plot.js');
// plotScript.type = 'module';
// (document.head || document.documentElement).appendChild(plotScript);

const configScript = document.createElement('script');
configScript.src = chrome.runtime.getURL('madgrades/config.js');
configScript.type = 'module';
(document.head || document.documentElement).appendChild(configScript);

const handlerScript = document.createElement('script');
handlerScript.src = chrome.runtime.getURL('madgrades/madgrades_handler.js');
handlerScript.type = 'module';
(document.head || document.documentElement).appendChild(handlerScript);

function executeScriptInPageContext(code) {
    const script = document.createElement('script');
    script.textContent = code;
    // Inject the script into the document head/body
    (document.head || document.documentElement).appendChild(script);
    // Remove the script element after execution
    script.remove();
}

let rendererScriptInjected = false;

function dispatchPlotEvent(data) {
    const event = new CustomEvent('RenderMadgradesPlot', {
        detail: {
            plotData: JSON.stringify(data)
        }
    });
    
    // This event can be 'heard' by the scripts running in the main page context.
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
        console.log("See sections button found! Inserting plot button.");

        // Call the function that creates the plot button and popup
        currentCourse(btn);

        // Stop observing once the element is found 
        observer.disconnect();

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
    plotBtn.textContent = "Show MadGrades Plot"
    plotBtn.className = "madgrades-btn"
    seeSectionsBtn.insertAdjacentElement("afterend", plotBtn)

    // Create popup container 
    const popup = document.createElement("div")
    popup.id = "madgrades-popup"

    // Add plot inside of popup 
    const avgGradesPlotDiv = document.createElement("div")
    avgGradesPlotDiv.id = "madgrades-plot"
    popup.appendChild(avgGradesPlotDiv)
    document.body.appendChild(popup)

    plotBtn.addEventListener("click", () => {
        popup.style.display = "block"
        console.log("clicked")
        // Call Madgrades func (course catalog num) -> returns plot
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
        // const graphScript = document.createElement('script')
        // graphScript.src = './create_plot.js'
        // avgGradesPlotDiv.appendChild(graphScript)
    });

    // Button to close popup 
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close"
    closeBtn.id = "close-btn"
    // popup.appendChild(closeBtn)
    popup.insertAdjacentElement("afterend", closeBtn)

    closeBtn.addEventListener("click", () => {
        popup.style.display = "none"
    })

    // // Click outside popup to close
    // window.addEventListener("click", (e) => {
    //     if (e.target === popup) {
    //         popup.style.display = "none"
    //     }
    // })
}

// /* 
// * file_path: where the JS file is located
// * tag: which type of HTML tag to append the script to 
// */
// function injectScript(file_path, tag) {
//     console.log("injection here")
//     var node = document.getElementsByTagName(tag)[0]; // Returns list of all elems with specified tag 
//     if (!node) {
//         console.error(`injectScript: No <${tag}> found in the DOM`);
//         return;
//     }
//     const script = document.createElement('script'); // Creating script elem (to later insert)
//     script.type = 'module';
//     script.src = chrome.runtime.getURL("injected.js");
//     // script.setAttribute('type', 'module'); // Sets to JS
//     // script.setAttribute('src', chrome.runtime.getURL("injected.js")); // Determines where to load JS file from 
//     // console.log("file path: ", file_path)
//     document.head.appendChild(script); // Places into the page 
//     // console.log("script", script)
//     console.log("appened successful")
// }

// if (document.readyState !== 'loading') {
//     // Styling for injected elements
//     const styleLink = document.createElement("link")
//     styleLink.rel = "stylesheet"
//     styleLink.href = chrome.runtime.getURL("injected.css")
//     document.head.appendChild(styleLink)
//     console.log("Styling applied, now calling injection")

//     // Once page is finished loading -> injects + runs 'injected.js' into webpage 
//     // NOTE: injected.js should be the script that would be run as JS func in dev tools console 
//     injectScript(chrome.runtime.getURL('injected.js'), 'body');
// }
