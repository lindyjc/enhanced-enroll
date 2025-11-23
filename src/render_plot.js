function renderPlot(plotData) {
    function tryRender() {
        if (typeof Plotly !== 'undefined' && Plotly.newPlot) {
            console.log("Plotly found. Rendering graph from event data.");

            const letter_grades = ['A', 'AB', 'B', 'BC', 'C', 'D', 'F'];
            const x_lab = 'Cumulative: ' + plotData.avgGPA;
            // const r = 0; const g = 0; const b = 0; const color = `rgb(${r},${g},${b})`;
            const color = "#C5050C"

            var layout = {
                xaxis: {
                    title: { text: x_lab, font: { family: 'Courier New, monospace', size: 15, color: "black" } },
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

            // Plotly.newPlot('madgrades-plot', data, layout);
            const plotDivId = 'madgrades-plot';

            Plotly.newPlot(plotDivId, data, layout)
                .then(() => {
                    Plotly.relayout(plotDivId, { autosize: true });
                    console.log("Plotly forced resize/relayout successfully.");
                });

        } else {
            // wait for plotly
            setTimeout(tryRender, 50);
        }
    }

    tryRender();
}


window.addEventListener('RenderMadgradesPlot', (event) => {
    const payloadString = event.detail.plotData;

    const plotData = JSON.parse(payloadString);

    renderPlot(plotData);

    console.log("Renderer script received data via CustomEvent:", plotData);
}, false); 