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

// function createPlot(data) {
//     // Define your layout, trace1, and data variables here using data.grade_counts, 
//     // data.grade_per, data.avgGPA
//     // This is where you call Plotly.newPlot. Since Plotly is a 
//     // web_accessible_resource, it should be available on the page.

//     const plotData = {
//         grade_counts: data.grade_counts,
//         grade_per: data.grade_per,
//         avgGPA: data.avgGPA,
//     };

//     const plotDataString = JSON.stringify(plotData);

//     // const r = 0;
//     // const g = 0;
//     // const b = 0;
//     // const color = 'rgb(' + r + ',' + g + ',' + b + ')';

//     // grade_per = data.grade_per
//     // grade_counts = data.grade_counts
//     // avgGPA = data.avgGPA

//     // const letter_grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'F'];
//     // const x_lab = 'Cumulative: ' + data.avgGPA;

//     // var layout = {
//     //     xaxis: {
//     //         title: {
//     //             text: x_lab,
//     //             font: {
//     //                 family: 'Courier New, monospace',
//     //                 size: 15,
//     //                 color: color
//     //             }
//     //         },
//     //     },
//     //     yaxis: {
//     //         title: { text: "Students (%)", },
//     //         range: [0, 100]
//     //     }
//     // }

//     // var trace1 = {
//     //     x: letter_grades,
//     //     y: grade_per,
//     //     type: 'bar',
//     //     marker: {
//     //         color: color
//     //     },
//     //     // hoverinfo: 'none',
//     //     text: grade_per.map(String),
//     //     hovertemplate: '%{customdata}<extra></extra>',
//     //     customdata: grade_counts.map((count, i) =>
//     //         `${count} students`
//     //     )
//     // }
//     // var plotData = [trace1];

//     // // Ensure you have an element with ID 'madgrades-plot' on the page
//     // Plotly.newPlot('madgrades-plot', plotData, layout);
//     const scriptCode = `
//         (function() {
//             // Parse the JSON data passed from the content script
//             const plotData = JSON.parse('${plotDataString}');
            
//             // Re-create the plot variables (Layout, Traces, etc.)
//             const letter_grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'F'];
//             const x_lab = 'Cumulative: ' + plotData.avgGPA;
//             const r = 0; const g = 0; const b = 0; const color = \`rgb(\${r},\${g},\${b})\`;

//             var layout = {
//                 xaxis: {
//                     title: { text: x_lab, font: { family: 'Courier New, monospace', size: 15, color: color } },
//                 },
//                 yaxis: { title: { text: "Students (%)" }, range: [0, 100] }
//             };

//             var trace1 = {
//                 x: letter_grades,
//                 y: plotData.grade_per,
//                 type: 'bar',
//                 marker: { color: color },
//                 text: plotData.grade_per.map(String),
//                 hovertemplate: '%{customdata}<extra></extra>',
//             };
//             var data = [trace1];

//             // 3. Call Plotly.newPlot, which is defined in the Page's context!
//             if (typeof Plotly !== 'undefined') {
//                 Plotly.newPlot('madgrades-plot', data, layout);
//             } else {
//                 console.error("Plotly is still undefined in the main page context.");
//             }
//         })();
//     `;

//     // 4. Inject and execute the code
//     executeScriptInPageContext(scriptCode);
// }

// Insert plot into html page 
// content.js (Revised to inject script and call function)

// Flag to ensure we only inject the renderer script once
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

// This function now just prepares the data and calls the function in the page's context
// function createPlot(data) {
//     const plotDataString = JSON.stringify(data);
    
//     // Function to execute code in the page's main context
//     const executeInPage = (code) => {
//         const script = document.createElement('script');
//         script.textContent = code;
//         (document.head || document.documentElement).appendChild(script);
//         script.remove();
//     };

//     if (!rendererScriptInjected) {
//         // 1. Inject the SCRIPT FILE
//         const script = document.createElement('script');
//         script.src = chrome.runtime.getURL('./render_plot.js');
//         (document.head || document.documentElement).appendChild(script);
//         rendererScriptInjected = true;
        
//         script.onload = () => {
//              // 2. Call the function using inline script execution after load
//              // The function exists in the page context, so we call it from there.
//              const callCode = `renderPlotFromExtension(JSON.parse('${plotDataString}'));`;
//              executeInPage(callCode);
//         };
//         script.onerror = (e) => console.error("Failed to load render_plot.js", e);

//     } else {
//         // If already injected, just call the function immediately using inline script
//         const callCode = `renderPlotFromExtension(JSON.parse('${plotDataString}'));`;
//         executeInPage(callCode);
//     }
// }

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
    popup.appendChild(closeBtn)
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
