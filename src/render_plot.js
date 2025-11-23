// // This script will be injected into the main page context
// // It expects to find `plotData` on the window object (set by the content script)

// // We'll define a function that will be called by the content script
// // once this file is loaded.
// function renderPlotFromExtension(plotData) {

//     // Polling function to wait for Plotly
//     function tryRender() {
//         if (typeof Plotly !== 'undefined' && Plotly.newPlot) {
//             console.log("Plotly found. Rendering graph.");

//             // --- PLOT RENDERING LOGIC (Move your code here) ---
//             const letter_grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'F'];
//             const x_lab = 'Cumulative: ' + plotData.avgGPA;
//             const r = 0; const g = 0; const b = 0; const color = `rgb(${r},${g},${b})`;

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
//                 customdata: plotData.grade_counts.map((count, i) => `${count} students`)
//             };
//             var data = [trace1];

//             Plotly.newPlot('madgrades-plot', data, layout);
//             // ----------------------------------------------------

//         } else {
//             console.log("Plotly not yet defined. Waiting...");
//             // If Plotly isn't ready, try again after a short delay (e.g., 50ms)
//             setTimeout(tryRender, 50);
//         }
//     }

//     // Start the rendering attempt
//     tryRender();
// }

// renderplot.js (Revised to listen for Custom Event)

// Define the rendering function inside the listener to be executed on event
function renderPlot(plotData) {
    
    // Polling function to wait for Plotly
    function tryRender() {
        if (typeof Plotly !== 'undefined' && Plotly.newPlot) {
            console.log("Plotly found. Rendering graph from event data.");

            // --- PLOT RENDERING LOGIC ---
            const letter_grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'F'];
            const x_lab = 'Cumulative: ' + plotData.avgGPA;
            const r = 0; const g = 0; const b = 0; const color = `rgb(${r},${g},${b})`;

            var layout = {
                xaxis: {
                    title: { text: x_lab, font: { family: 'Courier New, monospace', size: 15, color: color } },
                },
                yaxis: { title: { text: "Students (%)" }, range: [0, 100] }
            };

            var trace1 = {
                x: letter_grades,
                y: plotData.grade_per,
                type: 'bar',
                marker: { color: color },
                text: plotData.grade_per.map(String),
                hovertemplate: '%{customdata}<extra></extra>',
                customdata: plotData.grade_counts.map((count, i) => `${count} students`)
            };
            var data = [trace1];

            Plotly.newPlot('madgrades-plot', data, layout);
            // ----------------------------

        } else {
            // If Plotly isn't ready, try again after a short delay
            setTimeout(tryRender, 50);
        }
    }

    // Start the rendering attempt
    tryRender();
}


// Attach an event listener to the window object to receive the data
window.addEventListener('RenderMadgradesPlot', (event) => {
    // 1. Get the JSON string payload from the custom event detail
    const payloadString = event.detail.plotData;
    
    // 2. Parse the string back into a JavaScript object
    const plotData = JSON.parse(payloadString);
    
    // 3. Render the plot
    renderPlot(plotData);
    
    // Optional: Log the received data
    console.log("Renderer script received data via CustomEvent:", plotData);
}, false); // 'false' for bubbling phase listener